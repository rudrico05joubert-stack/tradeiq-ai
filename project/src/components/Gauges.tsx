import { useEffect, useState } from 'react';

interface GaugeProps {
  value: number; // 0..100
  label: string;
  size?: number;
  /** Optional override for the active color; otherwise auto by band. */
  color?: string;
  /** Display unit appended to the numeric readout, e.g. '%' */
  unit?: string;
  /** Sublabel shown under the value, e.g. "Bullish" */
  sublabel?: string;
}

function bandColor(v: number): string {
  if (v >= 70) return '#10e96b';
  if (v >= 45) return '#ffab0a';
  return '#ff4d61';
}

export function RadialGauge({ value, label, size = 132, color, unit = '', sublabel }: GaugeProps) {
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnim(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // 270deg arc gauge — leave a 90deg gap at the bottom
  const arcFraction = 0.75;
  const offset = c - (anim / 100) * (c * arcFraction);
  const col = color ?? bandColor(value);
  const ticks = 11;

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[135deg]">
          {/* track */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke="#16181a" strokeWidth={stroke} fill="none"
            strokeDasharray={`${c * arcFraction} ${c}`}
            strokeLinecap="round"
          />
          {/* value arc */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={col} strokeWidth={stroke} fill="none"
            strokeDasharray={`${c * arcFraction} ${c}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)',
              filter: `drop-shadow(0 0 6px ${col}55)`,
            }}
          />
        </svg>
        {/* tick marks */}
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: ticks }).map((_, i) => {
            const angle = -135 + (i / (ticks - 1)) * 270;
            return (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 h-1 w-px bg-ink-700"
                style={{
                  transform: `rotate(${angle}deg) translateY(-${r + 1}px)`,
                  transformOrigin: '0 0',
                  opacity: i / (ticks - 1) <= anim / 100 ? 0.9 : 0.3,
                }}
              />
            );
          })}
        </div>
        {/* center readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="mono text-2xl font-700" style={{ color: col }}>
            {Math.round(anim)}{unit}
          </span>
          {sublabel && <span className="mt-0.5 text-[9px] uppercase tracking-wider text-ink-400">{sublabel}</span>}
        </div>
      </div>
      <span className="mt-2 text-[11px] font-medium uppercase tracking-wider text-ink-400">{label}</span>
    </div>
  );
}

interface LinearGaugeProps {
  value: number; // 0..100
  label: string;
  /** "low-good" = green when low; "high-good" = green when high; "center" = green near 50 */
  mode?: 'low-good' | 'high-good' | 'center';
  showValue?: boolean;
  caption?: string;
}

export function LinearGauge({ value, label, mode = 'high-good', showValue = true, caption }: LinearGaugeProps) {
  const [anim, setAnim] = useState(0);
  useEffect(() => { requestAnimationFrame(() => setAnim(value)); }, [value]);

  const color =
    mode === 'low-good'
      ? anim >= 65 ? '#ff4d61' : anim >= 40 ? '#ffab0a' : '#10e96b'
      : mode === 'center'
      ? Math.abs(anim - 50) > 22 ? '#ff4d61' : Math.abs(anim - 50) > 12 ? '#ffab0a' : '#10e96b'
      : bandColor(anim);

  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-ink-400">{label}</span>
        {showValue && <span className="mono font-600" style={{ color }}>{Math.round(anim)}/100</span>}
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-800">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${anim}%`, background: color, boxShadow: `0 0 8px ${color}66` }}
        />
      </div>
      {caption && <p className="mt-1.5 text-[11px] text-ink-500">{caption}</p>}
    </div>
  );
}

/** Compact stat tile with an animated number + tiny sparkline bar. */
export function StatTile({
  label, value, unit = '', accent, delta,
}: {
  label: string; value: number | string; unit?: string; accent?: 'bull' | 'bear' | 'neutral'; delta?: string;
}) {
  const color = accent === 'bull' ? 'text-neon-400' : accent === 'bear' ? 'text-bear-400' : 'text-white';
  return (
    <div className="glass-soft p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className="mono mt-1.5 text-xl font-700">
        <span className={color}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
        {unit && <span className="text-xs text-ink-400">{unit}</span>}
      </div>
      {delta && <div className="mt-0.5 text-[11px] text-ink-500">{delta}</div>}
    </div>
  );
}
