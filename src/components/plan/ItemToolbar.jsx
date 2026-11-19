import { useState } from 'react';
import { Loader2, FileText, Layout, ImagePlus, Minimize2, Feather, Workflow } from 'lucide-react';
import { generations } from '../../services/api';
import { KIND, typeLabel } from './kindConfig';
import FigurePicker from '../figures/FigurePicker';

const SHORTER = 'Make it about 40% shorter. Keep the most important facts.';
const SIMPLER = 'Use simpler language a non-specialist would follow. Keep the facts.';

/**
 * Quick actions for the selected slide/section. Shorter and Simpler are requests to the chat (onAsk), so they
 * show in the conversation like anything typed; layout, diagram and figure changes act directly.
 */
export default function ItemToolbar({ type, genId, index, item, documentIds = [], onAsk, onUpdated, onAddFigure }) {
  const kind = KIND[type];
  const [open, setOpen] = useState(null); // 'layout' | 'sources' | 'figure'
  const [suggestions, setSuggestions] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const sources = item?.sources || [];
  const pages = [...new Set(sources.map((s) => s.page).filter((p) => p != null))].sort((a, b) => a - b);
  const current = item?.[kind.typeKey];

  if (!item?.content) return null;

  async function changeLayout(layout) {
    setOpen(null);
    setBusy(layout);
    setError(null);
    try {
      await generations.regenerateItem(type, genId, index, { type: layout });
      await onUpdated();
    } catch (err) {
      setError(err.message);
    }
    setBusy(null);
  }

  async function openLayouts() {
    setOpen(open === 'layout' ? null : 'layout');
    if (suggestions) return;
    try {
      setSuggestions((await generations.suggestLayouts(type, genId, index)).suggestions);
    } catch {
      setSuggestions([]);
    }
  }

  const label = (key) => typeLabel(kind, key);
  const chip = 'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] text-ink bg-transparent border border-transparent hover:bg-canvas hover:border-border cursor-pointer disabled:opacity-50';

  return (
    <div className="relative shrink-0 border-b border-border bg-white px-3 py-1.5 flex items-center gap-1 flex-wrap">
      <span className="text-[12px] font-semibold text-navy mr-1">{kind.noun[0].toUpperCase() + kind.noun.slice(1)} {index + 1}</span>
      <button type="button" className={chip} disabled={Boolean(busy)} onClick={() => onAsk(SHORTER, 'Shorter')}><Minimize2 size={12} />Shorter</button>
      <button type="button" className={chip} disabled={Boolean(busy)} onClick={() => onAsk(SIMPLER, 'Simpler')}><Feather size={12} />Simpler</button>
      {current !== 'diagram' && (
        <button type="button" className={chip} disabled={Boolean(busy)} onClick={() => changeLayout('diagram')}><Workflow size={12} />As a diagram</button>
      )}
      <button type="button" className={chip} disabled={Boolean(busy)} onClick={openLayouts}><Layout size={12} />Layout: {label(current)}</button>
      {documentIds.length > 0 && onAddFigure && (
        <button type="button" className={chip} disabled={Boolean(busy)} onClick={() => setOpen('figure')}><ImagePlus size={12} />Add figure</button>
      )}
      {pages.length > 0 && (
        <button type="button" className={`${chip} text-slate`} onClick={() => setOpen(open === 'sources' ? null : 'sources')}>
          <FileText size={12} />From p. {pages.join(', ')}
        </button>
      )}
      {busy && <span className="text-[12px] text-cobalt flex items-center gap-1 ml-1"><Loader2 size={12} className="animate-spin" />Rewriting as {label(busy)}…</span>}
      {error && <span className="text-[12px] text-red-700 ml-1">{error}</span>}

      {open === 'layout' && (
        <div className="absolute left-3 top-full mt-1 z-30 w-[360px] max-w-[90vw] bg-white border border-border rounded-lg shadow-lg p-2 flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto">
          {suggestions === null && <span className="hint text-[12px] flex items-center gap-1 p-1"><Loader2 size={12} className="animate-spin" />Finding layouts that suit this content…</span>}
          {suggestions?.map((sg) => (
            <button key={sg.type} type="button" onClick={() => changeLayout(sg.type)}
              className="text-left px-2 py-1.5 rounded-md border border-cobalt/40 bg-[#F5F8FC] hover:bg-[#EAF0F8] cursor-pointer">
              <span className="block text-[12px] font-semibold text-navy">{label(sg.type)}</span>
              <span className="block text-[11px] text-slate leading-snug">{sg.reason}</span>
            </button>
          ))}
          <div className="grid grid-cols-2 gap-1 pt-1">
            {kind.options.filter((o) => o.key !== current).map((o) => (
              <button key={o.key} type="button" title={o.description} onClick={() => changeLayout(o.key)}
                className="text-left text-[12px] px-2 py-1 rounded border border-border bg-white hover:bg-canvas cursor-pointer">
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {open === 'sources' && (
        <ul className="absolute right-3 top-full mt-1 z-30 w-[380px] max-w-[90vw] list-none m-0 p-2 bg-white border border-border rounded-lg shadow-lg flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
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
      )}

      {open === 'figure' && (
        <FigurePicker documentIds={documentIds} title={`Add a figure to ${kind.noun} ${index + 1}`}
          onPick={(f) => { onAddFigure(f); setOpen(null); }} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}
