const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin access required");

    const { withdrawal_id, action, admin_note } = await req.json();
    if (!withdrawal_id || !action) throw new Error("Missing required fields");

    if (action === "reject") {
      await supabase.from("withdrawals").update({
        status: "failed",
        admin_note: admin_note || "Rejected by admin",
        updated_at: new Date().toISOString(),
      }).eq("id", withdrawal_id);

      // Refund balance
      const { data: withdrawal } = await supabase.from("withdrawals").select("*").eq("id", withdrawal_id).single();
      if (withdrawal) {
        const { data: balance } = await supabase.from("creator_balances").select("*").eq("user_id", withdrawal.user_id).single();
        if (balance) {
          await supabase.from("creator_balances").update({
            available_balance: balance.available_balance + withdrawal.amount,
            updated_at: new Date().toISOString(),
          }).eq("user_id", withdrawal.user_id);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      // Get withdrawal and payout details
      const { data: withdrawal } = await supabase.from("withdrawals").select("*").eq("id", withdrawal_id).single();
      if (!withdrawal) throw new Error("Withdrawal not found");

      const { data: payout } = await supabase.from("creator_payouts").select("*").eq("user_id", withdrawal.user_id).single();
      if (!payout) throw new Error("Payout details not found");

      // Update status to processing
      await supabase.from("withdrawals").update({
        status: "processing",
        updated_at: new Date().toISOString(),
      }).eq("id", withdrawal_id);

      // Create Paystack transfer recipient
      const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "mobile_money",
          name: payout.account_holder_name,
          account_number: payout.account_number,
          bank_code: payout.bank_code,
          currency: "KES",
        }),
      });

      const recipientData = await recipientRes.json();
      if (!recipientRes.ok) {
        await supabase.from("withdrawals").update({
          status: "failed",
          admin_note: `Transfer recipient creation failed: ${JSON.stringify(recipientData)}`,
          updated_at: new Date().toISOString(),
        }).eq("id", withdrawal_id);
        throw new Error(`Recipient creation failed: ${JSON.stringify(recipientData)}`);
      }

      // Initiate transfer
      const transferRes = await fetch("https://api.paystack.co/transfer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "balance",
          amount: withdrawal.amount,
          recipient: recipientData.data.recipient_code,
          reason: `Withdrawal #${withdrawal_id}`,
        }),
      });

      const transferData = await transferRes.json();
      if (!transferRes.ok) {
        await supabase.from("withdrawals").update({
          status: "failed",
          admin_note: `Transfer failed: ${JSON.stringify(transferData)}`,
          updated_at: new Date().toISOString(),
        }).eq("id", withdrawal_id);
        throw new Error(`Transfer failed: ${JSON.stringify(transferData)}`);
      }

      // Update withdrawal as completed
      await supabase.from("withdrawals").update({
        status: "completed",
        paystack_transfer_code: transferData.data.transfer_code,
        admin_note: admin_note || "Approved and transferred",
        updated_at: new Date().toISOString(),
      }).eq("id", withdrawal_id);

      // Update balance
      const { data: balance } = await supabase.from("creator_balances").select("*").eq("user_id", withdrawal.user_id).single();
      if (balance) {
        await supabase.from("creator_balances").update({
          total_withdrawn: balance.total_withdrawn + withdrawal.amount,
          updated_at: new Date().toISOString(),
        }).eq("user_id", withdrawal.user_id);
      }

      return new Response(JSON.stringify({ success: true, transfer: transferData.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
