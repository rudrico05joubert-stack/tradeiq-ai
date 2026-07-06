import { useEffect, useState } from 'react';
import { Eye, Plus, Trash2, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { GlassCard, Spinner } from '../components/ui';
import { DirectionBadge } from '../components/Analysis';
import { fetchWatchlist, insertWatchlist, deleteWatchlist } from '../lib/api';
import type { WatchlistItem } from '../lib/supabase';
import type { Direction } from '../lib/supabase';
import { fmtPrice, fmtTimeAgo } from '../lib/format';

export function WatchlistView() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => { if (user) fetchWatchlist(user.id).then(setItems).catch(() => setItems([])); };
  useEffect(load, [user]);

  if (!items) return <div className="flex justify-center py-20"><Spinner size={24} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-400">{items.length} symbols on your watchlist</p>
        <button onClick={() => setShowForm(true)} className="btn-neon"><Plus size={16} /> Add symbol</button>
      </div>
      {items.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <Eye size={32} className="mx-auto text-ink-500" />
          <p className="mt-4 font-display text-base font-600 text-white">Watchlist is empty</p>
          <p className="mt-1 text-sm text-ink-400">Track symbols you want to analyze or monitor for setups.</p>
          <button onClick={() => setShowForm(true)} className="btn-neon mt-5"><Plus size={14} /> Add your first symbol</button>
        </GlassCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((w) => (
            <GlassCard key={w.id} className="p-4" hover>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="mono text-base font-700 text-white">{w.symbol}</span>
                    <DirectionBadge direction={w.direction} size="sm" />
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-400">Added {fmtTimeAgo(w.created_at)}</div>
                </div>
                <button onClick={async () => { await deleteWatchlist(w.id); load(); }} className="rounded-md p-1.5 text-ink-400 hover:bg-white/[0.05] hover:text-bear-400"><Trash2 size={14} /></button>
              </div>
              {(w.target_price ?? w.alert_above ?? w.alert_below) != null && (
                <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
                  {w.target_price != null && <Tag label="Target" value={fmtPrice(w.target_price)} accent="bull" />}
                  {w.alert_above != null && <Tag label="Alert >" value={fmtPrice(w.alert_above)} />}
                  {w.alert_below != null && <Tag label="Alert <" value={fmtPrice(w.alert_below)} />}
                </div>
              )}
              {w.notes && <p className="mt-3 text-xs leading-relaxed text-ink-300">{w.notes}</p>}
            </GlassCard>
          ))}
        </div>
      )}
      {showForm && user && (
        <WatchlistForm userId={user.id} onClose={() => setShowForm(false)} onSaved={load} onError={setError} />
      )}
      {error && <p className="text-xs text-bear-400 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
    </div>
  );
}

function Tag({ label, value, accent }: { label: string; value: string; accent?: 'bull' }) {
  return (
    <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1">
      <span className="text-ink-400">{label} </span>
      <span className={`mono ${accent === 'bull' ? 'text-neon-400' : 'text-ink-200'}`}>{value}</span>
    </span>
  );
}

function WatchlistForm({ userId, onClose, onSaved, onError }: {
  userId: string; onClose: () => void; onSaved: () => void; onError: (m: string) => void;
}) {
  const [form, setForm] = useState({
    symbol: '', direction: 'neutral' as Direction, target_price: '',
    alert_above: '', alert_below: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.symbol.trim()) { onError('Symbol is required.'); return; }
    setSaving(true);
    try {
      await insertWatchlist({
        user_id: userId, symbol: form.symbol.toUpperCase(), direction: form.direction,
        target_price: form.target_price ? Number(form.target_price) : null,
        alert_above: form.alert_above ? Number(form.alert_above) : null,
        alert_below: form.alert_below ? Number(form.alert_below) : null,
        notes: form.notes,
      });
      onSaved(); onClose();
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Failed to add symbol';
      onError(m.includes('duplicate') || m.includes('unique') ? 'This symbol is already on your watchlist.' : m);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md glass p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-600 text-white">Add to watchlist</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Symbol *"><input className="input mono" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} placeholder="EURUSD" /></Field>
          <Field label="Direction bias"><select className="input" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as Direction })}><option value="neutral">Neutral</option><option value="buy">Bullish</option><option value="sell">Bearish</option></select></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Target"><input className="input mono" value={form.target_price} onChange={(e) => setForm({ ...form, target_price: e.target.value })} /></Field>
            <Field label="Alert >"><input className="input mono" value={form.alert_above} onChange={(e) => setForm({ ...form, alert_above: e.target.value })} /></Field>
            <Field label="Alert <"><input className="input mono" value={form.alert_below} onChange={(e) => setForm({ ...form, alert_below: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Why you're watching this…" /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-neon">{saving ? <Spinner /> : 'Add symbol'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="field-label">{label}</label>{children}</div>;
}
