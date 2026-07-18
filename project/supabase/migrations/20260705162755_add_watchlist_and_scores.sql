/*
# NEXORA AI — trading OS schema extensions

## Overview
Transforms the product into a "trading operating system" with a watchlist.
Adds two score fields to chart_analyses (trend strength, momentum score) and
a new owner-scoped `watchlist_items` table for saved symbols with notes +
target direction + alerts.

## Changes
### chart_analyses (additive)
New nullable columns (safe on legacy rows):
1. `trend_strength` int (0..100) — how strongly the trend is established.
2. `momentum_score` int (0..100) — RSI-derived momentum reading (normalized).

### watchlist_items (new table)
Columns:
- id uuid PK
- user_id uuid NOT NULL DEFAULT auth.uid() (owner, FK auth.users ON DELETE CASCADE)
- symbol text NOT NULL
- direction 'buy'|'sell'|'neutral' DEFAULT 'neutral'
- notes text DEFAULT ''
- target_price numeric(18,6)
- alert_above numeric(18,6)
- alert_below numeric(18,6)
- created_at timestamptz DEFAULT now()

Unique per (user_id, symbol) so a user can't add the same symbol twice.

## Security
- RLS enabled on watchlist_items; 4 owner-scoped policies (TO authenticated,
  auth.uid() = user_id), one per CRUD verb. No FOR ALL.
- chart_analyses already has owner-scoped RLS; new columns inherit the same
  row-level access (policies are row-level, not column-level).
- Idempotent via DO blocks + IF NOT EXISTS guards.

## Notes
- No destructive ops (no DROP, no column type changes, no renames).
- Indexes on user_id + created_at for both tables' common query paths.
*/

-- ---------- chart_analyses additions ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'chart_analyses' AND column_name = 'trend_strength') THEN
    ALTER TABLE chart_analyses ADD COLUMN trend_strength int;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'chart_analyses' AND column_name = 'momentum_score') THEN
    ALTER TABLE chart_analyses ADD COLUMN momentum_score int;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chart_analyses_trend_strength_check') THEN
    ALTER TABLE chart_analyses ADD CONSTRAINT chart_analyses_trend_strength_check
      CHECK (trend_strength IS NULL OR (trend_strength >= 0 AND trend_strength <= 100));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chart_analyses_momentum_score_check') THEN
    ALTER TABLE chart_analyses ADD CONSTRAINT chart_analyses_momentum_score_check
      CHECK (momentum_score IS NULL OR (momentum_score >= 0 AND momentum_score <= 100));
  END IF;
END $$;

-- ---------- watchlist_items ----------
CREATE TABLE IF NOT EXISTS watchlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  direction text NOT NULL DEFAULT 'neutral' CHECK (direction IN ('buy','sell','neutral')),
  notes text DEFAULT '',
  target_price numeric(18,6),
  alert_above numeric(18,6),
  alert_below numeric(18,6),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, symbol)
);
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_created_at ON watchlist_items(created_at DESC);

DROP POLICY IF EXISTS "select_own_watchlist" ON watchlist_items;
CREATE POLICY "select_own_watchlist" ON watchlist_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_watchlist" ON watchlist_items;
CREATE POLICY "insert_own_watchlist" ON watchlist_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_watchlist" ON watchlist_items;
CREATE POLICY "update_own_watchlist" ON watchlist_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_watchlist" ON watchlist_items;
CREATE POLICY "delete_own_watchlist" ON watchlist_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
