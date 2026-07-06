import { useState } from 'react';
import { Repeat, Play, Pause, SkipForward, SkipBack, Rewind } from 'lucide-react';
import { GlassCard } from '../components/ui';
import { useAuth } from '../lib/auth';
import { fetchRecentAnalyses } from '../lib/api';
import { useEffect } from 'react';
import type { ChartAnalysis } from '../lib/api';
import { fmtDateTime } from '../lib/format';

/**
 * Market Replay lets the user step through their past analyses in sequence —
 * a "review mode" for revisiting how setups evolved. Educational framing only.
 */
export function ReplayView() {
  const { user } = useAuth();
  const [items, setItems] = useState<ChartAnalysis[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (user) fetchRecentAnalyses(user.id, 50).then((a) => { setItems(a); setIdx(0); }).catch(() => setItems([]));
  }, [user]);

  // auto-advance when playing
  useEffect(() => {
    if (!playing || items.length === 0) return;
    const id = setInterval(() => {
      setIdx((i) => {
        if (i >= items.length - 1) { setPlaying(false); return i; }
        return i + 1;
      });
    }, 2200);
    return () => clearInterval(id);
  }, [playing, items.length]);

  const current = items[idx];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <GlassCard className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-500/10 text-neon-400 ring-1 ring-neon-500/30"><Repeat size={20} /></div>
          <div>
            <h2 className="font-display text-lg font-600 text-white">Market Replay</h2>
            <p className="text-xs text-ink-400">Step back through your past analyses to study how setups developed. Educational review tool.</p>
          </div>
        </div>
      </GlassCard>

      {items.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <Repeat size={32} className="mx-auto text-ink-500" />
          <p className="mt-4 font-display text-base font-600 text-white">Nothing to replay yet</p>
          <p className="mt-1 text-sm text-ink-400">Run a few analyses and come back to review them in sequence.</p>
        </GlassCard>
      ) : (
        <>
          <GlassCard className="overflow-hidden p-0">
            {current?.image_url ? (
              <img src={current.image_url} alt={current.symbol} className="w-full max-h-[440px] object-contain bg-ink-900" />
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-ink-500">No image</div>
            )}
          </GlassCard>

          {/* transport controls */}
          <GlassCard className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-ink-400">
                <span className="mono text-ink-200">{idx + 1}</span> / {items.length}
                {current && <span className="ml-3 mono">{current.symbol} · {fmtDateTime(current.created_at)}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIdx(0)} className="btn-ghost p-2" aria-label="Restart"><Rewind size={16} /></button>
                <button onClick={() => setIdx((i) => Math.max(0, i - 1))} className="btn-ghost p-2" aria-label="Previous"><SkipBack size={16} /></button>
                <button onClick={() => setPlaying((p) => !p)} className="btn-neon p-2.5" aria-label={playing ? 'Pause' : 'Play'}>
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button onClick={() => setIdx((i) => Math.min(items.length - 1, i + 1))} className="btn-ghost p-2" aria-label="Next"><SkipForward size={16} /></button>
              </div>
            </div>
            {/* scrubber */}
            <div className="mt-3 h-1.5 w-full rounded-full bg-ink-800 overflow-hidden">
              <div className="h-full rounded-full bg-neon-500 transition-all duration-300" style={{ width: `${((idx + 1) / items.length) * 100}%` }} />
            </div>
          </GlassCard>

          {current && (
            <GlassCard className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="mono text-lg font-700 text-white">{current.symbol}</span>
                <span className={`chip border ${current.direction === 'buy' ? 'bg-neon-500/15 text-neon-400 border-neon-500/30' : current.direction === 'sell' ? 'bg-bear-500/15 text-bear-400 border-bear-500/30' : 'bg-warn-500/15 text-warn-400 border-warn-500/30'}`}>{current.direction.toUpperCase()}</span>
                {current.setup_grade && <span className="mono rounded bg-neon-500/10 px-1.5 py-0.5 text-xs font-700 text-neon-400 ring-1 ring-neon-500/30">{current.setup_grade}</span>}
                <span className="ml-auto text-xs text-ink-400">Confidence <span className="mono text-ink-200">{current.confidence}%</span></span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">{current.market_trend}</p>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}
