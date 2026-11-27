import { useEffect, useRef, useState } from 'react';
import { Send, FileSliders, FileText, Clapperboard, X, PencilLine, Plus } from 'lucide-react';
import DocumentsMenu from './DocumentsMenu';

// "/" commands: the skills, and (while editing) going back to asking questions.
const COMMANDS = [
  { cmd: 'deck', hint: 'Make a slide deck from this chat', skill: 'deck' },
  { cmd: 'doc', hint: 'Make a training document from this chat', skill: 'doc' },
  { cmd: 'ask', hint: 'Ask about the documents (stop editing)', editingOnly: true },
];
const COMMAND_RE = /^\/(\w*)(?:\s+([\s\S]*))?$/;

// soon: shown but not available yet.
const SKILLS = [
  { type: 'deck', label: 'Slide deck', icon: FileSliders, desc: 'A training deck from your documents', tint: 'bg-[#E8EFFA] text-cobalt' },
  { type: 'doc', label: 'Training document', icon: FileText, desc: 'A guide, reference or procedure', tint: 'bg-[#E9F5EF] text-[#047857]' },
  { type: 'storyboard', label: 'Storyboard', icon: Clapperboard, desc: 'Coming soon', tint: 'bg-[#F3EEFB] text-[#6D28D9]', soon: true },
];

/**
 * The message box. Modes: asking about the documents, or, while a deck/document is open beside the chat,
 * changing it: the selected slide, the whole thing, or a new slide. Choosing a deck or document calls
 * onStartSkill(type) straight away (its planning questions start, the first drawn from the documents).
 *
 * edit: null, or { type, noun, product, scope: 'item' | 'all' | 'add', index, after } for the open deck/document.
 */
export default function Composer({
  docs, docIds, onDocIdsChange, onDocsChanged,
  onStartSkill, edit, onEditScope, onStopEditing,
  disabled, onSend, variant = 'docked', answering = false,
}) {
  const hero = variant === 'hero';
  const [text, setText] = useState('');
  const [picked, setPicked] = useState(0);
  const ref = useRef(null);

  // The "/" menu: open while the box holds just "/word" (no space yet).
  const typed = text.match(/^\/(\w*)$/);
  const commands = typed ? COMMANDS.filter((c) => c.cmd.startsWith(typed[1].toLowerCase()) && (!c.editingOnly || edit)) : [];
  const menuOpen = commands.length > 0;

  function runCommand(c) {
    setText('');
    setPicked(0);
    if (c.skill) onStartSkill(c.skill);
    else onStopEditing();
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, hero ? 56 : 24), 220)}px`;
  }, [text, hero]);

  // Focus the box when the mode changes (a slide selected for editing).
  useEffect(() => { ref.current?.focus(); }, [edit?.scope, edit?.after]);

  const placeholder = answering && !edit ? 'Type your answer, or pick one above'
    : edit?.scope === 'add' ? `Describe the new ${edit.noun}`
      : edit?.scope === 'item' ? `What should change on ${edit.noun} ${edit.index + 1}?`
        : edit?.scope === 'all' ? `What should change across the ${edit.product}?`
          : 'Ask about your documents';
  const canSend = !disabled && text.trim();

  function submit(e) {
    e?.preventDefault();
    // "/deck six slides on cooling" sends straight away as that skill.
    const m = text.trim().match(COMMAND_RE);
    const command = m && COMMANDS.find((c) => c.cmd === m[1].toLowerCase() && c.skill);
    if (command && !disabled) {
      onSend((m[2] || '').trim(), command.skill);
      setText('');
      return;
    }
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  }

  function onKeyDown(e) {
    if (menuOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setPicked((i) => (i + (e.key === 'ArrowDown' ? 1 : commands.length - 1)) % commands.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        runCommand(commands[Math.min(picked, commands.length - 1)]);
        return;
      }
      if (e.key === 'Escape') { setText(''); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
  }

  const chip = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] border cursor-pointer transition-colors';
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      {edit && (
        <div className="flex items-center gap-2 flex-wrap text-[13px]">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#EAF0F8] text-navy">
            {edit.scope === 'add' ? <Plus size={13} /> : <PencilLine size={13} />}
            <span className="truncate max-w-[260px]">
              {edit.scope === 'add' ? `Adding a ${edit.noun} after ${edit.after + 1}` : `Editing this ${edit.type === 'deck' ? 'deck' : 'document'}`}
            </span>
            <button type="button" onClick={onStopEditing} title="Ask questions instead"
              className="p-0.5 bg-transparent border-0 text-navy/70 hover:text-navy cursor-pointer" aria-label="Stop editing"><X size={13} /></button>
          </span>
          {edit.scope !== 'add' && (
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

      <div className={`relative bg-white border border-[#D9E1EC] rounded-2xl shadow-[0_2px_12px_rgba(15,43,72,0.06)] focus-within:border-cobalt/60 focus-within:shadow-[0_2px_16px_rgba(37,99,235,0.12)] ${hero ? 'px-4 pt-3.5 pb-2.5' : 'px-3.5 pt-2.5 pb-2'}`}>
        {menuOpen && (
          <ul role="listbox" aria-label="Commands" className="absolute left-0 bottom-full mb-2 z-30 w-[320px] max-w-full list-none m-0 p-1 bg-white border border-border rounded-lg shadow-lg">
            {commands.map((c, i) => (
              <li key={c.cmd} role="option" aria-selected={i === picked}>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); runCommand(c); }} onMouseEnter={() => setPicked(i)}
                  className={`w-full text-left flex items-baseline gap-2 px-2.5 py-1.5 rounded-md border-0 cursor-pointer ${i === picked ? 'bg-[#EAF0F8]' : 'bg-transparent'}`}>
                  <span className="text-[13px] font-semibold text-navy">/{c.cmd}</span>
                  <span className="text-[12px] text-slate">{c.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <textarea ref={ref} rows={1} value={text} onChange={(e) => { setText(e.target.value); setPicked(0); }} placeholder={placeholder}
          onKeyDown={onKeyDown} aria-label="Message"
          className={`block w-full resize-none bg-transparent border-0 outline-none leading-6 placeholder:text-slate/60 ${hero ? 'text-[15px]' : 'text-[14px]'}`} />
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <DocumentsMenu compact docs={docs} selected={docIds} onChange={onDocIdsChange} onDocsChanged={onDocsChanged} />
          <button type="submit" disabled={!canSend} aria-label="Send"
            className="w-9 h-9 shrink-0 rounded-xl bg-navy text-white flex items-center justify-center border-0 cursor-pointer hover:bg-[var(--color-navy-hover)] disabled:bg-[#C5CFDC] disabled:cursor-default">
            <Send size={16} />
          </button>
        </div>
      </div>

      {!edit && hero && (
        // On the start screen the skills are cards saying what each makes; in a conversation they are pills.
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          {SKILLS.map((s) => (
            <button key={s.type} type="button" onClick={() => onStartSkill(s.type)} disabled={disabled || s.soon}
              title={s.soon ? `${s.label}: coming soon` : undefined}
              className="group flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer border transition-all disabled:opacity-60 disabled:cursor-default border-[#D9E1EC] bg-white/80 enabled:hover:bg-white enabled:hover:border-[#C7D3E3] enabled:hover:shadow-sm">
              <span className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${s.tint}`}><s.icon size={19} /></span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-ink">{s.label}</span>
                <span className="block text-[12px] text-slate leading-snug">{s.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {!edit && !hero && (
        <div className="flex items-center gap-2 flex-wrap">
          {SKILLS.map((s) => (
            <button key={s.type} type="button" onClick={() => onStartSkill(s.type)} disabled={disabled || s.soon}
              title={s.soon ? `${s.label}: coming soon` : undefined}
              className={`${chip} disabled:opacity-60 disabled:cursor-default border-[#D9E1EC] bg-white text-ink enabled:hover:bg-[#F6F8FB] enabled:hover:border-[#C7D3E3]`}>
              <s.icon size={14} className="text-slate" />{s.label}
              {s.soon && <span className="text-[11px] text-slate">· soon</span>}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
