import { useEffect, useState } from 'react';
import { History, ArrowRight, Trash2, Clock, Check } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { navigate } from '../lib/router';
import { GlassCard, Spinner } from '../components/ui';
import { DirectionBadge, ProgressBar } from '../components/Analysis';
import { fetchRecentAnalyses, fetchStats, deleteAnalysis } from '../lib/api';
import type { ChartAnalysis, TradingStats } from '../lib/api';
import { fmtPrice, fmtTimeAgo, fmtDateTime, fmtPct } from '../lib/format';

export function HistoryView() {
  const { user } = useAuth();
  const [items, setItems] = useState<ChartAnalysis[] | null>(null);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = () => {
    if (!user) return;
    fetchRecentAnalyses(user.id, 60).then(setItems).catch(() => setItems([]));
    fetchStats(user.id).then(setStats).catch(() => setStats(null));
  };
  useEffect(load, [user]);

  if (!items) return <div className="flex justify-center py-20"><Spinner size={24} /></div>;

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid gap-3 sm:grid-cols-4">
          <MiniStat label="Analyses" value={items.length} />
          <MiniStat label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} accent={stats.winRate >= 50} />
          <MiniStat label="Accuracy" value={`${stats.accuracy.toFixed(0)}%`} accent={stats.accuracy >= 60} />
          <MiniStat label="Net P&L" value={fmtPct(stats.pnl)} accent={stats.pnl >= 0} />
        </div>
      )}
      {items.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <History size={32} className="mx-auto text-ink-500" />
          <p className="mt-4 font-display text-base font-600 text-white">No analysis history yet</p>
          <p className="mt-1 text-sm text-ink-400">Your past analyses will appear here once you run your first one.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <GlassCard key={a.id} className="overflow-hidden" hover>
              <div className="flex">
                {a.image_url && (
                  <button onClick={() => navigate({ name: 'analysis', id: a.id })} className="relative w-24 shrink-0 overflow-hidden bg-ink-900">
                    <img src={a.image_url} alt={a.symbol} className="h-full w-full object-cover" />
                  </button>
                )}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="mono text-sm font-600 text-white">{a.symbol}</span>
                        <DirectionBadge direction={a.direction} size="sm" />
                        {a.setup_grade && <span className="mono rounded bg-neon-500/10 px-1 text-[10px] font-700 text-neon-400 ring-1 ring-neon-500/30">{a.setup_grade}</span>}
                      </div>
                      <div className="mt-0.5 text-[11px] text-ink-400">{fmtDateTime(a.created_at)} · {a.timeframe.toUpperCase()}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {confirmId === a.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={async () => { await deleteAnalysis(a.id); load(); }} className="rounded-md bg-bear-500/15 px-2 py-1 text-[10px] text-bear-400">Delete</button>
                          <button onClick={() => setConfirmId(null)} className="rounded-md px-2 py-1 text-[10px] text-ink-400">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmId(a.id)} className="rounded-md p-1.5 text-ink-400 hover:bg-white/[0.05] hover:text-bear-400"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[10px]"><span className="text-ink-400">Confidence</span><span className="mono text-ink-200">{a.confidence}%</span></div>
                      <div className="mt-1"><ProgressBar value={a.confidence} /></div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <Stat label="Entry" value={fmtPrice(a.entry)} />
                    <Stat label="Stop" value={fmtPrice(a.stop_loss)} />
                    <Stat label="Target" value={fmtPrice(a.take_profit)} />
                  </div>
                  <button onClick={() => navigate({ name: 'analysis', id: a.id })} className="mt-3 flex items-center gap-1 text-xs text-neon-400 hover:gap-2 transition-all">
                    Open terminal <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <GlassCard className="p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className={`mono mt-1 text-xl font-700 ${accent ? 'text-neon-400' : 'text-white'}`}>{value}</div>
    </GlassCard>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[9px] uppercase tracking-wider text-ink-500">{label}</div><div className="mono text-xs text-ink-100">{value}</div></div>;
}
