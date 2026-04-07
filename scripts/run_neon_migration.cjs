const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const data = fs.readFileSync(envPath, "utf8");
  const lines = data.split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let [, key, val] = m;
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[key] = val;
  }
  return env;
}

(async () => {
  try {
    const repoRoot = path.resolve(__dirname, "..");
    const env = loadEnv(path.join(repoRoot, ".env"));
    const conn = env.NEON_DATABASE_URL || process.env.NEON_DATABASE_URL;
    if (!conn) {
      console.error("NEON_DATABASE_URL not found in .env or environment");
      process.exit(2);
    }

    const sqlPath = path.join(
      repoRoot,
      "neon_migrations",
      "001_create_transactions_ledger.sql",
    );
    if (!fs.existsSync(sqlPath)) {
      console.error("Migration file not found:", sqlPath);
      process.exit(3);
    }

    const sql = fs.readFileSync(sqlPath, "utf8");
    const client = new Client({ connectionString: conn });
    await client.connect();
    console.log("Connected to Neon, running migration...");
    await client.query(sql);
    console.log("Migration applied successfully.");
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err && err.message ? err.message : err);
    process.exit(1);
  }
})();
