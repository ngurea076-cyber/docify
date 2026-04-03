const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { document_id, amount, email, channel } = await req.json();

    if (!document_id || !amount || !email) {
      throw new Error("Missing required fields: document_id, amount, email");
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum < 50 || amountNum > 1000000) {
      throw new Error("Amount must be between KES 50 and KES 1,000,000");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email address");
    }

    // Fetch document to get creator's user_id
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, title, user_id")
      .eq("id", document_id)
      .single();
    if (docError || !doc) throw new Error("Document not found");

    // Fetch creator's payout details for subaccount
    const { data: payout, error: payoutError } = await supabase
      .from("creator_payouts")
      .select("paystack_subaccount_code, status")
      .eq("user_id", doc.user_id)
      .eq("status", "approved")
      .maybeSingle();

    if (payoutError) throw payoutError;

    if (!payout?.paystack_subaccount_code) {
      throw new Error("Creator has not set up online payments yet");
    }

    // Amount in kobo (Paystack uses smallest currency unit)
    const amountInKobo = Math.round(amountNum * 100);

    // Initialize Paystack transaction with subaccount
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        currency: "KES",
        subaccount: payout.paystack_subaccount_code,
        bearer: "subaccount",
        metadata: {
          document_id: doc.id,
          document_title: doc.title,
          type: "donation",
        },
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackRes.ok || !paystackData.status) {
      console.error("Paystack initialization failed:", paystackData);
      throw new Error(`Payment initialization failed: ${paystackData.message || "Unknown error"}`);
    }

    return new Response(JSON.stringify({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
