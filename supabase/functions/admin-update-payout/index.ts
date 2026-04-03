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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin access required");

    const { payout_id, action, rejection_reason } = await req.json();
    if (!payout_id || !action) throw new Error("Missing required fields");

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
        const subaccountRes = await fetch("https://api.paystack.co/subaccount", {
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
        });

        const subaccountData = await subaccountRes.json();
        if (!subaccountRes.ok || !subaccountData.status) {
          console.error("Paystack subaccount creation failed:", subaccountData);
          throw new Error(`Failed to create Paystack subaccount: ${subaccountData.message || "Unknown error"}`);
        }

        subaccountCode = subaccountData.data.subaccount_code;
      }

      const { error } = await supabase.from("creator_payouts").update({
        status: "approved",
        rejection_reason: null,
        paystack_subaccount_code: subaccountCode,
        updated_at: new Date().toISOString(),
      }).eq("id", payout_id);
      if (error) throw error;
    } else if (action === "reject") {
      const { error } = await supabase.from("creator_payouts").update({
        status: "rejected",
        rejection_reason: rejection_reason || "Application rejected",
        updated_at: new Date().toISOString(),
      }).eq("id", payout_id);
      if (error) throw error;
    } else {
      throw new Error("Invalid action");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
