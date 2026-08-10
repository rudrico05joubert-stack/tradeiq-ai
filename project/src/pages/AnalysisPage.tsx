import { useEffect, useState } from 'react';
import { ArrowLeft, AlertCircle, BookOpen, ChevronDown, Gauge, Scale, Shield, Target } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { navigate } from '../lib/router';
import { fetchAnalysis, insertJournal } from '../lib/api';
import type { ChartAnalysis } from '../lib/supabase';
import { fmtPrice, fmtRR, fmtDateTime } from '../lib/format';
import { Spinner, GlassCard } from '../components/ui';
import { DirectionBadge, ProgressBar, GradeBadge, RiskScoreBar } from '../components/Analysis';
import { LinearGauge } from '../components/Gauges';
import { ChartOverlay } from '../components/ChartOverlay';

export function AnalysisPage({ id }: { id: string }) {
  const { user, loading } = useAuth();
  const [analysis, setAnalysis] = useState<ChartAnalysis | null | 'error' | 'loading'>('loading');
  const [savedToJournal, setSavedToJournal] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ name: 'login' }); }, [loading, user]);
  useEffect(() => { if (user) fetchAnalysis(id).then(setAnalysis).catch(() => setAnalysis('error')); }, [id, user]);

  if (loading || !user || analysis === 'loading') return <div className="flex min-h-screen items-center justify-center"><Spinner size={28} /></div>;
  if (analysis === 'error' || !analysis) {
    return <div className="flex min-h-screen items-center justify-center px-5"><GlassCard className="max-w-md p-8 text-center"><AlertCircle size={28} className="mx-auto text-bear-400" /><p className="mt-3 text-sm text-ink-200">We couldn't load this analysis.</p><button onClick={() => navigate({ name: 'dashboard' })} className="btn-outline mt-4">Back to dashboard</button></GlassCard></div>;
  }

  const a = analysis;
  const isNoTrade = a.direction === 'neutral';
  const saveToJournal = async () => {
    if (!user || isNoTrade) return;
    await insertJournal({ user_id: user.id, analysis_id: a.id, symbol: a.symbol, direction: a.direction, entry: a.entry, stop_loss: a.stop_loss, take_profit: a.take_profit, outcome: 'pending', pnl: null, notes: '', executed_at: new Date().toISOString() });
    setSavedToJournal(true);
  };

  const actionTitle = isNoTrade ? 'WAIT — DO NOT ENTER' : a.direction === 'buy' ? 'BUY SETUP' : 'SELL SETUP';
  const actionText = isNoTrade
    ? 'NEXORA did not find a safe entry. Stay out and upload a fresh chart after the next structure or candle close.'
    : `Only consider this ${a.direction} near ${fmtPrice(a.entry)}. Exit if the stop at ${fmtPrice(a.stop_loss)} is reached.`;
  const keyReasons = a.reasons.filter(Boolean).slice(0, 3);

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="pointer-events-none fixed inset-0 -z-10"><div className="absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-neon-500/[0.06] blur-[130px]" /></div>

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate({ name: 'dashboard' })} className="flex items-center gap-2 text-sm text-ink-300 hover:text-white"><ArrowLeft size={16} /> Back</button>
            <div className="hidden h-5 w-px bg-white/10 sm:block" />
            <div><div className="mono font-700 text-white">{a.symbol}</div><div className="text-[11px] text-ink-400">{a.timeframe.toUpperCase()} · {fmtDateTime(a.created_at)}</div></div>
          </div>
          {!isNoTrade && <button onClick={saveToJournal} disabled={savedToJournal} className={savedToJournal ? 'btn-outline' : 'btn-neon'}>{savedToJournal ? <><BookOpen size={15} /> Saved</> : <><BookOpen size={15} /> Log trade</>}</button>}
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-5 py-6 pb-24">
        <GlassCard className={`overflow-hidden border ${isNoTrade ? 'border-warn-500/30' : a.direction === 'buy' ? 'border-neon-500/30' : 'border-bear-500/30'}`}>
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:p-8">
            <div>
              <div className="flex flex-wrap items-center gap-2"><DirectionBadge direction={a.direction} />{a.setup_grade && <GradeBadge grade={a.setup_grade} size="sm" />}</div>
              <p className="mt-5 text-xs font-700 uppercase tracking-[0.2em] text-ink-400">What should I do?</p>
              <h1 className={`mt-2 font-display text-4xl font-800 tracking-tight sm:text-5xl ${isNoTrade ? 'text-warn-400' : a.direction === 'buy' ? 'text-neon-400' : 'text-bear-400'}`}>{actionTitle}</h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-100">{actionText}</p>
            </div>
            <div className="min-w-[150px] rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-center md:self-center">
              <div className="text-xs uppercase tracking-wider text-ink-400">Confidence</div>
              <div className="mono mt-1 text-4xl font-700 text-white">{a.confidence}<span className="text-lg text-ink-400">%</span></div>
              <div className="mt-3"><ProgressBar value={a.confidence} /></div>
            </div>
          </div>
        </GlassCard>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            {a.image_url && a.overlays ? <ChartOverlay imageUrl={a.image_url} overlays={a.overlays} entry={isNoTrade ? null : a.entry} stopLoss={isNoTrade ? null : a.stop_loss} takeProfit={isNoTrade ? null : a.take_profit} /> : <GlassCard className="overflow-hidden">{a.image_url && <img src={a.image_url} alt={a.symbol} className="max-h-[560px] w-full bg-ink-900 object-contain" />}</GlassCard>}

            <GlassCard className="p-6">
              <h2 className="font-display text-lg font-700 text-white">Why this decision?</h2>
              <div className="mt-4 space-y-3">
                {keyReasons.map((reason, index) => <div key={index} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><span className="mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neon-500/10 text-xs font-700 text-neon-400">{index + 1}</span><p className="text-sm leading-relaxed text-ink-200">{reason}</p></div>)}
              </div>
            </GlassCard>
          </div>

          <div className="space-y-5">
            {isNoTrade ? <GlassCard className="border border-warn-500/30 bg-warn-500/[0.06] p-6"><div className="flex items-center gap-2 text-warn-400"><Shield size={18} /><h2 className="font-display font-700">Next step</h2></div><ol className="mt-4 space-y-3 text-sm text-ink-200"><li><strong className="text-white">1.</strong> Do not open a position.</li><li><strong className="text-white">2.</strong> Wait for a clear retracement, rejection, or new structure.</li><li><strong className="text-white">3.</strong> Upload a fresh screenshot for a new decision.</li></ol></GlassCard> : <GlassCard className="p-6"><div className="flex items-center gap-2"><Target size={17} className="text-neon-400" /><h2 className="font-display font-700 text-white">Trade plan</h2></div><div className="mt-4 space-y-2.5"><LevelRow label="Entry" value={fmtPrice(a.entry)} accent="neutral" /><LevelRow label="Stop loss" value={fmtPrice(a.stop_loss)} accent="bear" /><LevelRow label="Take profit" value={fmtPrice(a.take_profit)} accent="bull" /><div className="flex items-center justify-between rounded-xl border border-neon-500/20 bg-neon-500/[0.06] px-4 py-3"><span className="flex items-center gap-2 text-sm text-ink-200"><Scale size={14} /> Risk : Reward</span><span className="mono font-700 text-neon-400">{fmtRR(a.risk_reward)}</span></div></div></GlassCard>}

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs leading-relaxed text-ink-400"><Shield size={14} className="mb-2 text-neon-400" />Decision support—not a guarantee. Never risk money you cannot afford to lose.</div>
          </div>
        </div>

        <details className="group mt-6 rounded-2xl border border-white/[0.08] bg-ink-900/60">
          <summary className="flex cursor-pointer list-none items-center justify-between p-5 text-sm font-700 text-white"><span className="flex items-center gap-2"><Gauge size={16} className="text-neon-400" />View advanced analysis</span><ChevronDown size={17} className="text-ink-400 transition-transform group-open:rotate-180" /></summary>
          <div className="border-t border-white/[0.06] p-5">
            <div className="grid gap-4 md:grid-cols-3">{a.trend_strength != null && <GlassCard className="p-4"><LinearGauge value={a.trend_strength} label="Trend Strength" mode="high-good" caption="How established the trend is" /></GlassCard>}{a.momentum_score != null && <GlassCard className="p-4"><LinearGauge value={a.momentum_score} label="Momentum" mode="high-good" caption="Current directional force" /></GlassCard>}{a.risk_score != null && <GlassCard className="p-4"><LinearGauge value={a.risk_score} label="Risk" mode="low-good" caption="Lower is safer" /><div className="mt-3"><RiskScoreBar value={a.risk_score} /></div></GlassCard>}</div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <GlassCard className="p-5"><h3 className="font-display font-700 text-white">Indicator readings</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(a.indicators).map(([name, value]) => <div key={name} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><div className="text-xs text-ink-400">{name}</div><div className="mono mt-1 font-600 text-white">{typeof value === 'number' ? value.toFixed(2) : value}</div></div>)}</div></GlassCard>
              <GlassCard className="p-5"><h3 className="font-display font-700 text-white">Full AI explanation</h3><p className="mt-4 text-sm leading-relaxed text-ink-200">{a.detailed_explanation || a.market_trend}</p></GlassCard>
            </div>
          </div>
        </details>

        <p className="mt-8 text-center text-[11px] text-ink-500">AI-generated educational analysis · Not financial advice · Trading involves substantial risk</p>
      </main>
    </div>
  );
}

function LevelRow({ label, value, accent }: { label: string; value: string; accent: 'bull' | 'bear' | 'neutral' }) {
  const color = accent === 'bull' ? 'text-neon-400' : accent === 'bear' ? 'text-bear-400' : 'text-white';
  return <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5"><span className="text-xs text-ink-400">{label}</span><span className={`mono text-sm font-600 ${color}`}>{value}</span></div>;
}
