import { useEffect, useRef, useState } from 'react';
import type { ChartOverlays, Direction } from '../lib/supabase';

interface Props {
  imageUrl: string;
  overlays: ChartOverlays | null;
  direction: Direction;
  entry?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
}

type ToggleKey = 'sr' | 'ema' | 'liquidity' | 'patterns' | 'entry' | 'stopLoss' | 'takeProfit';

const TOGGLES: { key: ToggleKey; label: string; color: string }[] = [
  { key: 'sr', label: 'Support & Resistance', color: '#10e96b' },
  { key: 'ema', label: 'EMA 50 / 200', color: '#60a5fa' },
  { key: 'liquidity', label: 'Liquidity Zones', color: '#a855f7' },
  { key: 'patterns', label: 'Chart Patterns', color: '#10e96b' },
  { key: 'entry', label: 'Entry Zone', color: '#10e96b' },
  { key: 'stopLoss', label: 'Stop Loss', color: '#ff4d61' },
  { key: 'takeProfit', label: 'Take Profit', color: '#10e96b' },
];

export function ChartOverlay({ imageUrl, overlays, direction, entry, stopLoss, takeProfit }: Props) {
  const [on, setOn] = useState<Record<ToggleKey, boolean>>({
    sr: true, ema: true, liquidity: true, patterns: true, entry: true, stopLoss: true, takeProfit: true,
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      if (ref.current) {
        const r = ref.current.getBoundingClientRect();
        // force a re-render cycle is unnecessary; we use viewBox so size is responsive
        void r;
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const toggle = (k: ToggleKey) => setOn((s) => ({ ...s, [k]: !s[k] }));
  const W = 1000, H = 600;

  return (
    <div className="glass overflow-hidden rounded-2xl">
      {/* toggle bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5">
        <span className="mr-2 text-[11px] font-medium uppercase tracking-wider text-ink-400">Overlays</span>
        {TOGGLES.map((t) => (
          <button
            key={t.key}
            onClick={() => toggle(t.key)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
              on[t.key] ? 'bg-white/[0.06] text-ink-100 ring-1 ring-white/10' : 'text-ink-500 hover:bg-white/[0.03]'
            }`}
          >
            <span className="h-2 w-2 rounded-sm" style={{ background: on[t.key] ? t.color : '#3a3f44' }} />
            {t.label}
          </button>
        ))}
      </div>

      <div ref={ref} className="relative w-full bg-ink-900">
        <img src={imageUrl} alt="chart" className="block w-full" />
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
          {/* EMA */}
          {on.ema && overlays?.ema50 && (
            <polyline points={overlays.ema50.map((p) => `${p.x * W},${p.y * H}`).join(' ')} fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
          )}
          {on.ema && overlays?.ema200 && (
            <polyline points={overlays.ema200.map((p) => `${p.x * W},${p.y * H}`).join(' ')} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
          )}

          {/* Support / Resistance */}
          {on.sr && overlays?.support.map((p, i) => (
            <g key={`s${i}`}>
              <line x1={p.x * W - 70} x2={p.x * W + 70} y1={p.y * H} y2={p.y * H} stroke="#10e96b" strokeWidth={p.strength === 'strong' ? 2.5 : 1.5} strokeDasharray={p.strength === 'strong' ? '0' : '5 4'} opacity={0.75} />
              <text x={p.x * W + 76} y={p.y * H + 4} fill="#10e96b" fontSize={12} className="mono">S</text>
            </g>
          ))}
          {on.sr && overlays?.resistance.map((p, i) => (
            <g key={`r${i}`}>
              <line x1={p.x * W - 70} x2={p.x * W + 70} y1={p.y * H} y2={p.y * H} stroke="#ff4d61" strokeWidth={p.strength === 'strong' ? 2.5 : 1.5} strokeDasharray={p.strength === 'strong' ? '0' : '5 4'} opacity={0.75} />
              <text x={p.x * W + 76} y={p.y * H + 4} fill="#ff4d61" fontSize={12} className="mono">R</text>
            </g>
          ))}

          {/* Liquidity */}
          {on.liquidity && overlays?.liquidity.map((p, i) => (
            <g key={`l${i}`}>
              <rect x={p.x * W - 26} y={p.y * H - 5} width={52} height={10} rx={2} fill={p.type === 'buyside' ? '#10e96b' : '#ff4d61'} opacity={0.22} />
              <circle cx={p.x * W} cy={p.y * H} r={3.5} fill={p.type === 'buyside' ? '#10e96b' : '#ff4d61'} opacity={0.9} />
            </g>
          ))}

          {/* Patterns */}
          {on.patterns && overlays?.patterns.map((p, i) => (
            <g key={`p${i}`}>
              <rect x={p.x * W - 32} y={p.y * H - 15} width={64} height={30} rx={6} fill="rgba(16,233,107,0.08)" stroke="#10e96b" strokeWidth={1} strokeDasharray="2 3" />
              <text x={p.x * W} y={p.y * H + 4} fill="#10e96b" fontSize={10} textAnchor="middle" className="mono">{p.label.length > 12 ? p.label.slice(0, 11) + '…' : p.label}</text>
            </g>
          ))}

          {/* Entry zone */}
          {on.entry && overlays?.entryZone && (
            <g>
              <rect x={overlays.entryZone.x1 * W} y={overlays.entryZone.y1 * H} width={(overlays.entryZone.x2 - overlays.entryZone.x1) * W} height={(overlays.entryZone.y2 - overlays.entryZone.y1) * H} fill="rgba(16,233,107,0.18)" stroke="#10e96b" strokeWidth={1} strokeDasharray="3 3" rx={4} />
              <text x={(overlays.entryZone.x1 + overlays.entryZone.x2) / 2 * W} y={overlays.entryZone.y1 * H - 6} fill="#10e96b" fontSize={11} textAnchor="middle" className="mono">ENTRY</text>
            </g>
          )}
          {/* Stop loss */}
          {on.stopLoss && overlays?.stopLoss && (
            <g>
              <line x1={overlays.stopLoss.x * W - 44} x2={overlays.stopLoss.x * W + 44} y1={overlays.stopLoss.y * H} y2={overlays.stopLoss.y * H} stroke="#ff4d61" strokeWidth={2.5} />
              <text x={overlays.stopLoss.x * W} y={overlays.stopLoss.y * H + 18} fill="#ff4d61" fontSize={11} textAnchor="middle" className="mono">SL</text>
            </g>
          )}
          {/* Take profit */}
          {on.takeProfit && overlays?.takeProfit && (
            <g>
              <line x1={overlays.takeProfit.x * W - 44} x2={overlays.takeProfit.x * W + 44} y1={overlays.takeProfit.y * H} y2={overlays.takeProfit.y * H} stroke="#10e96b" strokeWidth={2.5} />
              <text x={overlays.takeProfit.x * W} y={overlays.takeProfit.y * H - 8} fill="#10e96b" fontSize={11} textAnchor="middle" className="mono">TP</text>
            </g>
          )}
        </svg>
      </div>

      {/* legend + live readout */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] px-4 py-3 text-[11px]">
        <Legend color="#10e96b" label="Support" />
        <Legend color="#ff4d61" label="Resistance" />
        <Legend color="#60a5fa" label="EMA 50" />
        <Legend color="#f59e0b" label="EMA 200" />
        {(entry ?? stopLoss ?? takeProfit) != null && (
          <div className="ml-auto flex gap-3 mono text-ink-400">
            {entry != null && <span>E <span className="text-white">{entry}</span></span>}
            {stopLoss != null && <span>SL <span className="text-bear-400">{stopLoss}</span></span>}
            {takeProfit != null && <span>TP <span className="text-neon-400">{takeProfit}</span></span>}
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-ink-300">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
