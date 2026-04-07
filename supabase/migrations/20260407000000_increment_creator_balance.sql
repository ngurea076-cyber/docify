-- Add RPC function to atomically increment creator balances
CREATE OR REPLACE FUNCTION public.increment_creator_balance(
  p_user_id uuid,
  p_amount bigint,
  p_creator_earning bigint
) RETURNS void
LANGUAGE sql
AS $$
INSERT INTO public.creator_balances (user_id, total_earnings, available_balance, pending_earnings, updated_at)
VALUES (p_user_id, p_amount, p_creator_earning, 0, now())
ON CONFLICT (user_id) DO UPDATE
SET
  total_earnings = creator_balances.total_earnings + p_amount,
  available_balance = creator_balances.available_balance + p_creator_earning,
  pending_earnings = GREATEST(creator_balances.pending_earnings - p_amount, 0),
  updated_at = now();
$$;

GRANT EXECUTE ON FUNCTION public.increment_creator_balance(uuid, bigint, bigint) TO authenticated;
