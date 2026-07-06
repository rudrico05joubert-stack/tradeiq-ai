import { useState } from 'react';
import { Crown, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { GlassCard, Spinner } from '../components/ui';
import { updateProfile, upgradePlan } from '../lib/api';
import type { Plan } from '../lib/supabase';
import { PLAN_FEATURES } from '../lib/supabase';

export function SettingsView({ refreshProfile }: { refreshProfile: () => Promise<void> }) {
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);
  const [planBusy, setPlanBusy] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveName = async () => {
    if (!user) return;
    setSavingName(true); setError(null);
    try { await updateProfile(user.id, { display_name: name }); await refreshProfile(); setSavedName(true); setTimeout(() => setSavedName(false), 1800); }
    catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSavingName(false); }
  };

  const changePlan = async (plan: Plan) => {
    if (!user || plan === profile?.plan) return;
    setPlanBusy(plan); setError(null);
    try { await upgradePlan(user.id, plan); await refreshProfile(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Plan change failed'); }
    finally { setPlanBusy(null); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {error && <div className="flex items-center gap-2 rounded-lg border border-bear-500/30 bg-bear-500/10 px-3 py-2 text-xs text-bear-400"><AlertCircle size={14} /> {error}</div>}
      <GlassCard className="p-6">
        <h2 className="font-display text-lg font-600 text-white">Profile</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Display name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email"><input className="input opacity-60" value={user?.email ?? ''} disabled /></Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={saveName} disabled={savingName} className="btn-neon">{savingName ? <Spinner /> : 'Save changes'}</button>
          {savedName && <span className="text-xs text-neon-400 flex items-center gap-1"><Check size={13} /> Saved</span>}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center gap-2">
          <Crown size={18} className="text-neon-400" />
          <h2 className="font-display text-lg font-600 text-white">Subscription</h2>
        </div>
        <p className="mt-1 text-xs text-ink-400">Current plan: <span className="capitalize text-ink-200">{profile?.plan}</span></p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(['free', 'pro', 'elite'] as Plan[]).map((p) => {
            const f = PLAN_FEATURES[p];
            const current = profile?.plan === p;
            return (
              <div key={p} className={`rounded-xl border p-4 ${current ? 'border-neon-500/40 bg-neon-500/[0.05]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-display font-600 text-white">{f.label}</span>
                  {current && <span className="chip bg-neon-500/15 text-neon-400 border border-neon-500/30 text-[10px]">Current</span>}
                </div>
                <div className="mono mt-1 text-lg text-white">{f.price}<span className="text-xs text-ink-400">/mo</span></div>
                <ul className="mt-3 space-y-1.5">
                  {f.features.slice(0, 3).map((feat) => <li key={feat} className="flex items-start gap-1.5 text-[11px] text-ink-300"><Check size={12} className="mt-0.5 text-neon-400" /> {feat}</li>)}
                </ul>
                {!current && <button onClick={() => changePlan(p)} disabled={planBusy !== null} className="mt-3 w-full btn-outline text-xs py-2">{planBusy === p ? <Spinner size={13} /> : `Switch to ${f.label}`}</button>}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-ink-500">Demo billing — no payment is processed.</p>
      </GlassCard>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="field-label">{label}</label>{children}</div>;
}
