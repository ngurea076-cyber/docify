-- Rebuild creator_balances from completed purchases
-- Aggregates purchases by document owner and upserts into creator_balances

BEGIN;

WITH sums AS (
  SELECT d.user_id,
         SUM(p.amount) AS total_earnings,
         SUM(p.creator_earning) AS available_balance
  FROM purchases p
  JOIN documents d ON d.id = p.document_id
  WHERE p.status = 'completed'
  GROUP BY d.user_id
)
INSERT INTO public.creator_balances (user_id, total_earnings, available_balance, pending_earnings, updated_at)
SELECT user_id,
       COALESCE(total_earnings, 0),
       COALESCE(available_balance, 0),
       0,
       now()
FROM sums
ON CONFLICT (user_id) DO UPDATE
  SET total_earnings = EXCLUDED.total_earnings,
      available_balance = EXCLUDED.available_balance,
      -- preserve existing pending_earnings if present
      pending_earnings = COALESCE(creator_balances.pending_earnings, 0),
      updated_at = now();

COMMIT;

-- NOTE: This is a one-time migration. It will upsert balances for users
-- who already have completed purchases. It does not delete balances for
-- users without purchases.
