import { useEffect, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { figures as figuresApi } from '../../services/api';

/**
 * Choose a figure from the given documents. modes: the placement options shown ([] for none);
 * onPick(figure, mode) may return a promise; the picker shows progress until it settles.
 */
export default function FigurePicker({ documentIds, title = 'Choose a figure', modes = [], onPick, onClose }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [mode, setMode] = useState(modes[0]?.value);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      figuresApi.list({ q, documentIds }).then((d) => setList(d.figures)).catch((err) => setError(err.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q, documentIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  async function pick(f) {
    setBusy(f.id);
    setError(null);
    try {
      await onPick(f, mode);
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={busy ? undefined : onClose}>
      <div className="bg-white rounded-lg w-[880px] max-w-[95vw] max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={title}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <h2 className="font-heading text-[18px] font-semibold m-0">{title}</h2>
          <button type="button" onClick={onClose} disabled={Boolean(busy)} className="icon-btn" aria-label="Close"><X size={16} /></button>
        </div>
        <div className="px-5 py-3 flex gap-3 items-center flex-wrap border-b border-border">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
            <input className="field pl-8 w-full" value={q} onChange={(e) => setQ(e.target.value)} autoFocus
              placeholder="Search captions and the text inside figures" />
          </div>
          {modes.length > 1 && (
            <div className="flex gap-1 p-0.5 bg-canvas rounded-md">
              {modes.map((m) => (
                <button key={m.value} type="button" onClick={() => setMode(m.value)}
                  className={`px-2.5 py-1 rounded text-[13px] border-0 cursor-pointer ${
                    mode === m.value ? 'bg-white text-navy font-semibold shadow-sm' : 'bg-transparent text-slate'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="text-red-700 text-[13px] mt-0">{error}</p>}
          {list === null ? <p className="hint">Loading figures…</p> : list.length === 0 ? (
            <p className="hint">{q ? 'No figures match.' : 'These documents have no figures. Documents uploaded before figures were saved need re-uploading.'}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {list.map((f) => (
                <button key={f.id} type="button" onClick={() => pick(f)} disabled={Boolean(busy)}
                  className="text-left bg-white border border-border rounded-lg p-2 cursor-pointer hover:border-navy disabled:opacity-60 flex flex-col gap-1.5">
                  <div className="h-[120px] flex items-center justify-center bg-canvas rounded">
                    {busy === f.id ? <Loader2 size={20} className="animate-spin text-cobalt" /> : (
                      <img src={figuresApi.imageUrl(f.id)} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                    )}
                  </div>
                  <span className="text-[12px] leading-snug line-clamp-2">{f.caption || 'Untitled figure'}</span>
                  <span className="text-[11px] text-slate">p. {f.page ?? '?'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {busy && <p className="hint text-[12px] px-5 pb-3 m-0">Writing the {modes.length ? 'slide' : 'item'} around this figure… about 30 seconds.</p>}
      </div>
    </div>
  );
}
