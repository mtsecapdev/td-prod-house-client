import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Send, ChevronUp, ChevronDown, Plus, X, GripVertical, Undo2, Redo2, Download, BookmarkPlus, Check, ExternalLink, MessageSquare } from 'lucide-react';
import { generations, assets } from '../services/api';

/* ── Auto-resizing textarea ── */
function AutoTextarea({ value, onChange, className = '', ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = '0';
    ref.current.style.height = ref.current.scrollHeight + 'px';
  }, [value]);
  return (
    <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)}
      rows={1} className={`resize-none overflow-hidden ${className}`} {...props} />
  );
}

const inputBase = 'w-full bg-transparent border-0 outline-none px-0 py-0.5 rounded-sm transition-colors focus:bg-[#F0F4F8]';

const SLIDE_W = 960;
const SLIDE_H = 540;

function SlideFitContainer({ children }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      const el = containerRef.current;
      if (!el) return;
      const pad = 32;
      const availW = el.clientWidth - pad * 2;
      const availH = el.clientHeight - pad * 2;
      if (availW <= 0 || availH <= 0) return;
      const scaleW = availW / 16;
      const scaleH = availH / 9;
      const s = Math.min(scaleW, scaleH);
      setSize({ w: Math.round(s * 16), h: Math.round(s * 9) });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex-1 flex items-center justify-center min-h-0">
      <div style={{ width: size.w || '80%', height: size.h || 'auto', aspectRatio: size.w ? undefined : '16/9' }}>
        {children}
      </div>
    </div>
  );
}

function SlideFrame({ children, noPad = false }) {
  const outerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!outerRef.current) return;
    const observer = new ResizeObserver(() => {
      const outer = outerRef.current;
      if (!outer) return;
      setScale(outer.clientWidth / SLIDE_W);
    });
    observer.observe(outerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="absolute inset-0 overflow-hidden">
      <div style={{
        width: SLIDE_W, height: SLIDE_H,
        transform: `scale(${scale})`, transformOrigin: 'top left',
        padding: noPad ? 0 : 32,
      }} className="flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   LAYOUT RENDERERS — one per slide layout type
   ══════════════════════════════════════════════ */

function TitleSlide({ content, onField }) {
  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F2B48] via-[#163A60] to-[#1E4A7A]" />
      <div className="absolute top-0 right-0 w-[60%] h-full bg-gradient-to-l from-[#2563EB]/15 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#2563EB] via-[#60A5FA] to-transparent" />
      <div className="relative z-10 flex flex-col items-start justify-center h-full px-10 py-8 gap-3">
        <AutoTextarea value={content.title}
          onChange={(val) => onField('title', val)}
          className={`${inputBase} font-heading text-[28px] leading-[1.15] font-bold tracking-tight text-white`}
          placeholder="Deck title" />
        <div className="w-10 h-[3px] bg-[#60A5FA] rounded-full" />
        <AutoTextarea value={content.subtitle}
          onChange={(val) => onField('subtitle', val)}
          className={`${inputBase} text-[14px] leading-relaxed text-[#94A3B8] max-w-[75%]`}
          placeholder="Subtitle" />
      </div>
    </div>
  );
}

function BulletsSlide({ content, onField, onBullet, onMoveBullet, onAddBullet, onRemoveBullet, dragHandlers }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-6 bg-cobalt rounded-full shrink-0" />
        <input type="text" value={content.title}
          onChange={(e) => onField('title', e.target.value)}
          className={`${inputBase} font-heading text-[20px] leading-7 font-bold tracking-tight text-navy`}
          placeholder="Slide title" />
      </div>
      <div className="w-full h-px bg-gradient-to-r from-[#E2E8F0] via-[#E2E8F0] to-transparent mb-2" />
      {content.bullets && (
        <ol className="list-none m-0 p-0 flex flex-col gap-0 flex-1">
          {content.bullets.map((b, i) => (
            <li key={i}
              draggable onDragStart={() => dragHandlers.start(i)}
              onDragOver={(e) => dragHandlers.over(e, i)}
              onDrop={() => dragHandlers.drop(i)}
              onDragEnd={dragHandlers.end}
              className={`group flex gap-2 items-start rounded-md py-1 px-1.5 -mx-1.5 transition-colors hover:bg-[#F8FAFC] ${
                dragHandlers.overIdx === i && dragHandlers.dragIdx !== i ? 'border-t-2 border-cobalt' : 'border-t-2 border-transparent'
              } ${dragHandlers.dragIdx === i ? 'opacity-40' : ''}`}>
              <div className="flex flex-col items-center shrink-0 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                <GripVertical size={10} className="text-slate" />
                <button type="button" onClick={() => onMoveBullet(i, -1)} disabled={i === 0}
                  className="p-0 w-3.5 h-3.5 flex items-center justify-center text-slate hover:text-navy disabled:opacity-20 cursor-pointer disabled:cursor-default bg-transparent border-0">
                  <ChevronUp size={9} /></button>
                <button type="button" onClick={() => onMoveBullet(i, 1)} disabled={i === content.bullets.length - 1}
                  className="p-0 w-3.5 h-3.5 flex items-center justify-center text-slate hover:text-navy disabled:opacity-20 cursor-pointer disabled:cursor-default bg-transparent border-0">
                  <ChevronDown size={9} /></button>
              </div>
              <div className="w-[22px] h-[22px] rounded-md bg-cobalt/10 text-cobalt text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <input type="text" value={b.heading}
                  onChange={(e) => onBullet(i, 'heading', e.target.value)}
                  className={`${inputBase} text-[13px] font-semibold text-ink leading-tight`} placeholder="Heading" />
                <AutoTextarea value={b.detail}
                  onChange={(val) => onBullet(i, 'detail', val)}
                  className={`${inputBase} text-[11px] text-slate leading-snug`} placeholder="Detail" />
              </div>
              <div className="flex gap-0.5 pt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={() => onAddBullet(i)} title="Add point below"
                  className="p-0 w-4 h-4 flex items-center justify-center text-slate hover:text-cobalt cursor-pointer bg-transparent border-0"><Plus size={11} /></button>
                <button type="button" onClick={() => onRemoveBullet(i)} title="Remove" disabled={content.bullets.length <= 1}
                  className="p-0 w-4 h-4 flex items-center justify-center text-slate hover:text-red-600 disabled:opacity-20 cursor-pointer disabled:cursor-default bg-transparent border-0"><X size={11} /></button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function TwoColumnSlide({ content, onField, onColumnBullet, onAddColumnBullet, onRemoveColumnBullet }) {
  function renderColumn(side, heading, bullets, accentColor) {
    const hKey = `column_${side}_heading`;
    const bKey = `column_${side}_bullets`;
    return (
      <div className="flex flex-col gap-2 p-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-1 h-4 rounded-full shrink-0 ${accentColor}`} />
          <AutoTextarea value={heading}
            onChange={(val) => onField(hKey, val)}
            className={`${inputBase} text-[13px] font-bold text-navy`}
            placeholder={`Column ${side === 'a' ? 'A' : 'B'} heading`} />
        </div>
        <ul className="list-none m-0 p-0 flex flex-col gap-1 pl-3">
          {(bullets || []).map((text, i) => (
            <li key={i} className="group flex gap-2 items-start min-w-0">
              <span className={`w-1.5 h-1.5 rounded-sm mt-1.5 shrink-0 ${accentColor} opacity-60`} />
              <AutoTextarea value={text}
                onChange={(val) => onColumnBullet(bKey, i, val)}
                className={`${inputBase} text-[11px] flex-1 leading-snug min-w-0`} placeholder="Bullet point" />
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button type="button" onClick={() => onAddColumnBullet(bKey, i)}
                  className="p-0 w-3.5 h-3.5 flex items-center justify-center text-slate hover:text-cobalt cursor-pointer bg-transparent border-0"><Plus size={10} /></button>
                <button type="button" onClick={() => onRemoveColumnBullet(bKey, i)} disabled={(bullets || []).length <= 1}
                  className="p-0 w-3.5 h-3.5 flex items-center justify-center text-slate hover:text-red-600 disabled:opacity-20 cursor-pointer disabled:cursor-default bg-transparent border-0"><X size={10} /></button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-navy rounded-full shrink-0" />
        <input type="text" value={content.title}
          onChange={(e) => onField('title', e.target.value)}
          className={`${inputBase} font-heading text-[18px] font-bold text-navy`}
          placeholder="Slide title" />
      </div>
      <div className="grid grid-cols-[1fr_1px_1fr] flex-1 mt-1 min-w-0 overflow-hidden">
        {renderColumn('a', content.column_a_heading, content.column_a_bullets, 'bg-cobalt')}
        <div className="bg-gradient-to-b from-transparent via-[#CBD5E1] to-transparent my-3" />
        {renderColumn('b', content.column_b_heading, content.column_b_bullets, 'bg-[#10B981]')}
      </div>
    </div>
  );
}

function StatFocusSlide({ content, onField }) {
  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute top-0 right-0 w-[160px] h-[160px] bg-cobalt/5 rounded-full -translate-y-1/3 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[120px] h-[120px] bg-navy/5 rounded-full translate-y-1/3 -translate-x-1/3" />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 bg-cobalt rounded-full shrink-0" />
          <input type="text" value={content.title}
            onChange={(e) => onField('title', e.target.value)}
            className={`${inputBase} text-[14px] font-heading font-semibold text-navy`}
            placeholder="Title" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
          <input type="text" value={content.stat_value}
            onChange={(e) => onField('stat_value', e.target.value)}
            className={`${inputBase} text-[44px] font-heading font-extrabold text-cobalt text-center leading-none tracking-tight`}
            placeholder="0" />
          <div className="w-8 h-0.5 bg-cobalt/30 rounded-full" />
          <input type="text" value={content.stat_label}
            onChange={(e) => onField('stat_label', e.target.value)}
            className={`${inputBase} text-[14px] font-bold text-navy text-center uppercase tracking-wider`}
            placeholder="Label" />
          <AutoTextarea value={content.context}
            onChange={(val) => onField('context', val)}
            className={`${inputBase} text-[12px] text-slate text-center max-w-[75%] mx-auto leading-snug mt-1`}
            placeholder="Context sentence" />
        </div>
      </div>
    </div>
  );
}

function QuoteHighlightSlide({ content, onField }) {
  return (
    <div className="flex h-full relative">
      <div className="absolute inset-y-0 left-0 w-[4px] bg-gradient-to-b from-cobalt via-[#60A5FA] to-cobalt/30 rounded-full" />
      <div className="absolute top-4 left-8 text-[56px] font-heading text-cobalt/10 leading-none select-none pointer-events-none">&ldquo;</div>
      <div className="flex flex-col flex-1 pl-7 pr-3 py-3 gap-1.5">
        <div className="flex items-center gap-2">
          <input type="text" value={content.title}
            onChange={(e) => onField('title', e.target.value)}
            className={`${inputBase} text-[12px] font-heading font-semibold text-cobalt uppercase tracking-wider`}
            placeholder="Title" />
        </div>
        <div className="flex-1 flex flex-col justify-center gap-2 pl-3 max-w-[92%]">
          <AutoTextarea value={content.quote_text}
            onChange={(val) => onField('quote_text', val)}
            className={`${inputBase} text-[15px] italic text-navy leading-[1.5] font-medium`}
            placeholder="Quote text" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-px bg-cobalt/40" />
            <input type="text" value={content.attribution}
              onChange={(e) => onField('attribution', e.target.value)}
              className={`${inputBase} text-[11px] font-semibold text-navy`}
              placeholder="Attribution" />
          </div>
          <AutoTextarea value={content.commentary}
            onChange={(val) => onField('commentary', val)}
            className={`${inputBase} text-[11px] text-slate leading-snug`}
            placeholder="Commentary" />
        </div>
      </div>
    </div>
  );
}

function ChecklistSlide({ content, onField, onItem, onAddItem, onRemoveItem }) {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-navy rounded-full shrink-0" />
        <input type="text" value={content.title}
          onChange={(e) => onField('title', e.target.value)}
          className={`${inputBase} font-heading text-[18px] font-bold text-navy`}
          placeholder="Slide title" />
      </div>
      <div className="w-full h-px bg-gradient-to-r from-navy/20 via-navy/10 to-transparent" />
      {content.items && (
        <ol className="list-none m-0 p-0 flex flex-col gap-0 flex-1">
          {content.items.map((item, i) => (
            <li key={i} className="group flex gap-2 items-start py-1 px-1.5 -mx-1.5 rounded-md hover:bg-[#F8FAFC] transition-colors">
              <div className="w-[24px] h-[24px] rounded-md bg-gradient-to-br from-navy to-[#1E4A7A] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <input type="text" value={item.step}
                  onChange={(e) => onItem(i, 'step', e.target.value)}
                  className={`${inputBase} text-[13px] font-semibold text-ink leading-tight`} placeholder="Step" />
                <AutoTextarea value={item.detail}
                  onChange={(val) => onItem(i, 'detail', val)}
                  className={`${inputBase} text-[11px] text-slate leading-snug`} placeholder="Detail" />
              </div>
              <div className="flex gap-0.5 pt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={() => onAddItem(i)} title="Add step below"
                  className="p-0 w-4 h-4 flex items-center justify-center text-slate hover:text-cobalt cursor-pointer bg-transparent border-0"><Plus size={11} /></button>
                <button type="button" onClick={() => onRemoveItem(i)} title="Remove" disabled={content.items.length <= 1}
                  className="p-0 w-4 h-4 flex items-center justify-center text-slate hover:text-red-600 disabled:opacity-20 cursor-pointer disabled:cursor-default bg-transparent border-0"><X size={11} /></button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const LAYOUT_LABELS = {
  title: 'Title', bullets: 'Bullets', two_column: 'Two Column',
  stat_focus: 'Key Stat', quote_highlight: 'Quote', checklist: 'Checklist',
};

function SlideThumbnail({ layout }) {
  const base = 'w-full h-full rounded-[3px] overflow-hidden';
  switch (layout) {
    case 'title':
      return (
        <div className={`${base} bg-gradient-to-br from-[#0F2B48] to-[#1E4A7A] flex flex-col justify-center px-2`}>
          <div className="w-[60%] h-[3px] bg-white/70 rounded-full mb-1" />
          <div className="w-[40%] h-[2px] bg-white/30 rounded-full" />
          <div className="w-[20%] h-[1.5px] bg-[#60A5FA]/50 rounded-full mt-1.5" />
        </div>
      );
    case 'two_column':
      return (
        <div className={`${base} bg-white border border-[#E2E8F0] flex gap-px p-1.5`}>
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="w-full h-[2px] bg-cobalt/40 rounded-full" />
            <div className="w-[80%] h-[1.5px] bg-[#CBD5E1] rounded-full" />
            <div className="w-[70%] h-[1.5px] bg-[#CBD5E1] rounded-full" />
          </div>
          <div className="w-px bg-[#E2E8F0]" />
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="w-full h-[2px] bg-[#10B981]/40 rounded-full" />
            <div className="w-[80%] h-[1.5px] bg-[#CBD5E1] rounded-full" />
            <div className="w-[70%] h-[1.5px] bg-[#CBD5E1] rounded-full" />
          </div>
        </div>
      );
    case 'stat_focus':
      return (
        <div className={`${base} bg-white border border-[#E2E8F0] flex flex-col items-center justify-center`}>
          <div className="text-[10px] font-extrabold text-cobalt leading-none">42</div>
          <div className="w-3 h-px bg-cobalt/30 rounded-full mt-0.5" />
          <div className="w-[40%] h-[1.5px] bg-[#CBD5E1] rounded-full mt-0.5" />
        </div>
      );
    case 'quote_highlight':
      return (
        <div className={`${base} bg-white border border-[#E2E8F0] flex`}>
          <div className="w-[3px] bg-gradient-to-b from-cobalt to-cobalt/30 shrink-0" />
          <div className="flex-1 flex flex-col justify-center px-1.5 gap-0.5">
            <div className="text-[7px] text-cobalt/20 font-heading leading-none">&ldquo;</div>
            <div className="w-[80%] h-[1.5px] bg-[#CBD5E1] rounded-full" />
            <div className="w-[60%] h-[1.5px] bg-[#CBD5E1] rounded-full" />
          </div>
        </div>
      );
    case 'checklist':
      return (
        <div className={`${base} bg-white border border-[#E2E8F0] flex flex-col justify-center px-1.5 gap-[3px]`}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-1">
              <div className="w-[8px] h-[8px] rounded-sm bg-navy/80 text-white text-[5px] font-bold flex items-center justify-center shrink-0">{n}</div>
              <div className="flex-1 h-[1.5px] bg-[#CBD5E1] rounded-full" />
            </div>
          ))}
        </div>
      );
    default: // bullets
      return (
        <div className={`${base} bg-white border border-[#E2E8F0] flex flex-col justify-center px-1.5 gap-[3px]`}>
          <div className="w-[70%] h-[2px] bg-navy/30 rounded-full" />
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-1">
              <div className="w-[4px] h-[4px] rounded-full bg-cobalt/40 shrink-0" />
              <div className="flex-1 h-[1.5px] bg-[#CBD5E1] rounded-full" />
            </div>
          ))}
        </div>
      );
  }
}

/* ══════════════════════════════════════
   MAIN REVIEW PAGE
   ══════════════════════════════════════ */

export default function Review() {
  const { id } = useParams();
  const [gen, setGen] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [openingDeckCraft, setOpeningDeckCraft] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const saveTimer = useRef(null);
  const undoStack = useRef({});
  const redoStack = useRef({});

  useEffect(() => {
    function onBeforeUnload(e) {
      if (saveTimer.current) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  useEffect(() => {
    generations.get(id).then(({ generation }) => setGen(generation));
  }, [id]);

  const saveOutline = useCallback((updatedGen) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try { await generations.updateOutline(updatedGen.id, updatedGen.outline); }
      catch (err) { console.error('Save failed:', err); }
      setSaving(false);
    }, 800);
  }, []);

  function getUndoStack(idx) { if (!undoStack.current[idx]) undoStack.current[idx] = []; return undoStack.current[idx]; }
  function getRedoStack(idx) { if (!redoStack.current[idx]) redoStack.current[idx] = []; return redoStack.current[idx]; }

  function undo() {
    if (!gen) return;
    const stack = getUndoStack(activeSlide);
    if (stack.length === 0) return;
    const prev = stack.pop();
    const current = gen.outline.slides[activeSlide]?.content;
    if (current) getRedoStack(activeSlide).push(JSON.parse(JSON.stringify(current)));
    const updatedSlides = gen.outline.slides.map((s, i) =>
      i === activeSlide ? { ...s, content: prev, title: prev.title || s.title } : s,
    );
    const updatedGen = { ...gen, outline: { ...gen.outline, slides: updatedSlides } };
    setGen(updatedGen);
    saveOutline(updatedGen);
  }

  function redo() {
    if (!gen) return;
    const stack = getRedoStack(activeSlide);
    if (stack.length === 0) return;
    const next = stack.pop();
    const current = gen.outline.slides[activeSlide]?.content;
    if (current) getUndoStack(activeSlide).push(JSON.parse(JSON.stringify(current)));
    const updatedSlides = gen.outline.slides.map((s, i) =>
      i === activeSlide ? { ...s, content: next, title: next.title || s.title } : s,
    );
    const updatedGen = { ...gen, outline: { ...gen.outline, slides: updatedSlides } };
    setGen(updatedGen);
    saveOutline(updatedGen);
  }

  const canUndo = gen && getUndoStack(activeSlide).length > 0;
  const canRedo = gen && getRedoStack(activeSlide).length > 0;

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) { e.preventDefault(); redo(); }
        else { e.preventDefault(); undo(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!gen || !gen.outline?.slides) {
    return <main className="max-w-[1180px] w-[90%] mx-auto py-8"><p className="hint">Loading...</p></main>;
  }

  const slides = gen.outline.slides;
  const slide = slides[activeSlide];
  const content = slide?.content;
  const layout = slide?.layout || 'bullets';

  function applyUpdate(updatedGen) {
    const currentContent = gen.outline.slides[activeSlide]?.content;
    if (currentContent) {
      getUndoStack(activeSlide).push(JSON.parse(JSON.stringify(currentContent)));
      getRedoStack(activeSlide).length = 0;
    }
    setGen(updatedGen);
    saveOutline(updatedGen);
  }

  function updateSlideField(field, value) {
    const updatedContent = { ...content, [field]: value };
    const updatedSlides = slides.map((s, i) =>
      i === activeSlide ? { ...s, content: updatedContent, title: field === 'title' ? value : s.title } : s,
    );
    applyUpdate({ ...gen, outline: { ...gen.outline, slides: updatedSlides } });
  }

  // Bullets layout helpers
  function updateBullet(idx, field, value) {
    const updated = content.bullets.map((b, i) => i === idx ? { ...b, [field]: value } : b);
    updateSlideField('bullets', updated);
  }
  function moveBullet(idx, dir) {
    const t = idx + dir;
    if (t < 0 || t >= content.bullets.length) return;
    const a = [...content.bullets]; [a[idx], a[t]] = [a[t], a[idx]];
    updateSlideField('bullets', a);
  }
  function addBullet(after) {
    const a = [...content.bullets]; a.splice(after + 1, 0, { heading: '', detail: '' });
    updateSlideField('bullets', a);
  }
  function removeBullet(idx) {
    if (content.bullets.length <= 1) return;
    updateSlideField('bullets', content.bullets.filter((_, i) => i !== idx));
  }

  // Two-column helpers
  function updateColumnBullet(key, idx, value) {
    const a = [...(content[key] || [])]; a[idx] = value;
    updateSlideField(key, a);
  }
  function addColumnBullet(key, after) {
    const a = [...(content[key] || [])]; a.splice(after + 1, 0, '');
    updateSlideField(key, a);
  }
  function removeColumnBullet(key, idx) {
    const a = content[key] || [];
    if (a.length <= 1) return;
    updateSlideField(key, a.filter((_, i) => i !== idx));
  }

  // Checklist helpers
  function updateItem(idx, field, value) {
    const updated = content.items.map((it, i) => i === idx ? { ...it, [field]: value } : it);
    updateSlideField('items', updated);
  }
  function addItem(after) {
    const a = [...content.items]; a.splice(after + 1, 0, { step: '', detail: '' });
    updateSlideField('items', a);
  }
  function removeItem(idx) {
    if (content.items.length <= 1) return;
    updateSlideField('items', content.items.filter((_, i) => i !== idx));
  }

  // Drag handlers for bullets
  const dragHandlers = {
    dragIdx, overIdx: dragOverIdx,
    start: (i) => setDragIdx(i),
    over: (e, i) => { e.preventDefault(); setDragOverIdx(i); },
    drop: (i) => {
      if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return; }
      const a = [...content.bullets]; const [m] = a.splice(dragIdx, 1); a.splice(i, 0, m);
      updateSlideField('bullets', a);
      setDragIdx(null); setDragOverIdx(null);
    },
    end: () => { setDragIdx(null); setDragOverIdx(null); },
  };

  // Chat
  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const instruction = chatInput;
    setChatInput('');
    setChatHistory((h) => [...h, { role: 'user', content: instruction }]);
    setChatLoading(true);
    try {
      await generations.editSlide(id, activeSlide, instruction, chatHistory);
      setChatHistory((h) => [...h, { role: 'assistant', content: 'Slide updated.' }]);
      const refreshed = await generations.get(id);
      setGen(refreshed.generation);
    } catch (err) {
      setChatHistory((h) => [...h, { role: 'assistant', content: `Error: ${err.message}` }]);
    }
    setChatLoading(false);
  }

  function renderSlide() {
    if (!content) return <p className="hint">No content generated for this slide.</p>;

    const onField = updateSlideField;

    switch (layout) {
      case 'title':
        return <TitleSlide content={content} onField={onField} />;
      case 'two_column':
        return <TwoColumnSlide content={content} onField={onField}
          onColumnBullet={updateColumnBullet} onAddColumnBullet={addColumnBullet} onRemoveColumnBullet={removeColumnBullet} />;
      case 'stat_focus':
        return <StatFocusSlide content={content} onField={onField} />;
      case 'quote_highlight':
        return <QuoteHighlightSlide content={content} onField={onField} />;
      case 'checklist':
        return <ChecklistSlide content={content} onField={onField}
          onItem={updateItem} onAddItem={addItem} onRemoveItem={removeItem} />;
      case 'bullets':
      default:
        return <BulletsSlide content={content} onField={onField}
          onBullet={updateBullet} onMoveBullet={moveBullet} onAddBullet={addBullet} onRemoveBullet={removeBullet}
          dragHandlers={dragHandlers} />;
    }
  }

  async function handleOpenDeckCraft() {
    setOpeningDeckCraft(true);
    try {
      await generations.openInDeckCraft(id);
    } catch (err) {
      console.error('Failed to open DeckCraft:', err);
    }
    setOpeningDeckCraft(false);
  }

  async function handleSaveToLibrary() {
    setSavingToLibrary(true);
    try {
      await assets.save(Number(id), gen.brief?.topic);
      setSavedToLibrary(true);
    } catch (err) {
      console.error('Save to library failed:', err);
    }
    setSavingToLibrary(false);
  }

  const hasSpeakerNotes = layout !== 'title';

  return (
    <main className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 px-4 py-2 border-b border-border bg-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="font-heading text-[18px] leading-6 font-bold tracking-tight m-0 truncate max-w-[200px] lg:max-w-none">
            {gen.brief?.topic || 'Slide deck'}
          </h1>
          <span className="chip-muted text-[11px]">Draft</span>
          {saving && <span className="text-xs text-slate animate-pulse">Saving...</span>}
          <span className="text-[12px] text-slate hidden sm:inline">{slides.length} slides</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button type="button" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-md text-slate hover:text-navy hover:bg-canvas disabled:opacity-25 disabled:cursor-default cursor-pointer bg-transparent border-0 transition-colors">
            <Undo2 size={15} />
          </button>
          <button type="button" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
            className="p-1.5 rounded-md text-slate hover:text-navy hover:bg-canvas disabled:opacity-25 disabled:cursor-default cursor-pointer bg-transparent border-0 transition-colors">
            <Redo2 size={15} />
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button type="button" onClick={handleOpenDeckCraft}
            disabled={openingDeckCraft}
            className="btn-outline text-[12px] gap-1 py-1 px-2 hidden sm:flex">
            {openingDeckCraft ? '...' : <><ExternalLink size={13} />DeckCraft</>}
          </button>
          <button type="button" onClick={handleSaveToLibrary}
            disabled={savingToLibrary || savedToLibrary}
            className="btn-outline text-[12px] gap-1 py-1 px-2">
            {savedToLibrary ? <><Check size={13} /></> : savingToLibrary ? '...' : <><BookmarkPlus size={13} /><span className="hidden sm:inline">Save</span></>}
          </button>
          <a href={generations.downloadUrl(id)} download
            className="btn-primary text-[12px] gap-1 py-1 px-2 no-underline">
            <Download size={13} /><span className="hidden sm:inline">PPTX</span>
          </a>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button type="button" onClick={() => setChatOpen(!chatOpen)} title="Toggle edit chat"
            className={`p-1.5 rounded-md cursor-pointer border-0 transition-colors ${
              chatOpen ? 'text-navy bg-[#EAF0F8]' : 'text-slate hover:text-navy hover:bg-canvas bg-transparent'
            }`}>
            <MessageSquare size={15} />
          </button>
        </div>
      </div>

      {/* Main area: slide nav + preview + panel */}
      <div className="flex-1 flex min-h-0">
        {/* Slide nav — left panel */}
        <nav className="w-[100px] lg:w-[200px] shrink-0 border-r border-border bg-white overflow-y-auto py-2 px-1.5 lg:px-2">
          <ol className="list-none m-0 p-0 flex flex-col gap-1">
            {slides.map((s, i) => (
              <li key={i}>
                <button type="button" onClick={() => { setActiveSlide(i); setChatHistory([]); }}
                  className={`w-full flex flex-col lg:flex-row gap-1 lg:gap-2 items-center min-h-[40px] px-1 lg:px-1.5 py-1 rounded-lg text-left cursor-pointer border-2 transition-all ${
                    i === activeSlide ? 'border-navy bg-[#F5F8FC] shadow-sm' : 'border-transparent hover:bg-[#F0F4F8] hover:border-[#E2E8F0]'
                  }`}>
                  <div className="w-[52px] h-[30px] lg:w-[44px] lg:h-[26px] shrink-0 rounded-[3px] overflow-hidden shadow-sm">
                    <SlideThumbnail layout={s.layout || 'bullets'} />
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <span className="block text-[10px] lg:text-[11px] font-semibold text-ink truncate leading-tight text-center lg:text-left">
                      {i + 1}
                      <span className="hidden lg:inline"> &middot; {LAYOUT_LABELS[s.layout] || 'Bullets'}</span>
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Slide preview — center, fills remaining space */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#E8ECF0] overflow-hidden">
          <SlideFitContainer>
            <article className="rounded-lg shadow-lg overflow-hidden relative bg-white w-full h-full">
              <SlideFrame noPad={layout === 'title'}>{renderSlide()}</SlideFrame>
            </article>
          </SlideFitContainer>

          {/* Speaker notes — bottom strip */}
          {hasSpeakerNotes && content && (
            <div className="shrink-0 border-t border-border bg-white max-h-[100px] overflow-y-auto">
              <div className="px-4 py-2">
                <span className="text-[11px] font-semibold text-slate uppercase tracking-wide">Speaker notes</span>
                <AutoTextarea value={content.speaker_notes || ''}
                  onChange={(val) => updateSlideField('speaker_notes', val)}
                  className={`${inputBase} text-[13px] text-slate leading-relaxed w-full mt-1`}
                  placeholder="Add speaker notes..." />
              </div>
            </div>
          )}
        </div>

        {/* Edit chat — right panel (toggleable) */}
        {chatOpen && (
          <div className="w-[280px] shrink-0 border-l border-border bg-white flex flex-col overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
              <span className="text-[13px] font-semibold text-navy">Edit with chat</span>
              <button type="button" onClick={() => setChatOpen(false)}
                className="p-1 rounded text-slate hover:text-navy hover:bg-canvas cursor-pointer bg-transparent border-0">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
              {chatHistory.length === 0 && <p className="hint text-[13px]">Tell me what to change on this slide.</p>}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`text-[13px] px-3 py-2 rounded-lg ${
                  msg.role === 'user' ? 'bg-navy text-white self-end max-w-[85%]' : 'bg-[#F1F5F9] self-start max-w-[85%]'
                }`}>{msg.content}</div>
              ))}
              {chatLoading && <p className="hint text-[13px] animate-pulse">Thinking...</p>}
            </div>
            <form onSubmit={handleEditSubmit} className="shrink-0 flex gap-2 px-3 py-2.5 border-t border-border">
              <input className="field flex-1 text-[13px]" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                placeholder="e.g. Make the title shorter" disabled={chatLoading} />
              <button type="submit" disabled={chatLoading || !chatInput.trim()} className="btn-primary px-2.5 py-1.5">
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
