import { useState } from 'react';
import {
  ArrowRight, TrendingUp, Activity, Gauge, CandlestickChart, Layers,
  Scale, Sparkles, Check, Zap, Crown, BarChart3,
} from 'lucide-react';
import { PublicHeader, Footer } from '../components/PublicHeader';
import { Dropzone } from '../components/Dropzone';
import { Logo, SectionTag, IconBadge, GlassCard, Spinner } from '../components/ui';
import { navigate } from '../lib/router';
import { useAuth } from '../lib/auth';
import { STEPS, generateAnalysis, imageSignature } from '../lib/engine';
import { DirectionBadge, ProgressBar } from '../components/Analysis';

const FEATURES = [
  { icon: TrendingUp, title: 'Trend Analysis', desc: 'Detects higher-high/lower-low structure and labels the dominant market regime.' },
  { icon: Activity, title: 'EMA Analysis', desc: 'Reads the EMA 9 / EMA 21 stack to confirm directional momentum and stack alignment.' },
  { icon: Gauge, title: 'RSI Analysis', desc: 'Flags overbought/oversold zones and momentum shifts across the 14-period RSI.' },
  { icon: CandlestickChart, title: 'Candlestick Detection', desc: 'Identifies engulfing, pin-bar and rejection patterns at structural levels.' },
  { icon: Layers, title: 'Support & Resistance', desc: 'Maps swing highs and lows into tradable zones with confluence scoring.' },
  { icon: Scale, title: 'Risk to Reward', desc: 'Computes ATR-based stop and target so every setup ships with a real R:R.' },
  { icon: Sparkles, title: 'Confidence Score', desc: 'A 0–100 confidence derived from indicator agreement and setup quality.' },
];

const PLANS = [
  { id: 'free', icon: BarChart3, featured: false },
  { id: 'pro', icon: Zap, featured: true },
  { id: 'elite', icon: Crown, featured: false },
] as const;

export function HomePage() {
  const { user } = useAuth();
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [demoStep, setDemoStep] = useState(-1);
  const [demoResult, setDemoResult] = useState<ReturnType<typeof generateAnalysis> | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const runDemo = async (file: File) => {
    setDemoFile(file);
    setDemoLoading(true);
    setDemoResult(null);
    setDemoStep(0);
    const sig = await imageSignature(file);
    // simulate progressive AI steps for the marketing demo
    for (let i = 0; i < STEPS.length; i++) {
      setDemoStep(i);
      await new Promise((r) => setTimeout(r, 360));
    }
    const res = generateAnalysis({ imageSignature: sig, symbol: 'DEMO', timeframe: 'auto' });
    setDemoResult(res);
    setDemoLoading(false);
  };

  return (
    <div className="min-h-screen">
      <PublicHeader />

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 pt-16 pb-12 md:pt-24 md:pb-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-up">
              <SectionTag>AI Trading Assistant</SectionTag>
              <h1 className="mt-5 font-display text-4xl font-700 leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
                AI Trading<br />Assistant
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-300 sm:text-lg">
                Upload your MT5 chart screenshot and receive AI-powered technical analysis with explanations and a confidence score.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button onClick={() => navigate({ name: user ? 'dashboard' : 'signup' })} className="btn-neon">
                  <UploadIcon /> Upload Screenshot
                </button>
                <button onClick={() => navigate({ name: user ? 'dashboard' : 'signup' })} className="btn-outline">
                  Try it free <ArrowRight size={16} />
                </button>
              </div>
              <div className="mt-7 flex items-center gap-5 text-xs text-ink-400">
                <span className="flex items-center gap-1.5"><Check size={14} className="text-neon-400" /> No credit card</span>
                <span className="flex items-center gap-1.5"><Check size={14} className="text-neon-400" /> 3 free analyses/day</span>
              </div>
            </div>

            {/* Demo upload panel */}
            <div className="animate-fade-up [animation-delay:120ms]">
              <GlassCard className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-ink-400">Live demo</span>
                  {demoResult && (
                    <button onClick={() => { setDemoFile(null); setDemoResult(null); setDemoStep(-1); }} className="text-xs text-ink-400 hover:text-white">
                      Reset
                    </button>
                  )}
                </div>
                {!demoResult ? (
                  <>
                    <Dropzone onFile={runDemo} hint="Drop a chart to see the AI analyze it instantly" />
                    {demoLoading && (
                      <div className="mt-4 space-y-2">
                        {STEPS.map((s, i) => (
                          <div key={s} className={`flex items-center gap-2 text-xs transition-opacity ${i <= demoStep ? 'opacity-100' : 'opacity-30'}`}>
                            {i < demoStep ? <Check size={13} className="text-neon-400" /> : i === demoStep ? <Spinner size={13} /> : <span className="h-3 w-3" />}
                            <span className={i <= demoStep ? 'text-ink-200' : 'text-ink-500'}>{s}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <DemoResult file={demoFile} result={demoResult} />
                )}
              </GlassCard>
              <p className="mt-3 text-center text-[11px] text-ink-500">
                Demo analysis is generated locally — sign up to save analyses to your account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="mx-auto max-w-7xl px-5 py-16">
        <div className="text-center">
          <SectionTag>How it works</SectionTag>
          <h2 className="mt-4 font-display text-3xl font-700 tracking-tight text-white sm:text-4xl">From screenshot to setup in seconds</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { n: '01', t: 'Upload your chart', d: 'Grab a screenshot from MT5, TradingView or any platform and drop it in.' },
            { n: '02', t: 'AI reads the chart', d: 'The engine analyzes trend, EMAs, RSI, candlesticks and key levels.' },
            { n: '03', t: 'Get a full setup', d: 'Receive direction, entry, stop, target, R:R, reasoning and confidence.' },
          ].map((s) => (
            <GlassCard key={s.n} className="p-6" hover>
              <span className="mono text-sm text-neon-400">{s.n}</span>
              <h3 className="mt-3 font-display text-lg font-600 text-white">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-400">{s.d}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-16">
        <div className="text-center">
          <SectionTag>Seven analysis engines</SectionTag>
          <h2 className="mt-4 font-display text-3xl font-700 tracking-tight text-white sm:text-4xl">Everything a manual chart read would do — automated</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-ink-400">
            Each module runs independently and contributes to the final confidence score and trade thesis.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <GlassCard key={f.title} className="p-6" hover>
              <IconBadge icon={f.icon} accent />
              <h3 className="mt-4 font-display text-base font-600 text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{f.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ---------- Pricing ---------- */}
      <section id="pricing" className="mx-auto max-w-7xl px-5 py-16">
        <div className="text-center">
          <SectionTag>Pricing</SectionTag>
          <h2 className="mt-4 font-display text-3xl font-700 tracking-tight text-white sm:text-4xl">Start free. Upgrade when you scale.</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <PriceCard key={p.id} planId={p.id} icon={p.icon} featured={p.featured} />
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-7xl px-5 py-16">
        <GlassCard className="relative overflow-hidden p-10 text-center md:p-14">
          <div className="absolute inset-0 bg-radial-glow opacity-60" />
          <div className="relative">
            <Logo size={44} withText={false} />
            <h2 className="mt-5 font-display text-3xl font-700 tracking-tight text-white sm:text-4xl">
              Stop reading charts manually.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-ink-300">
              Get your first AI analysis in under a minute. No credit card required.
            </p>
            <button onClick={() => navigate({ name: user ? 'dashboard' : 'signup' })} className="btn-neon mt-7">
              {user ? 'Open dashboard' : 'Create free account'} <ArrowRight size={16} />
            </button>
          </div>
        </GlassCard>
      </section>

      <Footer />
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function PriceCard({ planId, icon: Icon, featured }: { planId: 'free' | 'pro' | 'elite'; icon: typeof Zap; featured: boolean }) {
  const { user } = useAuth();
  const plan = {
    free: { label: 'Free', price: '$0', tagline: 'Try the engine', features: ['3 analyses per day', 'Trend + RSI + EMA', 'Confidence score', 'Single chart at a time'] },
    pro: { label: 'Pro', price: '$29', tagline: 'For active traders', features: ['Unlimited analyses', 'All 7 analysis modules', 'Risk-to-reward calculator', 'Priority processing'] },
    elite: { label: 'Elite', price: '$79', tagline: 'Full toolkit', features: ['Unlimited analyses', 'AI Coach (1:1 guidance)', 'Trading Journal', 'Premium features & early access'] },
  }[planId];

  return (
    <GlassCard className={`relative p-7 ${featured ? 'ring-1 ring-neon-500/40 shadow-glow' : ''}`}>
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-neon-400 px-3 py-1 text-[10px] font-700 uppercase tracking-wider text-ink-950">
          Most popular
        </span>
      )}
      <div className="flex items-center gap-3">
        <IconBadge icon={Icon} accent={featured} />
        <div>
          <div className="font-display text-lg font-700 text-white">{plan.label}</div>
          <div className="text-xs text-ink-400">{plan.tagline}</div>
        </div>
      </div>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="font-display text-4xl font-700 text-white">{plan.price}</span>
        <span className="text-sm text-ink-400">/mo</span>
      </div>
      <ul className="mt-6 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-ink-200">
            <Check size={16} className="mt-0.5 shrink-0 text-neon-400" />
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => navigate({ name: user ? 'dashboard' : 'signup' })}
        className={`mt-7 w-full ${featured ? 'btn-neon' : 'btn-outline'}`}
      >
        {planId === 'free' ? 'Start free' : `Choose ${plan.label}`}
      </button>
    </GlassCard>
  );
}

function DemoResult({ file, result }: { file: File | null; result: ReturnType<typeof generateAnalysis> }) {
  return (
    <div className="animate-scale-in space-y-4">
      {file && (
        <div className="relative overflow-hidden rounded-xl">
          <img src={URL.createObjectURL(file)} alt="chart" className="max-h-48 w-full object-cover" />
          <div className="absolute inset-0 scanline opacity-40" />
        </div>
      )}
      <div className="flex items-center gap-4">
        <DirectionBadge direction={result.direction} />
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-400">Confidence</span>
            <span className="mono text-white">{result.confidence}%</span>
          </div>
          <div className="mt-1.5"><ProgressBar value={result.confidence} /></div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Mini label="Entry" value={result.entry.toFixed(4)} />
        <Mini label="Stop" value={result.stop_loss.toFixed(4)} />
        <Mini label="Target" value={result.take_profit.toFixed(4)} />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-neon-500/20 bg-neon-500/[0.06] px-3 py-2">
        <span className="text-xs text-ink-300">Risk : Reward</span>
        <span className="mono text-sm font-600 text-neon-400">{result.risk_reward.toFixed(2)} : 1</span>
      </div>
      <ul className="space-y-1.5">
        {result.reasons.slice(0, 3).map((r, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-ink-300">
            <span className="mono text-neon-400">{i + 1}</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
      <button onClick={() => navigate({ name: 'signup' })} className="btn-outline w-full">
        Get full analyses <ArrowRight size={14} />
      </button>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className="mono mt-0.5 text-sm text-white">{value}</div>
    </div>
  );
}
