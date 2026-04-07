const { Pool } = require("pg");
const crypto = require("crypto");

// Vercel Serverless Function: POST /api/paystack-webhook
// Requires env vars: NEON_DATABASE_URL, PAYSTACK_SECRET_KEY

const pool = process.env.NEON_DATABASE_URL
  ? new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null;
const fetch = require("node-fetch");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  try {
    // collect raw body
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    await new Promise((resolve) => req.on("end", resolve));
    const raw = Buffer.concat(chunks);

    const signature = req.headers["x-paystack-signature"] || "";
    if (process.env.PAYSTACK_SECRET_KEY) {
      const computed = crypto
        .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
        .update(raw)
        .digest("hex");
      if (!signature || computed !== signature) {
        console.warn("Invalid Paystack signature", { computed, signature });
        return res.status(400).json({ error: "Invalid signature" });
      }
    }

    const payload = JSON.parse(raw.toString("utf8"));
    const event = payload.event || payload.type || "";
    const data = payload.data || {};

    if (
      !(
        data.status === "success" ||
        event === "transaction.success" ||
        event === "charge.success"
      )
    ) {
      return res.json({ received: true });
    }

    const reference = data.reference || data.transaction?.reference;
    const amount = Number(data.amount || 0);
    const platformFee = Math.round(amount * 0.05);
    const creatorEarning = amount - platformFee;

    if (pool && reference) {
      try {
        const client = await pool.connect();
        try {
          await client.query(
            `INSERT INTO transactions_ledger (paystack_reference, document_id, buyer_email, amount, currency, status, platform_fee, creator_earning, raw_payload, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
             ON CONFLICT (paystack_reference) DO NOTHING`,
            [
              reference,
              data?.metadata?.document_id || null,
              data?.customer?.email || data?.metadata?.buyer_email || null,
              amount,
              data?.currency || "KES",
              "completed",
              platformFee,
              creatorEarning,
              JSON.stringify(payload),
            ],
          );
        } finally {
          client.release();
        }
      } catch (err) {
        console.error("Failed to write to Neon ledger", err);
      }
    }

    // Update Supabase purchases and creator_balances if service role key is available
    try {
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE && reference) {
        // Update purchases row to completed if exists, otherwise insert
        const purchasesUrl = `${SUPABASE_URL}/rest/v1/purchases`;
        const headers = {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        };

        // Try updating existing purchase
        const updateRes = await fetch(
          `${purchasesUrl}?paystack_reference=eq.${encodeURIComponent(reference)}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify({
              status: "completed",
              platform_fee: platformFee,
              creator_earning: creatorEarning,
            }),
          },
        );

        if (updateRes.status === 204) {
          console.log("Updated existing purchase in Supabase");
        } else {
          // Attempt insert (idempotent because paystack_reference is unique)
          const insertRes = await fetch(purchasesUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              document_id: data?.metadata?.document_id || null,
              buyer_email:
                data?.customer?.email || data?.metadata?.buyer_email || null,
              amount: amount,
              currency: data?.currency || "KES",
              paystack_reference: reference,
              platform_fee: platformFee,
              creator_earning: creatorEarning,
              status: "completed",
            }),
          });
          if (!insertRes.ok && insertRes.status !== 409) {
            console.warn(
              "Failed to insert purchase into Supabase",
              await insertRes.text(),
            );
          }
        }

        // Update creator_balances: increment totals for the document owner
        // Need to find the document owner id
        const docsUrl = `${SUPABASE_URL}/rest/v1/documents?select=user_id&id=eq.${encodeURIComponent(data?.metadata?.document_id || "")}`;
        const docRes = await fetch(docsUrl, { headers });
        if (docRes.ok) {
          const docs = await docRes.json();
          const userId = docs?.[0]?.user_id;
          if (userId) {
            // Call Supabase RPC to atomically increment creator balances
            const rpcUrl = `${SUPABASE_URL}/rpc/increment_creator_balance`;
            const rpcRes = await fetch(rpcUrl, {
              method: "POST",
              headers,
              body: JSON.stringify({
                p_user_id: userId,
                p_amount: amount,
                p_creator_earning: creatorEarning,
              }),
            });
            if (rpcRes.ok) {
              console.log("Called increment_creator_balance RPC successfully");
            } else {
              console.warn(
                "increment_creator_balance RPC failed",
                rpcRes.status,
                await rpcRes.text(),
              );
              // Fallback: try simple insert/update (best-effort)
              const balancesUrl = `${SUPABASE_URL}/rest/v1/creator_balances`;
              const insertBalRes = await fetch(balancesUrl, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  user_id: userId,
                  total_earnings: amount,
                  available_balance: creatorEarning,
                  pending_earnings: 0,
                }),
              });
              if (!insertBalRes.ok) {
                console.warn(
                  "Failed fallback insert creator_balances",
                  await insertBalRes.text(),
                );
              }
            }
          }
        } else {
          console.warn("Failed to find document owner in Supabase");
        }
      }
    } catch (supErr) {
      console.error("Supabase sync error", supErr);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("Webhook handling error", err);
    return res.status(500).json({ error: err.message || String(err) });
  }
};
