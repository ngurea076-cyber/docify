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

    if (docIds.length === 0) {
      return res.json({
        total_earnings: 0,
        available_balance: 0,
        pending_earnings: 0,
      });
    }

    const client = await pool.connect();
    try {
      const placeholders = docIds.map((_, i) => `$${i + 1}`).join(",");
      const q = `SELECT COALESCE(SUM(creator_earning),0) AS total_earnings FROM transactions_ledger WHERE document_id IN (${placeholders}) AND status = 'completed'`;
      const { rows } = await client.query(q, docIds);
      const totalEarnings = Number(rows[0].total_earnings || 0);

      // For now, available_balance == total_earnings (withdrawals not tracked here)
      return res.json({
        total_earnings: totalEarnings,
        available_balance: totalEarnings,
        pending_earnings: 0,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Ledger balance error", err);
    res.status(500).json({ error: err.message || String(err) });
  }
};
