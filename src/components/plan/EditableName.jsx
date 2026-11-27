import { useRef, useState } from 'react';

/**
 * A deck's or document's name in the editor's top bar, renamed in place like a spreadsheet's title: click it, type,
 * Enter or click away to keep, Escape to cancel. The name is its own: renaming leaves the title slide as it is.
 */
export default function EditableName({ value, onRename }) {
  const [draft, setDraft] = useState(null);
  const cancelled = useRef(false);

  function commit() {
    const name = (draft ?? '').replace(/\s+/g, ' ').trim();
    setDraft(null);
    if (!cancelled.current && name && name !== value) onRename(name);
    cancelled.current = false;
  }

  const text = 'font-heading text-[18px] leading-6 font-bold tracking-tight';
  if (draft !== null) {
    return (
      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} aria-label="Name"
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') { cancelled.current = true; e.currentTarget.blur(); }
        }}
        className={`${text} m-0 px-1.5 -mx-1.5 py-0.5 min-w-[200px] w-[min(60vw,520px)] rounded-md border border-cobalt outline-none bg-white text-ink`} />
    );
  }
  return (
    <h1 className="m-0 min-w-0">
      <button type="button" onClick={() => setDraft(value)} title="Rename"
        className={`${text} block max-w-[200px] lg:max-w-[520px] truncate text-left px-1.5 -mx-1.5 py-0.5 rounded-md border border-transparent bg-transparent text-ink cursor-text hover:border-border`}>
        {value}
      </button>
    </h1>
  );
}
