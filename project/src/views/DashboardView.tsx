import { useEffect, useState } from 'react';
import { ArrowRight, Clock, BarChart3, BookOpen, Sparkles, TrendingUp, Eye } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { navigate } from '../lib/router';
import type { View } from '../pages/TradingOS';
import { GlassCard, Spinner } from '../components/ui';
import { DirectionBadge, ProgressBar } from '../components/Analysis';
import { RadialGauge, StatTile } from '../components/Gauges';
import { fetchRecentAnalyses, fetchStats, fetchWatchlist } from '../lib/api';
import type { ChartAnalysis, TradingStats } from '../lib/api';
import type { WatchlistItem } from '../lib/supabase';
import { fmtPrice, fmtTimeAgo, fmtPct } from '../lib/format';

export function DashboardView({ setView }: { setView: (v: View) => void }) {
  const { user } = useAuth();
  const [recent, setRecent] = useState<ChartAnalysis[] | null>(null);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [watch, setWatch] = useState<WatchlistItem[] | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchRecentAnalyses(user.id, 6).then(setRecent).catch(() => setRecent([]));
    fetchStats(user.id).then(setStats).catch(() => setStats(null));
    fetchWatchlist(user.id).then(setWatch).catch(() => setWatch([]));
  }, [user]);

  const loading = !recent || !stats;

  return (
    <div className="space-y-5">
      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction icon={Sparkles} label="New Analysis" desc="Upload a chart" onClick={() => setView('new')} accent />
        <QuickAction icon={BookOpen} label="Journal" desc="Log a trade" onClick={() => setView('journal')} />
        <QuickAction icon={Eye} label="Watchlist" desc={`${watch?.length ?? 0} symbols`} onClick={() => setView('watchlist')} />
        <QuickAction icon={BarChart3} label="Performance" desc="Win rate & accuracy" onClick={() => setView('history')} />
      </div>

      {/* Stats row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-1">
          <h3 className="text-xs uppercase tracking-wider text-ink-400">Account snapshot</h3>
          {loading ? <div className="py-8 flex justify-center"><Spinner /></div> : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatTile label="Win Rate" value={`${stats!.winRate.toFixed(1)}`} unit="%" accent={stats!.winRate >= 50 ? 'bull' : 'bear'} />
              <StatTile label="Accuracy" value={`${stats!.accuracy.toFixed(0)}`} unit="%" accent={stats!.accuracy >= 60 ? 'bull' : 'neutral'} />
              <StatTile label="Total Trades" value={stats!.total} delta={`${stats!.wins}W · ${stats!.losses}L`} />
              <StatTile label="Net P&L" value={fmtPct(stats!.pnl)} accent={stats!.pnl >= 0 ? 'bull' : 'bear'} />
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider text-ink-400">Recent analyses</h3>
            <button onClick={() => setView('history')} className="text-xs text-neon-400 hover:gap-2 flex items-center gap-1 transition-all">View all <ArrowRight size={12} /></button>
          </div>
          {!recent ? <div className="py-8 flex justify-center"><Spinner /></div> :
           recent.length === 0 ? (
            <div className="py-10 text-center">
              <Clock size={28} className="mx-auto text-ink-500" />
              <p className="mt-3 text-sm text-ink-300">No analyses yet</p>
              <button onClick={() => setView('new')} className="btn-neon mt-4"><Sparkles size={14} /> Run first analysis</button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {recent.map((a) => (
                <button key={a.id} onClick={() => navigate({ name: 'analysis', id: a.id })} className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition hover:border-neon-500/30 hover:bg-white/[0.04]">
                  {a.image_url && <img src={a.image_url} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="mono text-sm font-600 text-white">{a.symbol}</span>
                      <DirectionBadge direction={a.direction} size="sm" />
                      {a.setup_grade && <span className="mono rounded bg-neon-500/10 px-1 text-[10px] font-700 text-neon-400 ring-1 ring-neon-500/30">{a.setup_grade}</span>}
                    </div>
                    <div className="mt-1 text-[11px] text-ink-400">{fmtTimeAgo(a.created_at)} · {a.timeframe.toUpperCase()}</div>
                    <div className="mt-1.5"><ProgressBar value={a.confidence} /></div>
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-ink-500" />
                </button>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Mini gauges from latest analysis */}
      {recent && recent.length > 0 && recent[0].trend_strength != null && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider text-ink-400">Latest setup readings</h3>
            <button onClick={() => navigate({ name: 'analysis', id: recent[0].id })} className="text-xs text-neon-400 flex items-center gap-1 hover:gap-2 transition-all">Open terminal <ArrowRight size={12} /></button>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-around gap-4">
            <RadialGauge value={recent[0].confidence} label="Confidence" size={120} />
            {recent[0].trend_strength != null && <RadialGauge value={recent[0].trend_strength} label="Trend Strength" size={120} />}
            {recent[0].momentum_score != null && <RadialGauge value={recent[0].momentum_score} label="Momentum" size={120} />}
            {recent[0].risk_score != null && <RadialGauge value={recent[0].risk_score} label="Risk Score" size={120} color="#ff4d61" />}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, onClick, accent }: { icon: typeof Clock; label: string; desc: string; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick} className={`glass p-4 text-left transition hover:border-neon-500/30 ${accent ? 'ring-1 ring-neon-500/20' : ''}`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent ? 'bg-neon-500/10 text-neon-400 ring-1 ring-neon-500/30' : 'bg-white/[0.04] text-ink-200'}`}>
        <Icon size={17} />
      </div>
      <div className="mt-3 text-sm font-600 text-white">{label}</div>
      <div className="text-[11px] text-ink-400">{desc}</div>
    </button>
  );
}
