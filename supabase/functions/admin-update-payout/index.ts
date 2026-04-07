const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin access required");

    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      throw new Error("Invalid JSON body");
    }
    const { payout_id, action, rejection_reason } = body || {};
    if (!payout_id || !action) throw new Error("Missing required fields");

    // Helper to perform UPDATEs via Postgres when available
    const pgUrl = Deno.env.get("NEON_DATABASE_URL") || Deno.env.get("EXTERNAL_PG_URL");
    const runPgUpdate = async (sql: string, params: any[]) => {
      if (!pgUrl) return false;
      const pg = new PGClient(pgUrl);
      try {
        await pg.connect();
        await pg.queryObject(sql, ...params);
        await pg.end();
        return true;
      } catch (err) {
        console.error("PG update failed", err);
        try {
          await pg.end();
        } catch {}
        return false;
      }
    };

    if (action === "approve") {
      // Fetch payout details to create Paystack subaccount
      const { data: payout, error: fetchError } = await supabase
        .from("creator_payouts")
        .select("*")
        .eq("id", payout_id)
        .single();
      if (fetchError || !payout) throw new Error("Payout record not found");

      let subaccountCode = payout.paystack_subaccount_code;

      // Create Paystack subaccount if not already created
      if (!subaccountCode) {
        const subaccountRes = await fetch(
          "https://api.paystack.co/subaccount",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              business_name: payout.business_name,
              bank_code: payout.bank_code,
              account_number: payout.account_number,
              percentage_charge: 5, // 5% platform fee
            }),
          },
        );

        const subaccountData = await subaccountRes.json();
        if (!subaccountRes.ok || !subaccountData.status) {
          console.error("Paystack subaccount creation failed:", subaccountData);
          throw new Error(
            `Failed to create Paystack subaccount: ${subaccountData.message || "Unknown error"}`,
          );
        }

        subaccountCode = subaccountData.data.subaccount_code;
      }

      // Try updating via Postgres first for direct DB writes, fallback to Supabase client
      const sql = `UPDATE public.creator_payouts SET status = $1, rejection_reason = $2, paystack_subaccount_code = $3, updated_at = now() WHERE id = $4`;
      const usedPg = await runPgUpdate(sql, ["approved", null, subaccountCode, payout_id]);
      if (!usedPg) {
        const { error } = await supabase
          .from("creator_payouts")
          .update({
            status: "approved",
            rejection_reason: null,
            paystack_subaccount_code: subaccountCode,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payout_id);
        if (error) throw error;
      }
    } else if (action === "reject") {
      const sql = `UPDATE public.creator_payouts SET status = $1, rejection_reason = $2, updated_at = now() WHERE id = $3`;
      const usedPg = await runPgUpdate(sql, ["rejected", rejection_reason || "Application rejected", payout_id]);
      if (!usedPg) {
        const { error } = await supabase
          .from("creator_payouts")
          .update({
            status: "rejected",
            rejection_reason: rejection_reason || "Application rejected",
            updated_at: new Date().toISOString(),
          })
          .eq("id", payout_id);
        if (error) throw error;
      }
    } else if (action === "deactivate") {
      // Mark payout method as inactive and record admin + reason
      const sql = `UPDATE public.creator_payouts SET is_active = false, deactivation_reason = $1, deactivated_by = $2, deactivated_at = now(), updated_at = now() WHERE id = $3`;
      const usedPg = await runPgUpdate(sql, [rejection_reason || "Deactivated by admin", user.id, payout_id]);
      if (!usedPg) {
        const { error } = await supabase
          .from("creator_payouts")
          .update({
            is_active: false,
            deactivation_reason: rejection_reason || "Deactivated by admin",
            deactivated_by: user.id,
            deactivated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", payout_id);
        if (error) throw error;
      }
    } else if (action === "reactivate") {
      const sql = `UPDATE public.creator_payouts SET is_active = true, deactivation_reason = null, deactivated_by = null, deactivated_at = null, updated_at = now() WHERE id = $1`;
      const usedPg = await runPgUpdate(sql, [payout_id]);
      if (!usedPg) {
        const { error } = await supabase
          .from("creator_payouts")
          .update({
            is_active: true,
            deactivation_reason: null,
            deactivated_by: null,
            deactivated_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payout_id);
        if (error) throw error;
      }
    } else {
      console.error("admin-update-payout: invalid action", { action, body });
      return new Response(
        JSON.stringify({
          error: "Invalid action",
          receivedAction: action,
          receivedType: typeof action,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
