import { TrendingUp, type LucideIcon } from 'lucide-react';

export function Logo({ size = 34, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative flex items-center justify-center rounded-xl bg-ink-950 ring-1 ring-neon-500/40 shadow-glow"
        style={{ width: size, height: size }}
      >
        <TrendingUp className="text-neon-400" size={size * 0.55} strokeWidth={2.6} />
        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-neon-400 animate-pulseDot" />
      </div>
      {withText && (
        <div className="leading-tight">
          <div className="font-display text-[15px] font-700 tracking-tight text-white">
            NEXORA<span className="text-neon-400"> AI</span>
          </div>
          <div className="text-[9px] uppercase tracking-[0.22em] text-ink-400">AI Trading Assistant</div>
        </div>
      )}
    </div>
  );
}

export function IconBadge({ icon: Icon, accent = false }: { icon: LucideIcon; accent?: boolean }) {
  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-xl ${
        accent ? 'bg-neon-500/10 text-neon-400 ring-1 ring-neon-500/30' : 'bg-white/[0.04] text-ink-100 ring-1 ring-white/[0.06]'
      }`}
    >
      <Icon size={20} strokeWidth={2} />
    </div>
  );
}

export function GlassCard({ className = '', children, hover = false }: { className?: string; children: React.ReactNode; hover?: boolean }) {
  return <div className={`${hover ? 'glass-hover' : 'glass'} ${className}`}>{children}</div>;
}

export function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-neon-500/25 bg-neon-500/[0.06] px-3 py-1 text-xs font-medium text-neon-400">
      <span className="h-1.5 w-1.5 rounded-full bg-neon-400 animate-pulseDot" />
      {children}
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
