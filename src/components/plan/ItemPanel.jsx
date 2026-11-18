import { useState } from 'react';
import { Send, Loader2, FileText, ChevronDown, ChevronRight, Layout, ImageIcon } from 'lucide-react';
import { generations } from '../../services/api';
import { KIND } from './kindConfig';
import FigurePicker from '../figures/FigurePicker';

const SHORTER = 'Make it about 40% shorter. Keep the most important facts.';
const SIMPLER = 'Use simpler language a non-specialist would follow. Keep the facts.';

/**
 * The "This slide / This section" panel: say what to change, with a few one-click suggestions, a layout
 * chooser, a document figure picker, and the pages the item was written from.
 */
export default function ItemPanel({ type, genId, index, item, documentIds = [], onUpdated, onAdded }) {
  const kind = KIND[type];
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [showSources, setShowSources] = useState(false);
  const [pickingFigure, setPickingFigure] = useState(false);
  const edit = type === 'deck' ? generations.editSlide : generations.editSection;
  const sources = item?.sources || [];
  const pages = [...new Set(sources.map((s) => s.page).filter((p) => p != null))].sort((a, b) => a - b);

  // Every change goes through here so it shows in the conversation, whichever control started it.
  async function run(label, action) {
    setBusy(true);
    setLayoutOpen(false);
    setHistory((h) => [...h, { role: 'user', content: label }]);
    try {
      await action();
      await onUpdated();
      setHistory((h) => [...h, { role: 'assistant', content: 'Done.' }]);
    } catch (err) {
      setHistory((h) => [...h, { role: 'assistant', content: `Couldn't do that: ${err.message}` }]);
    }
    setBusy(false);
  }

  function submit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    run(text, () => edit(genId, index, text, history));
  }

  function changeLayout(layout) {
    const label = kind.options.find((o) => o.key === layout)?.label || layout;
    run(`Change the layout to ${label}`, () => generations.regenerateItem(type, genId, index, { type: layout }));
  }

  async function openLayouts() {
    setLayoutOpen(!layoutOpen);
    if (layoutOpen || suggestions) return;
    try {
      setSuggestions((await generations.suggestLayouts(type, genId, index)).suggestions);
    } catch {
      setSuggestions([]);
    }
  }

  // Replacing keeps the user on this item; adding after moves them to the new one.
  async function placeFigure(figure, mode) {
    const r = await generations.addFigure(genId, figure.id, { index, mode });
    setPickingFigure(false);
    const label = `${mode === 'replace' ? 'Use' : 'Add'} ${figure.caption || 'a figure'}`;
    setHistory((h) => [...h, { role: 'user', content: label }, { role: 'assistant', content: 'Done.' }]);
    if (mode === 'after' && onAdded) await onAdded(r.index);
    else await onUpdated();
  }

  if (!item?.content) {
    return <p className="hint text-[13px] px-3 py-3 m-0">This {kind.noun} is not written yet.</p>;
  }

  const current = item[kind.typeKey];
  return (
    <>
      {pages.length > 0 && (
        <div className="px-3 py-2 border-b border-border">
          <button type="button" onClick={() => setShowSources(!showSources)}
            className="flex items-center gap-1 text-[12px] text-slate bg-transparent border-0 p-0 cursor-pointer">
            {showSources ? <ChevronDown size={12} /> : <ChevronRight size={12} />}From p. {pages.join(', ')}
          </button>
          {showSources && (
            <ul className="list-none m-0 mt-1.5 p-0 flex flex-col gap-1.5 max-h-[180px] overflow-y-auto">
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
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {history.length === 0 && <p className="hint text-[13px] m-0">Tell me what to change on this {kind.noun}.</p>}
        {history.map((msg, i) => (
          <div key={i} className={`text-[13px] px-3 py-2 rounded-lg max-w-[85%] ${
            msg.role === 'user' ? 'bg-navy text-white self-end' : 'bg-[#F1F5F9] self-start'}`}>{msg.content}</div>
        ))}
        {busy && <p className="hint text-[13px] animate-pulse m-0">Working… about 30 seconds.</p>}
      </div>

      {layoutOpen && (
        <div className="px-3 py-2 border-t border-border flex flex-col gap-1.5 max-h-[45%] overflow-y-auto">
          {suggestions === null && <span className="hint text-[12px] flex items-center gap-1"><Loader2 size={12} className="animate-spin" />Finding layouts that suit this content…</span>}
          {suggestions?.map((sg) => (
            <button key={sg.type} type="button" disabled={busy} onClick={() => changeLayout(sg.type)}
              className="text-left px-2 py-1.5 rounded-md border border-cobalt/40 bg-[#F5F8FC] hover:bg-[#EAF0F8] cursor-pointer disabled:opacity-50">
              <span className="block text-[12px] font-semibold text-navy">{kind.options.find((o) => o.key === sg.type)?.label || sg.type}</span>
              <span className="block text-[11px] text-slate leading-snug">{sg.reason}</span>
            </button>
          ))}
          <div className="grid grid-cols-2 gap-1 pt-1">
            {kind.options.filter((o) => o.key !== current).map((o) => (
              <button key={o.key} type="button" disabled={busy} title={o.description} onClick={() => changeLayout(o.key)}
                className="text-left text-[12px] px-2 py-1 rounded border border-border bg-white hover:bg-canvas cursor-pointer disabled:opacity-50">
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="shrink-0 px-3 pt-2 flex flex-wrap gap-1.5 border-t border-border">
        <button type="button" disabled={busy} onClick={() => run('Shorter', () => edit(genId, index, SHORTER, []))} className="chip-muted text-[12px] cursor-pointer hover:bg-[#E2E8F0] border-0">Shorter</button>
        <button type="button" disabled={busy} onClick={() => run('Simpler', () => edit(genId, index, SIMPLER, []))} className="chip-muted text-[12px] cursor-pointer hover:bg-[#E2E8F0] border-0">Simpler</button>
        {current !== 'diagram' && (
          <button type="button" disabled={busy} onClick={() => changeLayout('diagram')} className="chip-muted text-[12px] cursor-pointer hover:bg-[#E2E8F0] border-0">As a diagram</button>
        )}
        <button type="button" disabled={busy} onClick={openLayouts} className="chip-muted text-[12px] cursor-pointer hover:bg-[#E2E8F0] border-0 flex items-center gap-1">
          <Layout size={11} />Change layout
        </button>
        {documentIds.length > 0 && (
          <button type="button" disabled={busy} onClick={() => setPickingFigure(true)} className="chip-muted text-[12px] cursor-pointer hover:bg-[#E2E8F0] border-0 flex items-center gap-1">
            <ImageIcon size={11} />{current === 'figure' ? 'Change figure' : 'Use a document figure'}
          </button>
        )}
      </div>
      {pickingFigure && (
        <FigurePicker documentIds={documentIds}
          title={current === 'figure' ? 'Change figure' : 'Use a figure from your documents'}
          modes={current === 'figure' ? [{ value: 'replace', label: 'Replace' }] : [
            { value: 'after', label: `Add as a new ${kind.noun}` },
            { value: 'replace', label: `Replace this ${kind.noun}` },
          ]}
          onPick={placeFigure} onClose={() => setPickingFigure(false)} />
      )}
      <form onSubmit={submit} className="shrink-0 flex gap-2 px-3 py-2.5">
        <input className="field flex-1 text-[13px]" value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
          placeholder={type === 'deck' ? 'e.g. focus on the Silesia delay' : 'e.g. add a caution about torque'} />
        <button type="submit" disabled={busy || !input.trim()} className="btn-primary px-2.5 py-1.5" aria-label="Send">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>
    </>
  );
}
