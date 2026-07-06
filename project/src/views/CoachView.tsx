import { useEffect, useState } from 'react';
import { Brain, Sparkles, TrendingUp, Target, Shield, Lightbulb, ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { navigate } from '../lib/router';
import { GlassCard, Spinner } from '../components/ui';
import { fetchRecentAnalyses, fetchStats } from '../lib/api';
import type { ChartAnalysis, TradingStats } from '../lib/api';

interface CoachingInsight {
  icon: typeof TrendingUp;
  title: string;
  body: string;
  tone: 'positive' | 'caution' | 'neutral';
}

export function CoachView() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<ChartAnalysis[] | null>(null);
  const [stats, setStats] = useState<TradingStats | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchRecentAnalyses(user.id, 50).then(setAnalyses).catch(() => setAnalyses([]));
    fetchStats(user.id).then(setStats).catch(() => setStats(null));
  }, [user]);

  if (!analyses || !stats) return <div className="flex justify-center py-20"><Spinner size={24} /></div>;

  const insights = buildInsights(analyses, stats);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <GlassCard className="relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-radial-glow opacity-50" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon-500/10 text-neon-400 ring-1 ring-neon-500/30 shadow-glow"><Brain size={24} /></div>
          <div>
            <h2 className="font-display text-xl font-700 text-white">AI Coach</h2>
            <p className="text-xs text-ink-400">Personalized guidance based on your analysis and journal history. Educational only — not financial advice.</p>
          </div>
        </div>
      </GlassCard>

      {analyses.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <Lightbulb size={32} className="mx-auto text-ink-500" />
          <p className="mt-4 font-display text-base font-600 text-white">Your coach needs some history first</p>
          <p className="mt-1 text-sm text-ink-400">Run a few analyses and log trades — your AI Coach will surface patterns and improvements.</p>
          <button onClick={() => navigate({ name: 'dashboard' })} className="btn-neon mt-5">Go to dashboard</button>
        </GlassCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {insights.map((ins, i) => <InsightCard key={i} insight={ins} delay={i * 80} />)}
          </div>

          {/* Suggested focus */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-neon-400" />
              <h3 className="font-display text-base font-600 text-white">Suggested focus this week</h3>
            </div>
            <ul className="mt-4 space-y-2.5">
              {suggestedFocus(stats, analyses).map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-ink-200">
                  <span className="mono mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-neon-500/10 text-[11px] font-600 text-neon-400">{i + 1}</span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        </>
      )}
    </div>
  );
}

function buildInsights(analyses: ChartAnalysis[], stats: TradingStats): CoachingInsight[] {
  const out: CoachingInsight[] = [];
  if (analyses.length === 0) return out;

  // Direction bias
  const buys = analyses.filter((a) => a.direction === 'buy').length;
  const sells = analyses.filter((a) => a.direction === 'sell').length;
  const neutrals = analyses.filter((a) => a.direction === 'neutral').length;
  if (buys > sells * 1.6) {
    out.push({ icon: TrendingUp, title: 'Long-bias detected', body: `You're analyzing ${buys} bullish vs ${sells} bearish setups. Make sure you're not missing short opportunities in downtrends — the market goes both ways.`, tone: 'caution' });
  } else if (sells > buys * 1.6) {
    out.push({ icon: TrendingUp, title: 'Short-bias detected', body: `You're analyzing ${sells} bearish vs ${buys} bullish setups. Consider whether macro context supports the bearish lean or if you're under-scanning longs.`, tone: 'caution' });
  } else {
    out.push({ icon: TrendingUp, title: 'Balanced direction reading', body: `You scan both sides of the market (${buys} longs, ${sells} shorts). That balance is healthy — keep confirming with structure rather than bias.`, tone: 'positive' });
  }

  // Confidence discipline
  const avgConf = analyses.reduce((s, a) => s + a.confidence, 0) / analyses.length;
  if (avgConf < 60) {
    out.push({ icon: Shield, title: 'Confidence discipline', body: `Your average setup confidence is ${avgConf.toFixed(0)}%. Consider waiting for higher-agreement setups (70%+) before committing capital — quality over quantity.`, tone: 'caution' });
  } else {
    out.push({ icon: Shield, title: 'Confidence discipline', body: `Your average setup confidence is ${avgConf.toFixed(0)}% — you're filtering for quality setups. Keep applying the same threshold consistently.`, tone: 'positive' });
  }

  // Risk score
  const withRisk = analyses.filter((a) => a.risk_score != null);
  if (withRisk.length > 0) {
    const avgRisk = withRisk.reduce((s, a) => s + (a.risk_score ?? 0), 0) / withRisk.length;
    if (avgRisk > 60) {
      out.push({ icon: Shield, title: 'Elevated risk profile', body: `Your analyzed setups carry an average risk score of ${avgRisk.toFixed(0)}/100. Look for lower-volatility regimes or wider stops to bring average risk down.`, tone: 'caution' });
    } else {
      out.push({ icon: Shield, title: 'Risk profile is managed', body: `Average risk score of ${avgRisk.toFixed(0)}/100 across your setups — within a manageable band. Maintain position sizing discipline.`, tone: 'positive' });
    }
  }

  // Win rate / accuracy
  if (stats.total > 2) {
    if (stats.winRate < 45) {
      out.push({ icon: Target, title: 'Win rate to improve', body: `Your closed-trade win rate is ${stats.winRate.toFixed(0)}%. Review losing trades in your journal — look for a common invalidation pattern to filter out next time.`, tone: 'caution' });
    } else {
      out.push({ icon: Target, title: 'Win rate is healthy', body: `Win rate of ${stats.winRate.toFixed(0)}% across ${stats.total} trades. Keep doing what's working and document the winning setup types.`, tone: 'positive' });
    }
  } else if (neutrals > analyses.length * 0.3) {
    out.push({ icon: Lightbulb, title: 'Patience is showing', body: `${neutrals} of your analyses returned a "Wait" stance. That discipline to stand aside is a strength — many traders over-trade.`, tone: 'positive' });
  }

  return out.slice(0, 6);
}

function suggestedFocus(stats: TradingStats, analyses: ChartAnalysis[]): string[] {
  const focus: string[] = [];
  if (stats.total < 3) focus.push('Log at least 5 journal entries this week so your AI Coach can identify recurring patterns in your trading.');
  if (analyses.length > 0) {
    const lowGrade = analyses.filter((a) => a.setup_grade === 'C').length;
    if (lowGrade > analyses.length * 0.4) focus.push('Filter for A and A+ setups only this week — passing on C-grade setups is itself a skill.');
  }
  focus.push('Pre-define your invalidation (stop) and target before each entry, and log the outcome honestly in the journal.');
  if (stats.winRate >= 50 && stats.total >= 3) focus.push('You have a working edge — focus on consistent position sizing rather than increasing risk.');
  return focus.slice(0, 4);
}

function InsightCard({ insight, delay }: { insight: CoachingInsight; delay: number }) {
  const Icon = insight.icon;
  const toneCls = insight.tone === 'positive' ? 'text-neon-400 bg-neon-500/10 ring-neon-500/30'
    : insight.tone === 'caution' ? 'text-warn-400 bg-warn-500/10 ring-warn-500/30'
    : 'text-ink-200 bg-white/[0.04] ring-white/10';
  return (
    <GlassCard className="p-5 animate-fade-up" >
      <div style={{ animationDelay: `${delay}ms` }} className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${toneCls}`}><Icon size={17} /></div>
        <div>
          <h3 className="font-display text-sm font-600 text-white">{insight.title}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-300">{insight.body}</p>
        </div>
      </div>
    </GlassCard>
  );
}
