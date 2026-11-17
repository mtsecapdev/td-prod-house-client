import { useState } from 'react';
import { FileText, RotateCcw, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { generations } from '../../services/api';

/** Review panel block for the selected slide/section: the sources it was written from, and a rewrite with a note. */
export default function ItemTools({ type, genId, index, item, onUpdated }) {
  const noun = type === 'deck' ? 'slide' : 'section';
  const [showSources, setShowSources] = useState(false);
  const [note, setNote] = useState(item?.note || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const sources = item?.sources || [];

  async function regenerate() {
    setBusy(true);
    setError(null);
    try {
      await generations.regenerateItem(type, genId, index, note.trim());
      await onUpdated();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  if (!item) return null;
  return (
    <div className="px-3 py-2.5 border-b border-border flex flex-col gap-2">
      <button type="button" onClick={() => setShowSources(!showSources)}
        className="flex items-center gap-1.5 text-[12px] font-semibold text-slate uppercase tracking-wide bg-transparent border-0 p-0 cursor-pointer text-left">
        {showSources ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        Sources ({sources.length})
        {!showSources && sources.length > 0 && (
          <span className="normal-case font-normal tracking-normal truncate">
            · p. {[...new Set(sources.map((s) => s.page).filter((p) => p != null))].sort((a, b) => a - b).join(', ')}
          </span>
        )}
      </button>
      {showSources && (
        sources.length ? (
          <ul className="list-none m-0 p-0 flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
            {sources.map((s) => (
              <li key={s.chunk_id} className="flex gap-1.5 items-start">
                <FileText size={12} className="text-slate shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-navy m-0">p. {s.page ?? '?'}{s.heading ? ` · ${s.heading}` : ''}</p>
                  <p className="text-[11px] text-slate m-0 leading-snug line-clamp-3">{s.preview}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="hint text-[12px] m-0">Written from the plan, without document sources.</p>
      )}
      <textarea className="field text-[12px] min-h-[40px] py-1.5" value={note} onChange={(e) => setNote(e.target.value)}
        placeholder={`Note for a rewrite, e.g. "shorter", "focus on Silesia"`} disabled={busy} />
      <button type="button" onClick={regenerate} disabled={busy} className="btn-outline text-[12px] py-1 gap-1 self-start">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
        {busy ? 'Rewriting...' : `Rewrite this ${noun}`}
      </button>
      {error && <p className="text-[12px] text-red-700 m-0">{error}</p>}
    </div>
  );
}
