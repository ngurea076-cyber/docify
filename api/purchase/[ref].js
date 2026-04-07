const { Pool } = require("pg");

const pool = process.env.NEON_DATABASE_URL
  ? new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null;

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).end();
  const ref = req.query.ref || req.params.ref;
  if (!ref) return res.status(400).json({ error: "Missing reference" });

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
};
