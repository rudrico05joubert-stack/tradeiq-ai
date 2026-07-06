import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Sparkles, BookOpen, Repeat, Brain, Eye, History, Settings as SettingsIcon,
  LogOut, Menu, X, Crown, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { navigate } from '../lib/router';
import { Logo, Spinner } from '../components/ui';
import { getUsageRemaining } from '../lib/api';

export type View = 'dashboard' | 'new' | 'journal' | 'replay' | 'coach' | 'watchlist' | 'history' | 'settings';

export const NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'new', label: 'New Analysis', icon: Sparkles },
  { id: 'journal', label: 'Trading Journal', icon: BookOpen },
  { id: 'replay', label: 'Market Replay', icon: Repeat },
  { id: 'coach', label: 'AI Coach', icon: Brain },
  { id: 'watchlist', label: 'Watchlist', icon: Eye },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function TradingOS({ view, setView }: { view: View; setView: (v: View) => void }) {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ name: 'login' }); }, [loading, user]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner size={28} /></div>;
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[248px] transform border-r border-white/[0.06] bg-ink-900/95 backdrop-blur-xl transition-transform md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-4">
            <button onClick={() => navigate({ name: 'home' })}><Logo /></button>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-ink-400"><X size={18} /></button>
          </div>
          <nav className="flex-1 space-y-0.5 px-2.5 py-2">
            {NAV.map((t) => {
              const Icon = t.icon;
              const active = view === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setView(t.id); setSidebarOpen(false); }}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${active ? 'bg-neon-500/[0.08] text-white ring-1 ring-neon-500/25' : 'text-ink-300 hover:bg-white/[0.04] hover:text-white'}`}
                >
                  <Icon size={16} className={active ? 'text-neon-400' : 'text-ink-400 group-hover:text-ink-200'} />
                  {t.label}
                  {active && <ChevronRight size={14} className="ml-auto text-neon-400" />}
                </button>
              );
            })}
          </nav>
          <div className="p-3">
            <div className="glass-soft p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-ink-400">Plan</span>
                <span className="chip bg-neon-500/10 text-neon-400 border border-neon-500/30 capitalize">{profile?.plan ?? 'free'}</span>
              </div>
              {(profile?.plan ?? 'free') === 'free' && (
                <button onClick={() => setView('settings')} className="mt-2.5 w-full btn-outline text-xs py-2">
                  <Crown size={13} /> Upgrade
                </button>
              )}
            </div>
            <button onClick={signOut} className="mt-2.5 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-ink-300 hover:bg-white/[0.04] hover:text-white">
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/60 md:hidden" />}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden text-ink-200"><Menu size={20} /></button>
              <div>
                <h1 className="font-display text-base font-600 text-white">{NAV.find((t) => t.id === view)?.label}</h1>
                <p className="text-[11px] text-ink-400">TradeIQ AI · Trading Operating System</p>
              </div>
            </div>
            <UsagePill />
          </div>
        </header>

        <main className="px-5 py-6 pb-24 md:pb-10">
          {view === 'dashboard' && <DashboardView setView={setView} />}
          {view === 'new' && <NewAnalysisView refreshProfile={refreshProfile} />}
          {view === 'journal' && <JournalView />}
          {view === 'replay' && <ReplayView />}
          {view === 'coach' && <CoachView />}
          {view === 'watchlist' && <WatchlistView />}
          {view === 'history' && <HistoryView />}
          {view === 'settings' && <SettingsView refreshProfile={refreshProfile} />}
        </main>
      </div>
    </div>
  );
}

function UsagePill() {
  const { profile } = useAuth();
  const [info, setInfo] = useState<{ remaining: number; limit: number } | null>(null);
  useEffect(() => { if (profile) getUsageRemaining(profile).then((i) => setInfo({ remaining: i.remaining, limit: i.limit })); }, [profile]);
  if (!info || !profile) return null;
  if (info.limit === Infinity) return <span className="chip bg-neon-500/10 text-neon-400 border border-neon-500/30"><Sparkles size={12} /> Unlimited</span>;
  return (
    <span className={`chip border ${info.remaining > 0 ? 'bg-white/[0.04] text-ink-200 border-white/10' : 'bg-bear-500/10 text-bear-400 border-bear-500/30'}`}>
      {info.remaining > 0 ? `${info.remaining}/${info.limit} left today` : 'Limit reached'}
    </span>
  );
}

// ---- view stubs (lazy-loaded implementations below) ----
import { DashboardView } from '../views/DashboardView';
import { NewAnalysisView } from '../views/NewAnalysisView';
import { JournalView } from '../views/JournalView';
import { ReplayView } from '../views/ReplayView';
import { CoachView } from '../views/CoachView';
import { WatchlistView } from '../views/WatchlistView';
import { HistoryView } from '../views/HistoryView';
import { SettingsView } from '../views/SettingsView';
