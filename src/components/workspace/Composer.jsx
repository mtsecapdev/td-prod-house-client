import { useEffect, useRef, useState } from 'react';
import { Send, FileSliders, FileText, Image, X, PencilLine, Plus } from 'lucide-react';
import DocumentsMenu from './DocumentsMenu';

const SKILLS = [
  { type: 'deck', label: 'Slide deck', icon: FileSliders },
  { type: 'doc', label: 'Training document', icon: FileText },
  { type: 'image', label: 'Image', icon: Image },
];

/**
 * The message box. Modes: asking about the documents; making a deck/document (a skill chip was pressed); or,
 * while one is open beside the chat, changing it: the selected slide, the whole thing, or a new slide.
 *
 * edit: null, or { type, noun, product, scope: 'item' | 'all' | 'add', index, after } for the open deck/document.
 */
export default function Composer({
  docs, docIds, onDocIdsChange, onDocsChanged,
  skill, onSkill, edit, onEditScope, onStopEditing,
  disabled, onSend,
}) {
  const [text, setText] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  // Focus the box when the mode changes (a chip pressed, a slide selected for editing).
  useEffect(() => { ref.current?.focus(); }, [skill, edit?.scope, edit?.after]);

  const skillInfo = SKILLS.find((s) => s.type === skill);
  const placeholder = skill === 'image'
    ? 'What should the image show? Optional: it uses this conversation.'
    : skillInfo
      ? `What should the ${skillInfo.label.toLowerCase()} cover? Optional: it uses this conversation.`
    : edit?.scope === 'add' ? `Describe the new ${edit.noun}`
      : edit?.scope === 'item' ? `What should change on ${edit.noun} ${edit.index + 1}?`
        : edit?.scope === 'all' ? `What should change across the ${edit.product}?`
          : 'Ask about your documents';
  // A skill can start from the conversation alone; everything else needs words.
  const canSend = !disabled && (text.trim() || skill);

  function submit(e) {
    e?.preventDefault();
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  }

  const chip = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] border cursor-pointer';
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      {(skillInfo || edit) && (
        <div className="flex items-center gap-2 flex-wrap text-[13px]">
          {skillInfo && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#EAF0F8] text-navy font-medium">
              <skillInfo.icon size={13} />{skillInfo.label}
              <button type="button" onClick={() => onSkill(null)} className="p-0.5 bg-transparent border-0 text-navy/70 hover:text-navy cursor-pointer" aria-label="Cancel"><X size={13} /></button>
            </span>
          )}
          {!skillInfo && edit && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#EAF0F8] text-navy">
              {edit.scope === 'add' ? <Plus size={13} /> : <PencilLine size={13} />}
              <span className="truncate max-w-[260px]">
                {edit.scope === 'add' ? `Adding a ${edit.noun} after ${edit.after + 1}` : `Editing this ${edit.type === 'deck' ? 'deck' : 'document'}`}
              </span>
              <button type="button" onClick={onStopEditing} title="Ask questions instead"
                className="p-0.5 bg-transparent border-0 text-navy/70 hover:text-navy cursor-pointer" aria-label="Stop editing"><X size={13} /></button>
            </span>
          )}
          {!skillInfo && edit && edit.scope !== 'add' && (
            <span className="inline-flex p-0.5 bg-canvas rounded-md">
              {[['item', `${edit.noun[0].toUpperCase() + edit.noun.slice(1)} ${edit.index + 1}`], ['all', `Whole ${edit.type === 'deck' ? 'deck' : 'document'}`]].map(([value, label]) => (
                <button key={value} type="button" onClick={() => onEditScope(value)}
                  className={`px-2 py-0.5 rounded text-[12px] border-0 cursor-pointer ${
                    edit.scope === value ? 'bg-white text-navy font-semibold shadow-sm' : 'bg-transparent text-slate'}`}>
                  {label}
                </button>
              ))}
            </span>
          )}
        </div>
      )}

      <div className="flex items-end gap-2 bg-white border border-border rounded-xl px-3 py-2 focus-within:border-cobalt">
        <textarea ref={ref} rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
          className="flex-1 resize-none bg-transparent border-0 outline-none text-[14px] leading-6 py-1 placeholder:text-slate/60" />
        <button type="submit" disabled={!canSend} aria-label="Send"
          className="w-9 h-9 shrink-0 rounded-lg bg-navy text-white flex items-center justify-center border-0 cursor-pointer disabled:opacity-40 disabled:cursor-default">
          <Send size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <DocumentsMenu docs={docs} selected={docIds} onChange={onDocIdsChange} onDocsChanged={onDocsChanged} />
        {!edit && (
          <>
            <span className="w-px h-5 bg-border mx-1" />
            {SKILLS.map((s) => (
              <button key={s.type} type="button" onClick={() => onSkill(skill === s.type ? null : s.type)} aria-pressed={skill === s.type}
                className={`${chip} ${skill === s.type ? 'border-navy bg-[#EAF0F8] text-navy font-semibold' : 'border-border bg-white text-ink hover:bg-canvas'}`}>
                <s.icon size={14} />{s.label}
              </button>
            ))}
          </>
        )}
      </div>
    </form>
  );
}
