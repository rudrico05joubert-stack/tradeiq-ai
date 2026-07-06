import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing Supabase env vars: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ---------- Types ----------
export type Plan = 'free' | 'pro' | 'elite';
export type Direction = 'buy' | 'sell' | 'neutral';
export type SetupGrade = 'A+' | 'A' | 'B' | 'C';

export interface OverlayPoint { x: number; y: number; }
export interface LevelPoint extends OverlayPoint { strength: 'weak' | 'moderate' | 'strong'; }
export interface LiquidityPoint extends OverlayPoint { type: 'buyside' | 'sellside'; }
export interface ZoneBox { x1: number; y1: number; x2: number; y2: number; }
export interface PatternMark { type: string; x: number; y: number; label: string; }
export interface ChartOverlays {
  support: LevelPoint[];
  resistance: LevelPoint[];
  liquidity: LiquidityPoint[];
  ema50: OverlayPoint[];
  ema200: OverlayPoint[];
  entryZone: ZoneBox | null;
  stopLoss: OverlayPoint | null;
  takeProfit: OverlayPoint | null;
  patterns: PatternMark[];
}
export type Outcome = 'win' | 'loss' | 'breakeven' | 'pending';

export interface Profile {
  id: string;
  plan: Plan;
  display_name: string;
  daily_usage_count: number;
  daily_usage_date: string;
  created_at: string;
}

export interface ChartAnalysis {
  id: string;
  user_id: string;
  symbol: string;
  timeframe: string;
  image_url: string;
  market_trend: string;
  direction: Direction;
  confidence: number;
  entry: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  risk_reward: number | null;
  reasons: string[];
  indicators: Record<string, number>;
  notes: string;
  status: 'processing' | 'completed' | 'failed';
  setup_grade: SetupGrade | null;
  risk_score: number | null;
  trend_strength: number | null;
  momentum_score: number | null;
  overlays: ChartOverlays | null;
  detailed_explanation: string;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  symbol: string;
  direction: Direction;
  notes: string;
  target_price: number | null;
  alert_above: number | null;
  alert_below: number | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  analysis_id: string | null;
  symbol: string;
  direction: Direction;
  entry: number | null;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  outcome: Outcome;
  pnl: number | null;
  notes: string;
  executed_at: string;
  created_at: string;
}

export const PLAN_LIMITS: Record<Plan, number> = {
  free: 3,
  pro: Infinity,
  elite: Infinity,
};

export const PLAN_FEATURES: Record<Plan, { label: string; tagline: string; price: string; features: string[] }> = {
  free: {
    label: 'Free',
    tagline: 'Try the engine',
    price: '$0',
    features: ['3 analyses per day', 'Trend + RSI + EMA', 'Confidence score', 'Single chart at a time'],
  },
  pro: {
    label: 'Pro',
    tagline: 'For active traders',
    price: '$29',
    features: ['Unlimited analyses', 'All 7 analysis modules', 'Risk-to-reward calculator', 'Priority processing'],
  },
  elite: {
    label: 'Elite',
    tagline: 'Full toolkit',
    price: '$79',
    features: ['Unlimited analyses', 'AI Coach (1:1 guidance)', 'Trading Journal', 'Premium features & early access'],
  },
};
