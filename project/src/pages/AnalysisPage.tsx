import { useEffect, useState } from 'react';
import { ArrowLeft, AlertCircle, BookOpen, TrendingUp, Activity, Gauge, Scale, Sparkles, Shield, Target, CandlestickChart } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { navigate } from '../lib/router';
import { fetchAnalysis, insertJournal } from '../lib/api';
import type { ChartAnalysis } from '../lib/supabase';
import { fmtPrice, fmtRR, fmtDateTime } from '../lib/format';
import { Logo, Spinner, GlassCard } from '../components/ui';
import { DirectionBadge, ConfidenceRing, ProgressBar, GradeBadge, RiskScoreBar } from '../components/Analysis';
import { RadialGauge, LinearGauge } from '../components/Gauges';
import { ChartOverlay } from '../components/ChartOverlay';

export function AnalysisPage({ id }: { id: string }) {
  const { user, loading } = useAuth();
  const [analysis, setAnalysis] = useState<ChartAnalysis | null | 'error' | 'loading'>('loading');
  const [savedToJournal, setSavedToJournal] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ name: 'login' }); }, [loading, user]);
  useEffect(() => { if (user) fetchAnalysis(id).then(setAnalysis).catch(() => setAnalysis('error')); }, [id, user]);

  if (loading || !user || analysis === 'loading') return <div className="flex min-h-screen items-center justify-center"><Spinner size={28} /></div>;
  if (analysis === 'error' || !analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <GlassCard className="max-w-md p-8 text-center">
          <AlertCircle size={28} className="mx-auto text-bear-400" />
          <p className="mt-3 text-sm text-ink-200">We couldn't load this analysis.</p>
          <button onClick={() => navigate({ name: 'dashboard' })} className="btn-outline mt-4">Back to dashboard</button>
        </GlassCard>
      </div>
    );
  }

  const a = analysis;
  const saveToJournal = async () => {
    if (!user) return;
    await insertJournal({ user_id: user.id, analysis_id: a.id, symbol: a.symbol, direction: a.direction, entry: a.entry, stop_loss: a.stop_loss, take_profit: a.take_profit, outcome: 'pending', pnl: null, notes: '', executed_at: new Date().toISOString() });
    setSavedToJournal(true);
  };

  const gradeLabel = a.setup_grade ? (a.setup_grade === 'A+' ? 'Elite setup' : a.setup_grade === 'A' ? 'High-quality setup' : a.setup_grade === 'B' ? 'Acceptable setup' : 'Marginal setup') : '—';

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-neon-500/[0.07] blur-[130px]" />
      </div>

      {/* Terminal top bar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate({ name: 'dashboard' })} className="flex items-center gap-2 text-sm text-ink-300 hover:text-white">
              <ArrowLeft size={16} /> <span className="hidden sm:inline">Back</span>
            </button>
            <div className="hidden h-5 w-px bg-white/10 sm:block" />
            <div className="flex items-center gap-2.5">
              <span className="mono text-lg font-700 text-white">{a.symbol}</span>
              <DirectionBadge direction={a.direction} size="sm" />
              {a.setup_grade && <GradeBadge grade={a.setup_grade} size="sm" />}
              <span className="hidden text-[11px] text-ink-400 md:inline">· {a.timeframe.toUpperCase()} · {fmtDateTime(a.created_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-[11px] text-ink-400 lg:flex">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-pulseDot rounded-full bg-neon-400 opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-neon-500" /></span>
              <span className="mono">ANALYSIS COMPLETE</span>
            </span>
            <Logo size={28} withText={false} />
            <button onClick={saveToJournal} disabled={savedToJournal} className={savedToJournal ? 'btn-outline' : 'btn-neon'}>
              {savedToJournal ? <><BookOpen size={15} /> Saved</> : <><BookOpen size={15} /> Log</>}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-6 pb-24">
        {/* Disclaimer bar */}
        <GlassCard className="mb-5 p-6">
  <div className="flex items-center justify-between">
    <div>
      <DirectionBadge direction={a.direction} size="md" />

      <h1 className="mt-3 font-display text-4xl font-700 text-white">
        {a.direction === 'buy'
          ? 'BUY'
          : a.direction === 'sell'
          ? 'SELL'
          : 'WAIT'}
      </h1>

      <p className="mt-2 text-ink-300">
        {gradeLabel}
      </p>
    </div>

    <div className="text-right">
      <div className="text-5xl font-700 text-neon-400">
        {a.confidence}%
      </div>

      <ProgressBar value={a.confidence} />

      <div className="mt-4">
        {a.setup_grade && (
          <GradeBadge
            grade={a.setup_grade}
            size="lg"
          />
        )}
      </div>
    </div>
  </div>
</GlassCard>
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-ink-400">
          <Shield size={13} className="shrink-0 text-neon-400" />
          Decision-support analysis with confidence levels — not a prediction or guarantee of outcome. Manage risk and invalidate the thesis on a clean close beyond the stop.
        </div>

        {/* Top grid: chart (left, wide) + gauges rail (right) */}
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          {/* LEFT: chart + indicators + explanation */}
          <div className="space-y-5">
            {a.image_url && a.overlays ? (
              <ChartOverlay imageUrl={a.image_url} overlays={a.overlays} direction={a.direction} entry={a.entry} stopLoss={a.stop_loss} takeProfit={a.take_profit} />
            ) : (
              <GlassCard className="overflow-hidden">
                {a.image_url && <img src={a.image_url} alt={a.symbol} className="w-full max-h-[460px] object-contain bg-ink-900" />}
              </GlassCard>
            )}

            {/* Indicator readings grid */}
            <GlassCard className="p-5">
              <div className="flex items-center gap-2">
                <Gauge size={16} className="text-neon-400" />
                <h2 className="font-display text-base font-600 text-white">Indicator readings</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(a.indicators).map(([name, value], i) => {
                  const Icon = [Gauge, Activity, TrendingUp, Scale, CandlestickChart][i % 5];
                  return (
                    <div key={name} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                      <div className="flex items-center gap-2 text-ink-300"><Icon size={14} className="text-neon-400" /><span className="text-xs">{name}</span></div>
                      <div className="mono mt-1.5 text-lg font-600 text-white">{typeof value === 'number' ? value.toFixed(2) : value}</div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Detailed explanation */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-neon-400" />
                <h2 className="font-display text-lg font-600 text-white">Detailed AI explanation</h2>
              </div>
              {a.detailed_explanation ? (
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-200">{a.detailed_explanation}</p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {a.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-ink-200">
                      <span className="mono mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-neon-500/10 text-[11px] font-600 text-neon-400">{i + 1}</span>
                      <span className="leading-relaxed">{r}</span>
                    </li>
                  ))}
                </ol>
              )}
            </GlassCard>

            {/* Key reasons */}
            <GlassCard className="p-6">
              <h2 className="font-display text-base font-600 text-white">Key reasons</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {a.reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-sm text-ink-200">
                    <span className="mono mt-0.5 text-neon-400">{i + 1}</span>
                    <span className="leading-relaxed">{r}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* RIGHT: terminal rail */}
          <div className="space-y-5">
            {/* Grade + confidence header */}
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-400">Setup grade</div>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    {a.setup_grade && <GradeBadge grade={a.setup_grade} size="lg" />}
                    <div>
                      <div className="font-display text-lg font-700 text-white">{a.setup_grade ?? '—'}</div>
                      <div className="text-[11px] text-ink-400">{gradeLabel}</div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider text-ink-400">Confidence</div>
                  <div className="mono mt-1.5 text-3xl font-700 text-neon-400">{a.confidence}<span className="text-base text-ink-400">%</span></div>
                </div>
              </div>
              <div className="mt-4"><ProgressBar value={a.confidence} /></div>
            </GlassCard>

            {/* Animated radial gauges */}
            <GlassCard className="p-5">
              <div className="text-[11px] uppercase tracking-wider text-ink-400">Score matrix</div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center"><RadialGauge value={a.confidence} label="Confidence" size={120} /></div>
                {a.trend_strength != null && <div className="flex flex-col items-center"><RadialGauge value={a.trend_strength} label="Trend Strength" size={120} /></div>}
                {a.momentum_score != null && <div className="flex flex-col items-center"><RadialGauge value={a.momentum_score} label="Momentum" size={120} /></div>}
                {a.risk_score != null && <div className="flex flex-col items-center"><RadialGauge value={a.risk_score} label="Risk Score" size={120} color="#ff4d61" /></div>}
              </div>
              {a.risk_score != null && <div className="mt-4"><RiskScoreBar value={a.risk_score} /></div>}
            </GlassCard>

            {/* Direction + trend */}
            <GlassCard className="p-5">
              <div className="text-[11px] uppercase tracking-wider text-ink-400">Suggested direction</div>
              <div className="mt-3 flex items-center justify-between">
                <DirectionBadge direction={a.direction} />
                <span className="text-xs text-ink-400">{a.direction === 'buy' ? 'Long bias' : a.direction === 'sell' ? 'Short bias' : 'No-trade zone'}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">{a.market_trend}</p>
            </GlassCard>

            {/* Trade levels */}
            <GlassCard className="p-5">
              <div className="flex items-center gap-2">
                <Target size={15} className="text-neon-400" />
                <h3 className="font-display text-sm font-600 text-white">Trade levels</h3>
              </div>
              <div className="mt-3 space-y-2.5">
                <LevelRow label="Entry zone" value={fmtPrice(a.entry)} accent="neutral" />
                <LevelRow label="Stop loss" value={fmtPrice(a.stop_loss)} accent="bear" />
                <LevelRow label="Take profit" value={fmtPrice(a.take_profit)} accent="bull" />
                <div className="my-1 divider" />
                <div className="flex items-center justify-between rounded-xl border border-neon-500/20 bg-neon-500/[0.06] px-4 py-3">
                  <span className="flex items-center gap-1.5 text-sm text-ink-200"><Scale size={14} className="text-neon-400" /> Risk : Reward</span>
                  <span className="mono text-lg font-700 text-neon-400">{fmtRR(a.risk_reward)}</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Linear gauge strip (trend + momentum + risk) */}
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {a.trend_strength != null && (
            <GlassCard className="p-5"><LinearGauge value={a.trend_strength} label="Trend Strength" mode="high-good" caption="How established the current trend is" /></GlassCard>
          )}
          {a.momentum_score != null && (
            <GlassCard className="p-5"><LinearGauge value={a.momentum_score} label="Momentum Score" mode="high-good" caption="Directional momentum (RSI-normalized)" /></GlassCard>
          )}
          {a.risk_score != null && (
            <GlassCard className="p-5"><LinearGauge value={a.risk_score} label="Risk Score" mode="low-good" caption="Regime risk — lower is calmer" /></GlassCard>
          )}
        </div>

        <p className="mt-8 text-center text-[11px] text-ink-500">
          AI-generated analysis for educational purposes only · Not financial advice · Trading involves substantial risk
        </p>
      </main>
    </div>
  );
}

function LevelRow({ label, value, accent }: { label: string; value: string; accent: 'bull' | 'bear' | 'neutral' }) {
  const color = accent === 'bull' ? 'text-neon-400' : accent === 'bear' ? 'text-bear-400' : 'text-white';
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
      <span className="text-xs text-ink-400">{label}</span>
      <span className={`mono text-sm font-600 ${color}`}>{value}</span>
    </div>
  );
}
