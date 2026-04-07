#!/usr/bin/env node
// Simple script to deactivate creator_payouts rows in Postgres.
// Usage:
// 1) Single payout:   node deactivate_payouts.js --payout-id <PAYOUT_UUID> --admin-id <ADMIN_UUID> --reason "Reason" --yes
// 2) By user:         node deactivate_payouts.js --user-id <USER_UUID> --admin-id <ADMIN_UUID> --reason "Reason" --yes
// 3) CSV batch:       node deactivate_payouts.js --csv file.csv --admin-id <ADMIN_UUID> --yes
// CSV format (headers): payout_id,admin_id,reason

const fs = require('fs');
const { Client } = require('pg');

function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '');
      const next = argv[i+1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

async function run() {
  const args = parseArgs();
  const pgUrl = process.env.EXTERNAL_PG_URL || process.env.NEON_DATABASE_URL;
  if (!pgUrl) {
    console.error('Set EXTERNAL_PG_URL or NEON_DATABASE_URL in the environment');
    process.exit(1);
  }

  const client = new Client({ connectionString: pgUrl });
  await client.connect();

  const doUpdate = async (payoutId, adminId, reason) => {
    const sql = `UPDATE public.creator_payouts
                 SET is_active = false,
                     deactivation_reason = $1,
                     deactivated_by = $2,
                     deactivated_at = now(),
                     updated_at = now()
                 WHERE id = $3`;
    const res = await client.query(sql, [reason || null, adminId || null, payoutId]);
    return res.rowCount;
  };

  try {
    if (args.csv) {
      const csv = fs.readFileSync(args.csv, 'utf8');
      const lines = csv.trim().split(/\r?\n/);
      const header = lines.shift().split(',').map(h => h.trim());
      const iPayout = header.indexOf('payout_id');
      const iAdmin = header.indexOf('admin_id');
      const iReason = header.indexOf('reason');
      if (iPayout === -1) throw new Error('CSV must include payout_id column');

      console.log(`Found ${lines.length} rows in ${args.csv}`);
      if (!args.yes) {
        console.log('Run with --yes to execute');
        process.exit(0);
      }

      for (const ln of lines) {
        const cols = ln.split(',').map(c => c.trim());
        const payoutId = cols[iPayout];
        const adminId = iAdmin >= 0 ? cols[iAdmin] : args['admin-id'];
        const reason = iReason >= 0 ? cols[iReason] : args.reason;
        const affected = await doUpdate(payoutId, adminId, reason);
        console.log(`Deactivated ${payoutId} -> ${affected} row(s) updated`);
      }

    } else if (args['payout-id'] || args['user-id']) {
      if (!args.yes) {
        console.log('Dry run. Add --yes to execute.');
        const sample = args['payout-id'] ? `payout id: ${args['payout-id']}` : `user id: ${args['user-id']}`;
        console.log('Would deactivate', sample, 'with admin-id', args['admin-id'], 'reason:', args.reason);
        process.exit(0);
      }

      if (args['payout-id']) {
        const affected = await doUpdate(args['payout-id'], args['admin-id'], args.reason);
        console.log(`Deactivated payout ${args['payout-id']} -> ${affected} row(s) updated`);
      } else {
        const sql = `UPDATE public.creator_payouts
                     SET is_active = false,
                         deactivation_reason = $1,
                         deactivated_by = $2,
                         deactivated_at = now(),
                         updated_at = now()
                     WHERE user_id = $3`;
        const res = await client.query(sql, [args.reason || null, args['admin-id'] || null, args['user-id']]);
        console.log(`Deactivated payouts for user ${args['user-id']} -> ${res.rowCount} rows updated`);
      }
    } else {
      console.log('No action. Provide --payout-id or --user-id or --csv');
    }
  } finally {
    await client.end();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
