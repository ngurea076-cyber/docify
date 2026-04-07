Quick: deactivate payout(s) via Postgres

Requirements
- Node.js (for the script) and `pg` installed: `npm install pg`
- Or run the SQL directly using `psql` or your DB UI.

One-off SQL template (replace UUIDs):

```sql
UPDATE public.creator_payouts
SET is_active = false,
    deactivation_reason = 'Duplicate national ID',
    deactivated_by = 'ADMIN_UUID_OR_NULL',
    deactivated_at = now(),
    updated_at = now()
WHERE id = 'PAYOUT_UUID';
```

Run the Node script (example):

```
EXTERNAL_PG_URL="postgres://..." node scripts/deactivate_payouts.js --payout-id f47ac10b-58cc-4372-a567-0e02b2c3d479 --admin-id d3b07384-d9f1-4a7f-9e1b-123456789abc --reason "Duplicate ID" --yes
```

Batch from CSV (headers: payout_id,admin_id,reason):

```
EXTERNAL_PG_URL="postgres://..." node scripts/deactivate_payouts.js --csv /path/to/list.csv --yes
```

Safety
- The script requires `--yes` to perform updates. Without it the script prints a dry-run summary.
