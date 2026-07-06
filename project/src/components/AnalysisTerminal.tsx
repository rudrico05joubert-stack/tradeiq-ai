import { useEffect, useRef, useState } from 'react';
import { Check, Activity, ScanLine } from 'lucide-react';
import { STEPS } from '../lib/engine';
import { Logo, Spinner } from './ui';

interface Props {
  symbol: string;
  timeframe: string;
  imageUrl: string | null;
  onComplete: () => void;
  /** total animation duration across all steps, ms */
  duration?: number;
}

const STEP_ICONS = [
  'candle', 'structure', 'sr', 'liquidity', 'ema', 'rsi', 'pattern', 'risk', 'generate',
] as const;

export function AnalysisTerminal({ symbol, timeframe, imageUrl, onComplete, duration = 5200 }: Props) {
  const [active, setActive] = useState(-1);
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    const perStep = duration / STEPS.length;
    let i = 0;
    setActive(0);

    const stepTimer = setInterval(() => {
      i += 1;
      if (i < STEPS.length) {
        setActive(i);
      } else {
        clearInterval(stepTimer);
      }
    }, perStep);

    // smooth progress bar
    const start = Date.now();
    const progTimer = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / duration) * 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(progTimer);
    }, 40);

    const done = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, duration + 250);

    return () => {
      clearInterval(stepTimer);
      clearInterval(progTimer);
      clearTimeout(done);
    };
  }, [duration, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-ink-960/98 backdrop-blur-2xl animate-fade-in">
      {/* ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-neon-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[500px] rounded-full bg-accent-500/5 blur-[120px]" />
      </div>
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />

      {/* scanning beam over the chart thumbnail */}
      {imageUrl && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-[280px] w-[min(560px,80vw)] -translate-x-1/2 -translate-y-[140%] overflow-hidden rounded-2xl opacity-25">
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 scanline" />
        </div>
      )}

      <div className="relative z-10 w-full max-w-xl px-6">
        {/* header */}
        <div className="flex items-center justify-between">
          <Logo size={32} />
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulseDot rounded-full bg-neon-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-500" />
            </span>
            <span className="mono">AI ENGINE · LIVE</span>
          </div>
        </div>

        {/* title */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-neon-500/25 bg-neon-500/[0.06] px-3 py-1 text-[11px] font-medium text-neon-400">
            <ScanLine size={12} /> ANALYZING {symbol} · {timeframe.toUpperCase()}
          </div>
          <h2 className="mt-4 font-display text-2xl font-700 tracking-tight text-white sm:text-3xl">
            Neural analysis in progress
          </h2>
          <p className="mt-1.5 text-sm text-ink-400">
            Running 9 detection modules across your chart — this takes a few seconds.
          </p>
        </div>

        {/* progress bar */}
        <div className="mt-8">
          <div className="flex items-center justify-between text-[11px] text-ink-400">
            <span className="mono">PROGRESS</span>
            <span className="mono text-neon-400">{Math.round(progress)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-neon-500 to-neon-300 transition-all duration-100"
              style={{ width: `${progress}%`, boxShadow: '0 0 12px rgba(16,233,107,0.6)' }}
            />
          </div>
        </div>

        {/* step list */}
        <div className="mt-7 space-y-1.5">
          {STEPS.map((s, i) => {
            const state = i < active ? 'done' : i === active ? 'active' : 'pending';
            return (
              <div
                key={s}
                className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-all duration-300 ${
                  state === 'active'
                    ? 'border-neon-500/40 bg-neon-500/[0.06] shadow-glow'
                    : state === 'done'
                    ? 'border-white/[0.06] bg-white/[0.02]'
                    : 'border-transparent opacity-40'
                }`}
              >
                <StepIcon kind={STEP_ICONS[i]} state={state} />
                <span
                  className={`flex-1 text-sm ${
                    state === 'done' ? 'text-ink-300' : state === 'active' ? 'text-white' : 'text-ink-500'
                  }`}
                >
                  {s}
                </span>
                {state === 'done' && <Check size={15} className="text-neon-400" />}
                {state === 'active' && <Spinner size={14} />}
              </div>
            );
          })}
        </div>

        {/* footer status line */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-ink-500">
          <Activity size={12} className="text-neon-400" />
          <span className="mono">
            {active >= 0 && active < STEPS.length ? STEPS[active] : 'Finalizing…'}
          </span>
        </div>
      </div>
    </div>
  );
}

function StepIcon({ kind, state }: { kind: string; state: 'done' | 'active' | 'pending' }) {
  const color = state === 'active' ? 'text-neon-400' : state === 'done' ? 'text-neon-400/70' : 'text-ink-600';
  const glyph = (() => {
    switch (kind) {
      case 'candle': return '▮▮';
      case 'structure': return '◢◣';
      case 'sr': return '─━';
      case 'liquidity': return '◐';
      case 'ema': return '∿';
      case 'rsi': return '◍';
      case 'pattern': return '◇';
      case 'risk': return '⚠';
      case 'generate': return '✦';
      default: return '•';
    }
  })();
  return (
    <span className={`mono w-5 text-center text-sm ${color}`} style={{ fontFeatureSettings: '"liga"' }}>
      {glyph}
    </span>
  );
}
