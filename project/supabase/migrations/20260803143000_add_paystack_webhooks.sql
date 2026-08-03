CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_code text UNIQUE,
  customer_code text,
  plan text NOT NULL CHECK (plan IN ('pro','elite')),
  status text NOT NULL,
  next_payment_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_plan
  ON public.subscriptions(customer_code, plan);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscriptions;
CREATE POLICY "select_own_subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.paystack_webhook_events (
  event_hash text PRIMARY KEY,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.paystack_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.paystack_webhook_events FROM anon, authenticated;
