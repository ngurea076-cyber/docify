const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.201.0/hash/mod.ts";
import { Client as PGClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Read raw body for signature verification
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-paystack-signature") || "";

    // Compute HMAC SHA-512? Paystack uses HMAC SHA-512 with secret key
    const encoder = new TextEncoder();
    const keyData = encoder.encode(paystackSecretKey);
    const bodyData = encoder.encode(rawBody);
    const hmac = createHmac("sha512", keyData);
    hmac.update(bodyData);
    const computed = hmac.hex();

    if (!signatureHeader || computed !== signatureHeader) {
      console.warn("Invalid Paystack signature", { computed, signatureHeader });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event || payload.type || "";
    const data = payload.data || {};

    // We care about successful transactions
    const acceptedEvents = [
      "transaction.success",
      "charge.success",
      "payment.confirmation",
      "payment.success",
    ];
    if (!acceptedEvents.includes(event) && !(data?.status === "success")) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = data.reference || data?.transaction?.reference;
    const amount = Number(data.amount || data?.amount || 0); // amount in kobo

    if (!reference) {
      console.warn("Webhook missing reference", payload);
      return new Response(JSON.stringify({ error: "Missing reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the pending purchase
    const { data: purchase, error: findErr } = await supabase
      .from("purchases")
      .select("*, documents(document_type, user_id)")
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (findErr) {
      console.error("Error finding purchase for reference", reference, findErr);
      return new Response(JSON.stringify({ error: "DB error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!purchase) {
      // No local purchase; insert one as completed so it's tracked
      const platformFee = Math.round(amount * 0.05);
      const creatorEarning = amount - platformFee;
      const insertRes = await supabase.from("purchases").insert({
        document_id: data?.metadata?.document_id,
        buyer_email:
          data?.customer?.email || data?.metadata?.buyer_email || null,
        amount,
        currency: data.currency || "KES",
        paystack_reference: reference,
        platform_fee: platformFee,
        creator_earning: creatorEarning,
        status: "completed",
      });
      // If document and creator exist, update balances below by querying document
    } else if (purchase.status === "completed") {
      // already processed
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine document owner
    const documentId = purchase?.document_id || data?.metadata?.document_id;
    if (!documentId) {
      console.warn("No document id associated with purchase", reference);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, user_id")
      .eq("id", documentId)
      .maybeSingle();
    if (docErr || !doc) {
      console.error("Unable to find document for webhook", docErr);
      return new Response(JSON.stringify({ error: "Doc not found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Write to external Postgres ledger (Neon) if configured
    try {
      const externalPg = Deno.env.get("EXTERNAL_PG_URL");
      if (externalPg) {
        try {
          const pg = new PGClient(externalPg);
          await pg.connect();
          await pg.queryObject(
            `INSERT INTO transactions_ledger (paystack_reference, document_id, buyer_email, amount, currency, status, platform_fee, creator_earning, raw_payload, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
             ON CONFLICT (paystack_reference) DO NOTHING`,
            reference,
            documentId,
            data?.customer?.email || data?.metadata?.buyer_email || null,
            amount,
            data.currency || "KES",
            "completed",
            platformFee,
            creatorEarning,
            rawBody,
          );
          await pg.end();
        } catch (pgErr) {
          console.error("Failed writing to external Postgres ledger:", pgErr);
        }
      }
    } catch (err) {
      console.error("External Postgres ledger block error", err);
    }

    // Update purchase to completed
    const platformFee = Math.round(amount * 0.05);
    const creatorEarning = amount - platformFee;
    const { error: updateErr } = await supabase
      .from("purchases")
      .update({
        status: "completed",
        platform_fee: platformFee,
        creator_earning: creatorEarning,
      })
      .eq("paystack_reference", reference);

    if (updateErr) console.error("Failed to update purchase", updateErr);

    // Update creator balances atomically
    const { data: balance, error: balErr } = await supabase
      .from("creator_balances")
      .select("*")
      .eq("user_id", doc.user_id)
      .maybeSingle();
    if (balErr) console.error("Failed to fetch creator balance", balErr);

    if (balance) {
      const { error: balUpdateErr } = await supabase
        .from("creator_balances")
        .update({
          total_earnings: (balance.total_earnings || 0) + amount,
          available_balance: (balance.available_balance || 0) + creatorEarning,
          pending_earnings: Math.max(
            0,
            (balance.pending_earnings || 0) - amount,
          ),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", doc.user_id);

      if (balUpdateErr)
        console.error("Failed to update creator balance", balUpdateErr);
    } else {
      // Create balance row
      const { error: balInsertErr } = await supabase
        .from("creator_balances")
        .insert({
          user_id: doc.user_id,
          total_earnings: amount,
          available_balance: creatorEarning,
          pending_earnings: 0,
        });
      if (balInsertErr)
        console.error("Failed to create creator balance", balInsertErr);
    }

    // Reply to Paystack
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Paystack webhook error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
