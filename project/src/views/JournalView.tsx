import { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, Settings as SettingsIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { GlassCard, Spinner } from '../components/ui';
import { DirectionBadge } from '../components/Analysis';
import { fetchJournal, insertJournal, deleteJournal, updateJournal } from '../lib/api';
import type { JournalEntry, Outcome } from '../lib/api';
import type { Direction } from '../lib/supabase';
import { fmtPrice, fmtRR, fmtPct } from '../lib/format';

export function JournalView() {
  const { user } = useAuth();
  const [items, setItems] = useState<JournalEntry[] | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => { if (user) fetchJournal(user.id).then(setItems).catch(() => setItems([])); };
  useEffect(load, [user]);

  if (!items) return <div className="flex justify-center py-20"><Spinner size={24} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-400">{items.length} {items.length === 1 ? 'entry' : 'entries'}</p>
        <button onClick={() => setShowForm(true)} className="btn-neon"><Plus size={16} /> New entry</button>
      </div>
      {items.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <BookOpen size={32} className="mx-auto text-ink-500" />
          <p className="mt-4 font-display text-base font-600 text-white">Journal is empty</p>
          <p className="mt-1 text-sm text-ink-400">Log your trades to track win rate and accuracy over time.</p>
          <button onClick={() => setShowForm(true)} className="btn-neon mt-5"><Plus size={14} /> Add first entry</button>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {items.map((j) => <JournalRow key={j.id} j={j} onChanged={load} />)}
        </div>
      )}
      {showForm && user && <JournalForm userId={user.id} onClose={() => setShowForm(false)} onSaved={load} />}
    </div>
  );
}

const outcomeCls: Record<Outcome, string> = {
  win: 'bg-neon-500/15 text-neon-400 border-neon-500/30',
  loss: 'bg-bear-500/15 text-bear-400 border-bear-500/30',
  breakeven: 'bg-warn-500/15 text-warn-400 border-warn-500/30',
  pending: 'bg-white/[0.05] text-ink-300 border-white/10',
};

function JournalRow({ j, onChanged }: { j: JournalEntry; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <JournalForm userId={j.user_id} entry={j} onClose={() => setEditing(false)} onSaved={onChanged} />;
  return (
    <GlassCard className="p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="mono text-sm font-600 text-white">{j.symbol || '—'}</span>
          <DirectionBadge direction={j.direction} size="sm" />
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-400">
          <span>Entry <span className="mono text-ink-200">{fmtPrice(j.entry)}</span></span>
          <span>Exit <span className="mono text-ink-200">{fmtPrice(j.exit_price)}</span></span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`chip border capitalize ${outcomeCls[j.outcome]}`}>{j.outcome}</span>
          {j.pnl != null && <span className={`mono text-sm font-600 ${j.pnl >= 0 ? 'text-neon-400' : 'text-bear-400'}`}>{fmtPct(j.pnl)}</span>}
          <button onClick={() => setEditing(true)} className="rounded-md p-1.5 text-ink-400 hover:bg-white/[0.05] hover:text-white"><SettingsIcon size={14} /></button>
          <button onClick={async () => { await deleteJournal(j.id); onChanged(); }} className="rounded-md p-1.5 text-ink-400 hover:bg-white/[0.05] hover:text-bear-400"><Trash2 size={14} /></button>
        </div>
      </div>
    </GlassCard>
  );
}

function JournalForm({ userId, entry, onClose, onSaved }: {
  userId: string; entry?: JournalEntry; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    symbol: entry?.symbol ?? '',
    direction: (entry?.direction ?? 'buy') as Direction,
    entry: entry?.entry?.toString() ?? '',
    exit_price: entry?.exit_price?.toString() ?? '',
    stop_loss: entry?.stop_loss?.toString() ?? '',
    take_profit: entry?.take_profit?.toString() ?? '',
    outcome: (entry?.outcome ?? 'pending') as Outcome,
    pnl: entry?.pnl?.toString() ?? '',
    notes: entry?.notes ?? '',
    executed_at: (entry?.executed_at ?? new Date().toISOString()).slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      const payload = {
        user_id: userId, symbol: form.symbol.toUpperCase(), direction: form.direction,
        entry: form.entry ? Number(form.entry) : null,
        exit_price: form.exit_price ? Number(form.exit_price) : null,
        stop_loss: form.stop_loss ? Number(form.stop_loss) : null,
        take_profit: form.take_profit ? Number(form.take_profit) : null,
        outcome: form.outcome, pnl: form.pnl ? Number(form.pnl) : null,
        notes: form.notes, executed_at: new Date(form.executed_at).toISOString(),
      };
      if (entry) await updateJournal(entry.id, payload); else await insertJournal(payload);
      onSaved(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3 rounded-xl border border-neon-500/20 bg-neon-500/[0.03] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Symbol"><input className="input" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="EURUSD" /></Field>
        <Field label="Direction"><select className="input" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as Direction })}><option value="buy">Buy</option><option value="sell">Sell</option><option value="neutral">Neutral</option></select></Field>
        <Field label="Entry"><input className="input mono" value={form.entry} onChange={(e) => setForm({ ...form, entry: e.target.value })} placeholder="1.0850" /></Field>
        <Field label="Exit"><input className="input mono" value={form.exit_price} onChange={(e) => setForm({ ...form, exit_price: e.target.value })} placeholder="1.0920" /></Field>
        <Field label="Stop loss"><input className="input mono" value={form.stop_loss} onChange={(e) => setForm({ ...form, stop_loss: e.target.value })} /></Field>
        <Field label="Take profit"><input className="input mono" value={form.take_profit} onChange={(e) => setForm({ ...form, take_profit: e.target.value })} /></Field>
        <Field label="Outcome"><select className="input" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value as Outcome })}><option value="pending">Pending</option><option value="win">Win</option><option value="loss">Loss</option><option value="breakeven">Breakeven</option></select></Field>
        <Field label="P&L (%)"><input className="input mono" value={form.pnl} onChange={(e) => setForm({ ...form, pnl: e.target.value })} placeholder="2.4" /></Field>
        <Field label="Date"><input type="date" className="input" value={form.executed_at} onChange={(e) => setForm({ ...form, executed_at: e.target.value })} /></Field>
      </div>
      <Field label="Notes"><textarea className="input min-h-[72px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Setup, emotions, lessons…" /></Field>
      {error && <p className="text-xs text-bear-400 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={submit} disabled={saving} className="btn-neon">{saving ? <Spinner /> : entry ? 'Save changes' : 'Add entry'}</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="field-label">{label}</label>{children}</div>;
}
