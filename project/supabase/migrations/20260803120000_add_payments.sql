CREATE TABLE IF NOT EXISTS public.payments (
  reference text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('pro','elite')),
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'ZAR',
  status text NOT NULL,
  paid_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
DROP POLICY IF EXISTS "select_own_payments" ON public.payments;
CREATE POLICY "select_own_payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon, authenticated;
