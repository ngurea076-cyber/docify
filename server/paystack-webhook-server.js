/*
Standalone Paystack webhook + ledger query server (Node + Express)

Usage:
  - Set env vars: NEON_DATABASE_URL (postgres connection), PAYSTACK_SECRET_KEY
  - Run: npm install express body-parser pg
  - Start: node server/paystack-webhook-server.js

Endpoints:
  POST /webhook        -> Paystack webhook (expects x-paystack-signature)
  GET  /purchase/:ref  -> Returns JSON ledger row for reference
*/

const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 8787;

// We need raw body for signature verification
app.use(
  bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

const NEON_URL = process.env.NEON_DATABASE_URL || process.env.EXTERNAL_PG_URL;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
if (!NEON_URL)
  console.warn(
    "NEON_DATABASE_URL / EXTERNAL_PG_URL not set — ledger write disabled",
  );
if (!PAYSTACK_SECRET)
  console.warn("PAYSTACK_SECRET_KEY not set — signature verification disabled");

const pool = NEON_URL
  ? new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } })
  : null;

app.post("/webhook", async (req, res) => {
  try {
    const signature = req.header("x-paystack-signature") || "";
    const body = req.rawBody || JSON.stringify(req.body);

    if (PAYSTACK_SECRET) {
      const computed = crypto
        .createHmac("sha512", PAYSTACK_SECRET)
        .update(body)
        .digest("hex");
      if (!signature || computed !== signature) {
        console.warn("Invalid signature", { computed, signature });
        return res.status(400).json({ error: "Invalid signature" });
      }
    }

    const payload = req.body;
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

    // Insert into Neon ledger (idempotent)
    if (pool && reference) {
      try {
        const client = await pool.connect();
        try {
          await client.query(
            `
            INSERT INTO transactions_ledger (paystack_reference, document_id, buyer_email, amount, currency, status, platform_fee, creator_earning, raw_payload, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
            ON CONFLICT (paystack_reference) DO NOTHING
          `,
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

    // Respond to Paystack
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Simple lookup endpoint for frontend polling
app.get("/purchase/:ref", async (req, res) => {
  const ref = req.params.ref;
  if (!pool) return res.status(500).json({ error: "Ledger not configured" });
  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        "SELECT id, paystack_reference, document_id, buyer_email, amount, currency, status, platform_fee, creator_earning, created_at FROM transactions_ledger WHERE paystack_reference = $1 LIMIT 1",
        [ref],
      );
      if (rows.length === 0)
        return res.status(404).json({ error: "Not found" });
      return res.json(rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Ledger query error", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.listen(port, () => {
  console.log(`Paystack webhook server listening on ${port}`);
});
