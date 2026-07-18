import { useState } from 'react';
import { Logo } from './ui';
import { navigate } from '../lib/router';
import { useAuth } from '../lib/auth';

export function PublicHeader() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
        <button onClick={() => navigate({ name: 'home' })} className="transition-opacity hover:opacity-80">
          <Logo />
        </button>
        <nav className="hidden items-center gap-7 md:flex">
          <a href="#features" className="text-sm text-ink-300 transition-colors hover:text-white">Features</a>
          <a href="#pricing" className="text-sm text-ink-300 transition-colors hover:text-white">Pricing</a>
          <a href="#how" className="text-sm text-ink-300 transition-colors hover:text-white">How it works</a>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <button onClick={() => navigate({ name: 'dashboard' })} className="btn-neon">Dashboard</button>
          ) : (
            <>
              <button onClick={() => navigate({ name: 'login' })} className="btn-ghost">Log in</button>
              <button onClick={() => navigate({ name: 'signup' })} className="btn-neon">Get started</button>
            </>
          )}
        </div>
        <button onClick={() => setOpen((v) => !v)} className="md:hidden text-ink-200" aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-white/[0.06] bg-ink-900/95 px-5 py-4">
          <div className="flex flex-col gap-3">
            <a href="#features" onClick={() => setOpen(false)} className="text-sm text-ink-200">Features</a>
            <a href="#pricing" onClick={() => setOpen(false)} className="text-sm text-ink-200">Pricing</a>
            <a href="#how" onClick={() => setOpen(false)} className="text-sm text-ink-200">How it works</a>
            <div className="mt-2 flex gap-2">
              {user ? (
                <button onClick={() => { setOpen(false); navigate({ name: 'dashboard' }); }} className="btn-neon w-full">Dashboard</button>
              ) : (
                <>
                  <button onClick={() => { setOpen(false); navigate({ name: 'login' }); }} className="btn-outline flex-1">Log in</button>
                  <button onClick={() => { setOpen(false); navigate({ name: 'signup' }); }} className="btn-neon flex-1">Get started</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-ink-950">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-10 md:flex-row md:items-center">
        <div>
          <Logo />
          <p className="mt-3 max-w-md text-xs leading-relaxed text-ink-400">
            NEXORA AI provides AI-generated technical analysis for educational purposes only and is not financial advice.
            Trading involves substantial risk. Past performance does not guarantee future results.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-ink-400">
          <span>© {new Date().getFullYear()} NEXORA AI</span>
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
          <a href="#" className="hover:text-white">Terms</a>
          <a href="#" className="hover:text-white">Privacy</a>
        </div>
      </div>
    </footer>
  );
}
