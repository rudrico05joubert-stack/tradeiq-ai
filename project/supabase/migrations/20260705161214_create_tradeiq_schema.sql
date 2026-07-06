/*
# TradeIQ AI — auth-scoped schema (chart analyses + trading journal)

## Overview
TradeIQ AI is an AI trading-assistant SaaS. Users sign in with email/password,
upload an MT5 chart screenshot, and receive AI-powered technical analysis
(trend, entry/SL/TP, confidence, R:R, reasoning). They can also keep a
trading journal and view win-rate / accuracy stats.

This is a MULTI-USER app with a sign-in screen, so every owner-scoped table
uses `user_id uuid NOT NULL DEFAULT auth.uid()` and `TO authenticated`
policies with ownership predicates. The anon-key client cannot read these
tables until the user signs in.

## New Tables
1. `profiles`
   - Per-user row created on signup, mirrors the auth user.
   - Columns: id (= auth.uid()), plan ('free'|'pro'|'elite'),
     display_name, daily_usage_count, daily_usage_date (rolling day key),
     created_at.
   - `daily_usage_count` / `daily_usage_date` enforce the "3 analyses per day"
     limit on the free plan (reset when the date key changes).

2. `chart_analyses`
   - One row per uploaded chart screenshot + AI analysis result.
   - Columns: id, user_id (owner, default auth.uid()), symbol (optional
     label), timeframe, image_url (Supabase Storage public URL),
     market_trend, direction ('buy'|'sell'|'neutral'), confidence (0-100),
     entry, stop_loss, take_profit, risk_reward (numeric), reasons (text[]),
     indicators (jsonb of named TA readings), notes, status, created_at.
   - The full AI output is persisted so the user can revisit past analyses.

3. `journal_entries`
   - User-authored trade journal rows, optionally linked to a chart analysis.
   - Columns: id, user_id, analysis_id (nullable FK -> chart_analyses),
     symbol, direction, entry, exit, stop_loss, take_profit, outcome
     ('win'|'loss'|'breakeven'|'pending'), pnl, notes, executed_at, created_at.

## Security
- RLS enabled on all three tables.
- 4 policies per table (select/insert/update/delete), all `TO authenticated`
  with `auth.uid() = user_id` ownership checks.
- `profiles.id` is the user id itself; its ownership predicate is `auth.uid() = id`.
- Owner columns on `chart_analyses` and `journal_entries` default to
  `auth.uid()` so inserts that omit `user_id` succeed.
- No `FOR ALL` policies — separate verbs.
- Storage: charts bucket created with public read + owner-scoped write via
  the `storage` service role. Frontend uploads via signed/metadata policy.

## Notes
- Idempotent: `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` before each
  `CREATE POLICY`.
- Indexes on `user_id` and `created_at` for the common "load my recent rows"
  query path.
- A `handle_new_user` trigger auto-creates a `profiles` row on auth signup so
  the user has a profile before the dashboard first loads.
- Storage bucket `charts` is created and made public-read; writes are gated by
  an owner-scoped storage policy.
*/

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','elite')),
  display_name text DEFAULT '',
  daily_usage_count int NOT NULL DEFAULT 0,
  daily_usage_date date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ---------- chart_analyses ----------
CREATE TABLE IF NOT EXISTS chart_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text DEFAULT '',
  timeframe text DEFAULT 'auto',
  image_url text DEFAULT '',
  market_trend text DEFAULT '',
  direction text NOT NULL DEFAULT 'neutral' CHECK (direction IN ('buy','sell','neutral')),
  confidence int NOT NULL DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
  entry numeric(18,6),
  stop_loss numeric(18,6),
  take_profit numeric(18,6),
  risk_reward numeric(6,2),
  reasons text[] DEFAULT '{}',
  indicators jsonb DEFAULT '{}'::jsonb,
  notes text DEFAULT '',
  status text DEFAULT 'completed' CHECK (status IN ('processing','completed','failed')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE chart_analyses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chart_analyses_user_id ON chart_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_chart_analyses_created_at ON chart_analyses(created_at DESC);

DROP POLICY IF EXISTS "select_own_analyses" ON chart_analyses;
CREATE POLICY "select_own_analyses" ON chart_analyses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_analyses" ON chart_analyses;
CREATE POLICY "insert_own_analyses" ON chart_analyses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_analyses" ON chart_analyses;
CREATE POLICY "update_own_analyses" ON chart_analyses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_analyses" ON chart_analyses;
CREATE POLICY "delete_own_analyses" ON chart_analyses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------- journal_entries ----------
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES chart_analyses(id) ON DELETE SET NULL,
  symbol text DEFAULT '',
  direction text NOT NULL DEFAULT 'buy' CHECK (direction IN ('buy','sell','neutral')),
  entry numeric(18,6),
  exit_price numeric(18,6),
  stop_loss numeric(18,6),
  take_profit numeric(18,6),
  outcome text NOT NULL DEFAULT 'pending' CHECK (outcome IN ('win','loss','breakeven','pending')),
  pnl numeric(18,2) DEFAULT 0,
  notes text DEFAULT '',
  executed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_created_at ON journal_entries(created_at DESC);

DROP POLICY IF EXISTS "select_own_journal" ON journal_entries;
CREATE POLICY "select_own_journal" ON journal_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_journal" ON journal_entries;
CREATE POLICY "insert_own_journal" ON journal_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_journal" ON journal_entries;
CREATE POLICY "update_own_journal" ON journal_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_journal" ON journal_entries;
CREATE POLICY "delete_own_journal" ON journal_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------- auto-create profile on signup ----------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------- charts storage bucket ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('charts', 'charts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: owner-scoped writes, public reads (charts are shared via URL)
DROP POLICY IF EXISTS "charts_public_read" ON storage.objects;
CREATE POLICY "charts_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'charts');

DROP POLICY IF EXISTS "charts_owner_insert" ON storage.objects;
CREATE POLICY "charts_owner_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'charts' AND auth.uid() = owner);

DROP POLICY IF EXISTS "charts_owner_delete" ON storage.objects;
CREATE POLICY "charts_owner_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'charts' AND auth.uid() = owner);
