import type { Direction, SetupGrade } from '../lib/supabase';

export function DirectionBadge({ direction, size = 'md' }: { direction: Direction; size?: 'sm' | 'md' }) {
  const map = {
    buy: { label: 'BULLISH', cls: 'bg-neon-500/15 text-neon-400 border-neon-500/40' },
    sell: { label: 'BEARISH', cls: 'bg-bear-500/15 text-bear-400 border-bear-500/40' },
    neutral: { label: 'WAIT', cls: 'bg-warn-500/15 text-warn-400 border-warn-500/40' },
  } as const;
  const m = map[direction];
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  return (
    <span className={`chip border font-display font-700 tracking-wider ${m.cls} ${pad}`}>{m.label}</span>
  );
}

const GRADE_STYLES: Record<SetupGrade, { ring: string; text: string; bg: string; glow: string }> = {
  'A+': { ring: 'ring-neon-500/50', text: 'text-neon-300', bg: 'bg-neon-500/10', glow: 'shadow-glow-lg' },
  'A': { ring: 'ring-neon-500/35', text: 'text-neon-400', bg: 'bg-neon-500/[0.07]', glow: 'shadow-glow' },
  'B': { ring: 'ring-warn-500/35', text: 'text-warn-400', bg: 'bg-warn-500/[0.07]', glow: '' },
  'C': { ring: 'ring-bear-500/35', text: 'text-bear-400', bg: 'bg-bear-500/[0.07]', glow: '' },
};

export function GradeBadge({ grade, size = 'md' }: { grade: SetupGrade; size?: 'sm' | 'md' | 'lg' }) {
  const g = GRADE_STYLES[grade];
  const dims = size === 'lg' ? 'h-16 w-16 text-3xl' : size === 'md' ? 'h-12 w-12 text-xl' : 'h-9 w-9 text-sm';
  return (
    <div className={`flex ${dims} items-center justify-center rounded-2xl font-display font-700 ring-1 ${g.ring} ${g.bg} ${g.text} ${g.glow}`}>
      {grade}
    </div>
  );
}

export function ConfidenceRing({ value, size = 96 }: { value: number; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color = value >= 70 ? '#10e96b' : value >= 55 ? '#ffab0a' : '#ff4d61';
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1c1f22" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s ease-out', filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="mono text-2xl font-600" style={{ color }}>{value}</span>
        <span className="text-[9px] uppercase tracking-wider text-ink-400">confidence</span>
      </div>
    </div>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const c = color ?? (value >= 70 ? 'bg-neon-500' : value >= 55 ? 'bg-warn-500' : 'bg-bear-500');
  return (
    <div className="h-1.5 w-full rounded-full bg-ink-700 overflow-hidden">
      <div className={`h-full rounded-full ${c} transition-all duration-700`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function RiskScoreBar({ value }: { value: number }) {
  const color = value >= 65 ? '#ff4d61' : value >= 40 ? '#ffab0a' : '#10e96b';
  const label = value >= 65 ? 'Elevated' : value >= 40 ? 'Moderate' : 'Low';
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-ink-400">Risk score</span>
        <span className="mono" style={{ color }}>{value}/100 · {label}</span>
      </div>
      <div className="mt-1.5 h-2 w-full rounded-full bg-ink-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}
