const { Pool } = require("pg");
const fetch = require("node-fetch");

const pool = process.env.NEON_DATABASE_URL
  ? new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null;

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).end();

  const supabaseUrl = process.env.SUPABASE_URL;
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ error: "Missing Authorization" });
  if (!supabaseUrl)
    return res.status(500).json({ error: "SUPABASE_URL not configured" });
  if (!pool)
    return res.status(500).json({ error: "NEON_DATABASE_URL not configured" });

  try {
    // Validate token and get user id
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader },
    });
    if (!userRes.ok) return res.status(401).json({ error: "Invalid token" });
    const userJson = await userRes.json();
    const userId = userJson?.id;

    // Get user's document ids via Supabase REST (auth token scoped)
    const docsRes = await fetch(
      `${supabaseUrl}/rest/v1/documents?select=id&user_id=eq.${userId}`,
      { headers: { Authorization: authHeader } },
    );
    if (!docsRes.ok)
      return res.status(500).json({ error: "Failed to fetch documents" });
    const docs = await docsRes.json();
    const docIds = docs.map((d) => d.id).filter(Boolean);

    if (docIds.length === 0) return res.json([]);

    const client = await pool.connect();
    try {
      const placeholders = docIds.map((_, i) => `$${i + 1}`).join(",");
      const q = `SELECT id, paystack_reference, document_id, buyer_email, amount, currency, status, platform_fee, creator_earning, created_at FROM transactions_ledger WHERE document_id IN (${placeholders}) ORDER BY created_at DESC`;
      const { rows } = await client.query(q, docIds);
      return res.json(rows);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Ledger purchases error", err);
    res.status(500).json({ error: err.message || String(err) });
  }
};
