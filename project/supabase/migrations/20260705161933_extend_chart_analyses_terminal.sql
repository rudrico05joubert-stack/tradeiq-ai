/*
# TradeIQ AI — extend chart_analyses with grading + overlay data

## Overview
Redesigns the analysis experience as a "premium AI terminal". The new flow
needs (a) a letter setup grade A+/A/B/C, (b) a numeric risk score, and (c)
structured overlay data so the dashboard can draw S/R lines, liquidity zones,
EMA bands, and entry/SL/TP markers on top of the uploaded chart image.

## Changes to `chart_analyses` (additive only — no destructive ops)
New columns, all nullable / defaulted so existing rows stay valid:
1. `setup_grade` text — one of 'A+','A','B','C'. NULL on legacy rows.
2. `risk_score` int — 0..100 (higher = riskier setup). NULL on legacy rows.
3. `overlays` jsonb — structured drawing data for the chart overlay layer:
   {
     "support": [ {x,y,strength}... ],
     "resistance": [ {x,y,strength}... ],
     "liquidity": [ {x,y,type}... ],
     "ema50": [ {x,y}... ],
     "ema200": [ {x,y}... ],
     "entryZone": {x1,y1,x2,y2},
     "stopLoss": {x,y},
     "takeProfit": {x,y},
     "patterns": [ {type, x, y}... ]
   }
   Coordinates are fractions (0..1) relative to the image box, so the overlay
   renders correctly at any rendered image size.
4. `detailed_explanation` text — the long-form narrative shown on the result
   dashboard (distinct from the short `market_trend` blurb).

## Security
- No new tables; no policy changes. Existing owner-scoped RLS policies on
  `chart_analyses` already cover these columns (policies are row-level, not
  column-level, so new columns inherit the same access rules).
- Existing `select_own_analyses` / `insert_own_analyses` /
  `update_own_analyses` / `delete_own_analyses` policies remain in force.

## Notes
- Uses `DO $$ ... IF NOT EXISTS ... END $$` to make column additions
  idempotent (safe to re-run).
- CHECK constraints are added with `IF NOT EXISTS`-style guards via a DO
  block so re-application doesn't error on duplicate constraints.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'chart_analyses' AND column_name = 'setup_grade') THEN
    ALTER TABLE chart_analyses ADD COLUMN setup_grade text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'chart_analyses' AND column_name = 'risk_score') THEN
    ALTER TABLE chart_analyses ADD COLUMN risk_score int;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'chart_analyses' AND column_name = 'overlays') THEN
    ALTER TABLE chart_analyses ADD COLUMN overlays jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'chart_analyses' AND column_name = 'detailed_explanation') THEN
    ALTER TABLE chart_analyses ADD COLUMN detailed_explanation text DEFAULT '';
  END IF;
END $$;

-- setup_grade CHECK (guard against duplicate constraint name)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chart_analyses_setup_grade_check') THEN
    ALTER TABLE chart_analyses ADD CONSTRAINT chart_analyses_setup_grade_check
      CHECK (setup_grade IS NULL OR setup_grade IN ('A+','A','B','C'));
  END IF;
END $$;

-- risk_score CHECK
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chart_analyses_risk_score_check') THEN
    ALTER TABLE chart_analyses ADD CONSTRAINT chart_analyses_risk_score_check
      CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100));
  END IF;
END $$;
