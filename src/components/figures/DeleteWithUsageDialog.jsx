import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';

const NOUN = { deck: 'slide', doc: 'section' };

/**
 * Confirms deleting something (a figure, a document) that decks or documents may use.
 * Not in use: one confirmation. In use: lists where, offers the safe alternative (e.g. "Hide instead"), and
 * the delete button stays disabled until the user ticks that they understand what changes.
 */
export default function DeleteWithUsageDialog({ title, what, plural = false, usage, consequence, safeLabel, onSafe, onDelete, onCancel }) {
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inUse = usage.length > 0;

  async function run(action) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={busy ? undefined : onCancel}>
      <div className="bg-white rounded-lg w-[520px] max-w-[95vw] p-5 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}
        role="alertdialog" aria-modal="true" aria-label={title}>
        <h2 className="font-heading text-[18px] font-semibold m-0 flex items-center gap-2">
          {inUse && <AlertTriangle size={18} className="text-amber-600" />}{title}
        </h2>
        {inUse ? (
          <>
            <p className="m-0 text-[14px]">{what} {plural ? 'are' : 'is'} used in {usage.length} place{usage.length === 1 ? '' : 's'}:</p>
            <ul className="m-0 pl-5 text-[14px] flex flex-col gap-1 max-h-[180px] overflow-y-auto">
              {usage.map((u, i) => (
                <li key={i}>
                  <Link to={`/create/${u.type}/${u.generation_id}/review`} className="text-cobalt">{u.name}</Link>
                  <span className="text-slate">, {NOUN[u.type] || 'item'} {u.index + 1}</span>
                </li>
              ))}
            </ul>
            <p className="m-0 text-[14px] text-slate">{consequence}</p>
            <label className="flex items-center gap-2 text-[14px] cursor-pointer">
              <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="w-4 h-4 accent-navy" />
              I understand this changes {usage.length} {usage.length === 1 ? 'place' : 'places'}
            </label>
          </>
        ) : (
          <p className="m-0 text-[14px]">Delete {what}? This can&apos;t be undone.</p>
        )}
        {error && <p className="text-red-700 text-[13px] m-0">{error}</p>}
        <div className="flex justify-end gap-2 flex-wrap pt-1">
          <button type="button" onClick={onCancel} disabled={busy} className="btn-ghost">Cancel</button>
          {inUse && onSafe && <button type="button" onClick={() => run(onSafe)} disabled={busy} className="btn-outline">{safeLabel}</button>}
          <button type="button" onClick={() => run(onDelete)} disabled={busy || (inUse && !understood)}
            className="btn-primary bg-red-600 hover:bg-red-700 border-red-600">
            {busy && <Loader2 size={14} className="animate-spin" />}
            {inUse ? `Delete from ${usage.length} place${usage.length === 1 ? '' : 's'}` : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
