import { supabase, type ChartAnalysis, type JournalEntry, type Outcome, type Plan, type Profile, type WatchlistItem, PLAN_LIMITS } from './supabase';
import { todayKey } from './format';

export type { ChartAnalysis, JournalEntry, Outcome, Plan, Profile, WatchlistItem };

// ---------- Profile ----------
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(userId: string, patch: Partial<Pick<Profile, 'display_name' | 'plan'>>): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

// ---------- Usage limit ----------
// Returns remaining analyses for today. Resets count when the date key rolls.
export async function getUsageRemaining(profile: Profile | null): Promise<{ remaining: number; used: number; limit: number }> {
  if (!profile) return { remaining: 0, used: 0, limit: 0 };
  const limit = PLAN_LIMITS[profile.plan];
  const tk = todayKey();
  const used = profile.daily_usage_date === tk ? profile.daily_usage_count : 0;
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);
  return { remaining, used, limit };
}

// Increment today's usage, resetting if the date changed. Returns updated profile.
export async function bumpUsage(profile: Profile): Promise<Profile> {
  const tk = todayKey();
  const newCount = profile.daily_usage_date === tk ? profile.daily_usage_count + 1 : 1;
  const { data, error } = await supabase
    .from('profiles')
    .update({ daily_usage_count: newCount, daily_usage_date: tk })
    .eq('id', profile.id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Profile;
}

// ---------- Chart storage ----------
export async function uploadChart(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('charts').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('charts').getPublicUrl(path);
  return data.publicUrl;
}

// ---------- Analyses ----------
export async function insertAnalysis(row: {
  user_id: string;
  symbol?: string;
  timeframe?: string;
  image_url?: string;
  market_trend?: string;
  direction: ChartAnalysis['direction'];
  confidence: number;
  entry?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  risk_reward?: number | null;
  reasons?: string[];
  indicators?: Record<string, number>;
  notes?: string;
  status?: ChartAnalysis['status'];
  setup_grade?: ChartAnalysis['setup_grade'];
  risk_score?: ChartAnalysis['risk_score'];
  trend_strength?: ChartAnalysis['trend_strength'];
  momentum_score?: ChartAnalysis['momentum_score'];
  overlays?: ChartAnalysis['overlays'];
  detailed_explanation?: string;
}): Promise<ChartAnalysis> {
  const { data, error } = await supabase
    .from('chart_analyses')
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return data as ChartAnalysis;
}

export async function fetchAnalysis(id: string): Promise<ChartAnalysis | null> {
  const { data, error } = await supabase
    .from('chart_analyses')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as ChartAnalysis | null;
}

export async function fetchRecentAnalyses(userId: string, limit = 12): Promise<ChartAnalysis[]> {
  const { data, error } = await supabase
    .from('chart_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ChartAnalysis[];
}

export async function deleteAnalysis(id: string): Promise<void> {
  const { error } = await supabase.from('chart_analyses').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Journal ----------
export async function fetchJournal(userId: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('executed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as JournalEntry[];
}

export async function insertJournal(row: {
  user_id: string;
  analysis_id?: string | null;
  symbol?: string;
  direction: JournalEntry['direction'];
  entry?: number | null;
  exit_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  outcome?: Outcome;
  pnl?: number | null;
  notes?: string;
  executed_at?: string;
}): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from('journal_entries')
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return data as JournalEntry;
}

export async function updateJournal(id: string, patch: Partial<JournalEntry>): Promise<void> {
  const { error } = await supabase.from('journal_entries').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteJournal(id: string): Promise<void> {
  const { error } = await supabase.from('journal_entries').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Stats ----------
export interface TradingStats {
  total: number;
  wins: number;
  losses: number;
  breakeven: number;
  pending: number;
  winRate: number; // 0..100 over closed trades
  accuracy: number; // % of analyses whose direction matched the realized outcome
  pnl: number;
}

export async function fetchStats(userId: string): Promise<TradingStats> {
  const [journal, analyses] = await Promise.all([
    fetchJournal(userId),
    fetchRecentAnalyses(userId, 200),
  ]);

  const closed = journal.filter((j) => j.outcome !== 'pending');
  const wins = journal.filter((j) => j.outcome === 'win').length;
  const losses = journal.filter((j) => j.outcome === 'loss').length;
  const breakeven = journal.filter((j) => j.outcome === 'breakeven').length;
  const pending = journal.filter((j) => j.outcome === 'pending').length;
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
  const pnl = journal.reduce((s, j) => s + (j.pnl ?? 0), 0);

  // Accuracy: of journal entries linked to an analysis, how often did the
  // analysis direction match the realized outcome direction.
  const analysisById = new Map(analyses.map((a) => [a.id, a]));
  let matched = 0;
  let scored = 0;
  for (const j of journal) {
    if (!j.analysis_id) continue;
    const a = analysisById.get(j.analysis_id);
    if (!a || j.outcome === 'pending' || j.outcome === 'breakeven') continue;
    scored++;
    const won = (a.direction === 'buy' && j.outcome === 'win') || (a.direction === 'sell' && j.outcome === 'win');
    const lostOpposite = (a.direction === 'buy' && j.outcome === 'loss') || (a.direction === 'sell' && j.outcome === 'loss');
    if (won || lostOpposite) {
      // win on the suggested direction = correct call; loss on the opposite = also "correct" contrarian read not tracked
      if (won) matched++;
    }
  }
  const accuracy = scored > 0 ? (matched / scored) * 100 : 0;

  return {
    total: journal.length,
    wins, losses, breakeven, pending,
    winRate, accuracy, pnl,
  };
}

export async function upgradePlan(userId: string, plan: Plan): Promise<void> {
  await updateProfile(userId, { plan });
}

// ---------- Watchlist ----------
export async function fetchWatchlist(userId: string): Promise<WatchlistItem[]> {
  const { data, error } = await supabase
    .from('watchlist_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WatchlistItem[];
}

export async function insertWatchlist(row: {
  user_id: string;
  symbol: string;
  direction?: WatchlistItem['direction'];
  notes?: string;
  target_price?: number | null;
  alert_above?: number | null;
  alert_below?: number | null;
}): Promise<WatchlistItem> {
  const { data, error } = await supabase
    .from('watchlist_items')
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return data as WatchlistItem;
}

export async function deleteWatchlist(id: string): Promise<void> {
  const { error } = await supabase.from('watchlist_items').delete().eq('id', id);
  if (error) throw error;
}
