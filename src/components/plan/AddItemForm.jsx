import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { generations } from '../../services/api';
import { KIND } from './kindConfig';

/** Right-panel form for the "+" between slides/sections: describe the new one; it is planned and written. */
export default function AddItemForm({ type, genId, after, onAdded, onCancel }) {
  const kind = KIND[type];
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!description.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await generations.addItem(type, genId, after, description.trim());
      await onAdded(result.index);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex-1 px-3 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-navy">
          New {kind.noun} {after < 0 ? 'at the start' : `after ${kind.noun} ${after + 1}`}
        </span>
        <button type="button" onClick={onCancel} className="icon-btn" aria-label="Cancel"><X size={14} /></button>
      </div>
      <textarea className="field text-[13px] min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)}
        disabled={busy} autoFocus placeholder={`What should it cover? e.g. "a diagram of the escalation process"`} />
      <button type="submit" disabled={busy || !description.trim()} className="btn-primary text-[13px] py-1.5 self-start">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        {busy ? 'Writing… about 30 seconds' : `Add ${kind.noun}`}
      </button>
      {error && <p className="text-[12px] text-red-700 m-0">{error}</p>}
    </form>
  );
}
