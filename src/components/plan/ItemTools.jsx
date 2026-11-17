import { useState } from 'react';
import { FileText, RotateCcw, Loader2, ChevronDown, ChevronRight, Sparkles, Layout, Plus } from 'lucide-react';
import { generations } from '../../services/api';
import { KIND } from './kindConfig';

// One-click rewrites, sent through the existing per-item chat edit.
const QUICK_EDITS = [
  { label: 'Improve', instruction: 'Improve the writing: clearer, more specific and better structured. Keep the facts and the layout.' },
  { label: 'Shorter', instruction: 'Make it about 40% shorter. Keep the most important facts.' },
  { label: 'Longer', instruction: 'Expand it with more supporting detail from the sources, within the layout.' },
  { label: 'Simplify', instruction: 'Simplify the language for a non-specialist reader. Keep the facts.' },
];

/**
 * Edit with AI for the selected slide/section (Gamma-style): quick rewrites, a different layout, a rewrite with
 * a note, adding a new item after this one, and the sources it was written from.
 */
export default function ItemTools({ type, genId, index, item, onUpdated }) {
  const kind = KIND[type];
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [panel, setPanel] = useState(null); // 'layout' | 'note' | 'add' | 'sources'
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');
  const sources = item?.sources || [];

  async function run(label, action) {
    setBusy(label);
    setError(null);
    try {
      const result = await action();
      await onUpdated(result);
      setPanel(null);
    } catch (err) {
      setError(err.message);
    }
    setBusy(null);
  }

  const editItem = type === 'deck' ? generations.editSlide : generations.editSection;
  const toggle = (p) => setPanel(panel === p ? null : p);

  if (!item?.content) return null;
  return (
    <div className="px-3 py-2.5 border-b border-border flex flex-col gap-2">
      <span className="text-[12px] font-semibold text-slate uppercase tracking-wide flex items-center gap-1.5">
        <Sparkles size={12} />Edit with AI
      </span>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_EDITS.map((q) => (
          <button key={q.label} type="button" disabled={busy !== null}
            onClick={() => run(q.label, () => editItem(genId, index, q.instruction, []))}
            className="btn-outline text-[12px] py-1 px-2">
            {busy === q.label && <Loader2 size={12} className="animate-spin" />}{q.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => toggle('layout')} disabled={busy !== null} className="btn-ghost text-[12px] py-1 px-1.5">
          <Layout size={12} />Layout
        </button>
        <button type="button" onClick={() => toggle('note')} disabled={busy !== null} className="btn-ghost text-[12px] py-1 px-1.5">
          <RotateCcw size={12} />Rewrite
        </button>
        <button type="button" onClick={() => toggle('add')} disabled={busy !== null} className="btn-ghost text-[12px] py-1 px-1.5">
          <Plus size={12} />Add after
        </button>
      </div>

      {panel === 'layout' && (
        <div className="grid grid-cols-2 gap-1.5">
          {kind.options.filter((o) => o.key !== item[kind.typeKey]).map((o) => (
            <button key={o.key} type="button" disabled={busy !== null} title={o.description}
              onClick={() => run('layout', () => generations.regenerateItem(type, genId, index, { type: o.key }))}
              className="text-left text-[12px] px-2 py-1.5 rounded-md border border-border bg-white hover:bg-canvas cursor-pointer disabled:opacity-50">
              {o.label}
            </button>
          ))}
        </div>
      )}
      {panel === 'note' && (
        <div className="flex flex-col gap-1.5">
          <textarea className="field text-[12px] min-h-[44px] py-1.5" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={`What to change, e.g. "focus on Silesia", "add the 2024 comparison"`} disabled={busy !== null} />
          <button type="button" disabled={busy !== null}
            onClick={() => run('note', () => generations.regenerateItem(type, genId, index, { note: note.trim() }))}
            className="btn-outline text-[12px] py-1 self-start">
            {busy === 'note' ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}Rewrite this {kind.noun}
          </button>
        </div>
      )}
      {panel === 'add' && (
        <div className="flex flex-col gap-1.5">
          <textarea className="field text-[12px] min-h-[44px] py-1.5" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={`Describe the new ${kind.noun}, e.g. "a diagram of the escalation process"`} disabled={busy !== null} />
          <button type="button" disabled={busy !== null || !description.trim()}
            onClick={() => run('add', () => generations.addItem(type, genId, index, description.trim()))}
            className="btn-outline text-[12px] py-1 self-start">
            {busy === 'add' ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}Add {kind.noun} with AI
          </button>
        </div>
      )}
      {busy && <p className="hint text-[12px] m-0">Working… about 30 seconds.</p>}

      <button type="button" onClick={() => toggle('sources')}
        className="flex items-center gap-1.5 text-[12px] text-slate bg-transparent border-0 p-0 cursor-pointer text-left">
        {panel === 'sources' ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        Sources ({sources.length})
        {panel !== 'sources' && sources.length > 0 && (
          <span className="truncate">· p. {[...new Set(sources.map((s) => s.page).filter((p) => p != null))].sort((a, b) => a - b).join(', ')}</span>
        )}
      </button>
      {panel === 'sources' && (
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
        ) : <p className="hint text-[12px] m-0">Written from the outline, without document sources.</p>
      )}
      {error && <p className="text-[12px] text-red-700 m-0">{error}</p>}
    </div>
  );
}
