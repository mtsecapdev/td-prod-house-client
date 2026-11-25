import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, Undo2, Redo2, Download, BookmarkPlus, Check, ExternalLink, Loader2, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { generations, assets } from '../services/api';
import DiagramCodePanel from '../components/DiagramCodePanel';
import Pictures from '../components/figures/Pictures';
import { newPicture, samePicture } from '../components/figures/pictureLayout';
import ItemToolbar from '../components/plan/ItemToolbar';
import TemplateMenu from '../components/plan/TemplateMenu';
import { useLiveWrite } from '../components/plan/useLiveWrite';
import { useItemDelete, shiftedHistory } from '../components/plan/useItemDelete';
import DeletedToast from '../components/plan/DeletedToast';
import { useTemplates, findTemplate, templateStyle } from '../components/plan/templates';
import SlideCanvas, { AutoTextarea, inputBase, SLIDE_W, SLIDE_H } from '../components/slides/SlideCanvas';
import { useSlideEngine } from '../components/slides/engine';

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

function SlideFrame({ children }) {
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
      <div style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}

// Content paths: ['points', 2, 'detail'] reaches content.points[2].detail.
const getIn = (obj, path) => path.reduce((o, k) => o?.[k], obj);
function setIn(obj, path, value) {
  const parent = getIn(obj, path.slice(0, -1));
  if (parent) parent[path[path.length - 1]] = value;
}

/** A slide in the list: the slide itself, drawn small from the same boxes. */
function SlideThumbnail({ engine, slide, number, style }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(0.05);
  useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new ResizeObserver(() => ref.current && setScale(ref.current.clientWidth / SLIDE_W));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="w-full h-full overflow-hidden bg-white" style={style}>
      {engine && slide.content && (
        <div style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <SlideCanvas layout={engine.layoutSlide(slide, number)} />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN REVIEW PAGE
   ══════════════════════════════════════ */

/**
 * The slide deck editor, shown beside the chat. Changes are asked for in the chat: the selected slide is reported
 * through onSelect, "+" between slides through onAddAfter, and quick actions (Shorter, Simpler) through onAsk.
 * reloadKey changes when the chat has changed the deck, so it is fetched again; focus ({ index }) selects a slide;
 * command ({ picture }) adds a figure or generated image from the chat to the selected slide.
 */
export default function Review({ id, reloadKey = 0, addAfter = null, focus = null, command = null, onSelect, onAddAfter, onAsk, onClose, expanded, onToggleExpand }) {
  const [gen, setGen] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [openingDeckCraft, setOpeningDeckCraft] = useState(false);
  const saveTimer = useRef(null);
  const undoStack = useRef({});
  const [stackSizes, setStackSizes] = useState({});
  const redoStack = useRef({});
  const navRef = useRef(null);
  // Slides that are not written yet are written now and appear one by one.
  const live = useLiveWrite(id, gen, setGen, 'slides');
  const engine = useSlideEngine();
  const templateData = useTemplates();
  const template = findTemplate(templateData, gen?.brief?.template);

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
    generations.get(id).then(({ generation }) => setGen(generation)).catch(() => {});
  }, [id, reloadKey]);

  // While a change asked for in the chat is applied (a background job), refresh so slides change in place.
  const jobRunning = gen?.job?.state === 'running' && live.phase !== 'writing';
  useEffect(() => {
    if (!jobRunning) return undefined;
    const t = setInterval(() => generations.get(id).then(({ generation }) => setGen(generation)).catch(() => {}), 2500);
    return () => clearInterval(t);
  }, [jobRunning, id]);

  useEffect(() => { onSelect?.(activeSlide); }, [activeSlide]); // eslint-disable-line react-hooks/exhaustive-deps
  // A figure or generated image sent from the chat goes onto the selected slide (one undo step).
  const seenCommand = useRef(null);
  useEffect(() => {
    if (!command || command === seenCommand.current || !gen?.outline?.slides?.[activeSlide]?.content) return;
    seenCommand.current = command;
    const s = gen.outline.slides[activeSlide];
    const pics = s.content.pictures || [];
    if (pics.some((p) => samePicture(p, command.picture))) return; // already on this slide
    updateSlideField('pictures', [...pics, newPicture(command.picture, { box: engine?.pictureBoxFor(s.layout, pics.length), existing: pics.length })]);
  }, [command, gen, engine]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new focus request (e.g. "Show" on a change made from the chat) selects that slide.
  const [seenFocus, setSeenFocus] = useState(null);
  if (focus && focus !== seenFocus) {
    setSeenFocus(focus);
    setActiveSlide(focus.index);
  }

  const saveOutline = useCallback((updatedGen) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try { await generations.updateOutline(updatedGen.id, updatedGen.outline); }
      catch (err) { console.error('Save failed:', err); }
      setSaving(false);
    }, 800);
  }, []);

  // The stacks live in refs; their sizes are mirrored in state so the undo/redo buttons render from state.
  function syncStacks(idx) {
    setStackSizes((sizes) => ({ ...sizes, [idx]: { undo: getUndoStack(idx).length, redo: getRedoStack(idx).length } }));
  }

  function getUndoStack(idx) { if (!undoStack.current[idx]) undoStack.current[idx] = []; return undoStack.current[idx]; }
  function getRedoStack(idx) { if (!redoStack.current[idx]) redoStack.current[idx] = []; return redoStack.current[idx]; }

  function undo() {
    if (!gen) return;
    const stack = getUndoStack(activeSlide);
    if (stack.length === 0) return;
    const prev = stack.pop();
    const current = gen.outline.slides[activeSlide]?.content;
    if (current) getRedoStack(activeSlide).push(JSON.parse(JSON.stringify(current)));
    syncStacks(activeSlide);
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
    syncStacks(activeSlide);
    const updatedSlides = gen.outline.slides.map((s, i) =>
      i === activeSlide ? { ...s, content: next, title: next.title || s.title } : s,
    );
    const updatedGen = { ...gen, outline: { ...gen.outline, slides: updatedSlides } };
    setGen(updatedGen);
    saveOutline(updatedGen);
  }

  const canUndo = (stackSizes[activeSlide]?.undo || 0) > 0;
  const canRedo = (stackSizes[activeSlide]?.redo || 0) > 0;

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) { e.preventDefault(); redo(); }
        else { e.preventDefault(); undo(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      // Delete/Backspace removes the selected slide when the slide list has focus (a selected picture handles
      // the key itself first and marks it handled).
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.defaultPrevented && navRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        itemDelete.remove(activeSlide);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const itemDelete = useItemDelete({
    gen, setGen, listKey: 'slides', saveOutline,
    shiftHistory: (at, delta) => {
      undoStack.current = shiftedHistory(undoStack.current, at, delta);
      redoStack.current = shiftedHistory(redoStack.current, at, delta);
      setStackSizes((sizes) => shiftedHistory(sizes, at, delta));
    },
    active: activeSlide, setActive: setActiveSlide, blocked: live.phase === 'writing',
  });

  if (!gen || !gen.outline?.slides) {
    return <main className="max-w-[1180px] w-[90%] mx-auto py-8"><p className="hint">Loading...</p></main>;
  }

  const slides = gen.outline.slides;
  const slide = slides[activeSlide];
  const content = slide?.content;
  const layout = slide?.layout;

  function applyUpdate(updatedGen) {
    const currentContent = gen.outline.slides[activeSlide]?.content;
    if (currentContent) {
      getUndoStack(activeSlide).push(JSON.parse(JSON.stringify(currentContent)));
      getRedoStack(activeSlide).length = 0;
      syncStacks(activeSlide);
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

  // Several fields as one edit (one undo step), e.g. diagram code and its rendered image.
  function updateSlideFields(fields) {
    const updatedContent = { ...content, ...fields };
    const updatedSlides = slides.map((s, i) =>
      i === activeSlide ? { ...s, content: updatedContent, title: fields.title ?? s.title } : s,
    );
    applyUpdate({ ...gen, outline: { ...gen.outline, slides: updatedSlides } });
  }

  // Edits by content path (the paths the layout engine gives each text, icon and list).
  function editContent(change) {
    const next = structuredClone(content);
    change(next);
    const updatedSlides = slides.map((s, i) => (i === activeSlide ? { ...s, content: next, title: next.title ?? s.title } : s));
    applyUpdate({ ...gen, outline: { ...gen.outline, slides: updatedSlides } });
  }
  const setText = (path, value) => editContent((c) => setIn(c, path, value));
  // A new entry for the list a control belongs to: a table row of empty cells, else the spec's empty entry.
  function insertEntry(control, index) {
    const names = control.path.filter((k) => typeof k === 'string');
    const entry = control.path[0] === 'rows'
      ? Array((content.columns || []).length).fill('')
      : engine.newEntry(layout, names);
    editContent((c) => getIn(c, control.path).splice(index + 1, 0, entry));
  }
  const removeEntry = (path, index) => editContent((c) => getIn(c, path).splice(index, 1));
  function moveEntry(path, index, dir) {
    editContent((c) => {
      const list = getIn(c, path);
      const to = index + dir;
      if (to < 0 || to >= list.length) return;
      [list[index], list[to]] = [list[to], list[index]];
    });
  }
  function listBounds(control) {
    if (control.path[0] === 'rows') return { min: 1, max: engine.KINDS[layout].fields.grid.rows };
    return engine.listBounds(layout, control.path.filter((k) => typeof k === 'string'));
  }

  function renderSlide() {
    if (!content) {
      return (
        <div className="w-full h-full bg-white flex flex-col items-center justify-center gap-3 text-center">
          {live.phase === 'error'
            ? <p className="text-red-700 text-[14px] m-0">Writing stopped: {live.message}</p>
            : <><Loader2 size={28} className="text-cobalt animate-spin" /><p className="text-[16px] text-slate m-0">Writing “{slide.title}”…</p></>}
        </div>
      );
    }
    if (!engine) return <div className="w-full h-full bg-white" />;
    const laid = engine.layoutSlide(slide, activeSlide + 1);
    return (
      <SlideCanvas layout={laid} icons={engine.ICON_NAMES} editable
        onText={setText} onIcon={setText} onInsert={insertEntry} onRemove={removeEntry} onMove={moveEntry} bounds={listBounds}
        diagram={{ genId: id, templateId: template?.id, file: content.diagram_file, alt: content.caption || content.title,
          value: content.image, onChange: (v) => updateSlideField('image', v) }}>
        <Pictures key={activeSlide} slide boxes={laid.pictureBoxes} pictures={content.pictures || []}
          documentIds={gen.source_document_ids || []}
          onChange={(list) => updateSlideField('pictures', list.length ? list : undefined)} />
      </SlideCanvas>
    );
  }

  // Switching template is instant: it only restyles the preview and the next download.
  async function changeTemplate(templateId) {
    setGen((g) => ({ ...g, brief: { ...g.brief, template: templateId } }));
    try { await generations.updateBrief(id, { template: templateId }); } catch (err) { console.error('Template change failed:', err); }
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
      await assets.save(Number(id), gen.name);
      setSavedToLibrary(true);
    } catch (err) {
      console.error('Save to library failed:', err);
    }
    setSavingToLibrary(false);
  }

  const hasSpeakerNotes = layout !== 'title' && layout !== 'section';

  return (
    <main className="h-full flex flex-col overflow-hidden bg-white">
      {/* Top bar */}
      <div className="shrink-0 px-4 py-2 border-b border-border bg-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="font-heading text-[18px] leading-6 font-bold tracking-tight m-0 truncate max-w-[200px] lg:max-w-none">
            {gen.name || 'Slide deck'}
          </h1>
          <span className="chip-muted text-[11px]">Draft</span>
          {saving && <span className="text-xs text-slate animate-pulse">Saving...</span>}
          {live.phase === 'writing' && (
            <span className="text-[12px] text-cobalt flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />Writing {Math.min(live.current || 1, slides.length)} of {slides.length}
            </span>
          )}
          {live.phase === 'error' && (
            <button type="button" onClick={live.retry} className="text-[12px] text-red-700 bg-transparent border-0 cursor-pointer underline">
              Writing stopped. Retry
            </button>
          )}
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
          <TemplateMenu templates={templateData.templates} value={template?.id} onChange={changeTemplate} />
          <button type="button" onClick={handleOpenDeckCraft}
            disabled={openingDeckCraft}
            className="btn-outline text-[12px] gap-1 py-1 px-2 hidden sm:flex">
            {openingDeckCraft ? '...' : <><ExternalLink size={13} />DeckCraft</>}
          </button>
          <button type="button" onClick={handleSaveToLibrary}
            disabled={savingToLibrary || savedToLibrary}
            title={savedToLibrary ? 'Saved to the Library' : 'Save a copy to the Library'}
            className="btn-outline text-[12px] gap-1 py-1 px-2">
            {savedToLibrary ? <><Check size={13} /></> : savingToLibrary ? '...' : <><BookmarkPlus size={13} /><span className="hidden sm:inline">Save</span></>}
          </button>
          <a href={generations.downloadUrl(id)} download
            className="btn-primary text-[12px] gap-1 py-1 px-2 no-underline">
            <Download size={13} /><span className="hidden sm:inline">PPTX</span>
          </a>
          <div className="w-px h-4 bg-border mx-0.5" />
          {onToggleExpand && (
            <button type="button" onClick={onToggleExpand} title={expanded ? 'Back to the chat' : 'Full screen'}
              className="p-1.5 rounded-md text-slate hover:text-navy hover:bg-canvas cursor-pointer bg-transparent border-0">
              {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} title="Close"
              className="p-1.5 rounded-md text-slate hover:text-navy hover:bg-canvas cursor-pointer bg-transparent border-0">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Main area: slide nav + preview + panel */}
      <div className="flex-1 flex min-h-0">
        {/* Slide nav — left panel */}
        <nav ref={navRef} className="w-[100px] lg:w-[200px] shrink-0 border-r border-border bg-white overflow-y-auto py-2 px-1.5 lg:px-2">
          <ol className="list-none m-0 p-0 flex flex-col gap-1">
            {slides.map((s, i) => (
              <li key={i} className="group/item relative">
                <button type="button" onClick={() => setActiveSlide(i)}
                  className={`w-full flex flex-col lg:flex-row gap-1 lg:gap-2 items-center min-h-[40px] px-1 lg:px-1.5 py-1 rounded-lg text-left cursor-pointer border-2 transition-all ${
                    i === activeSlide ? 'border-navy bg-[#F5F8FC] shadow-sm' : 'border-transparent hover:bg-[#F0F4F8] hover:border-[#E2E8F0]'
                  }`}>
                  <div className={`w-[52px] h-[30px] lg:w-[48px] lg:h-[27px] shrink-0 rounded-[3px] overflow-hidden shadow-sm border border-border ${s.content ? '' : 'opacity-30 animate-pulse'}`}>
                    <SlideThumbnail engine={engine} slide={s} number={i + 1} style={templateStyle(template)} />
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <span className="block text-[10px] lg:text-[11px] font-semibold text-ink truncate leading-tight text-center lg:text-left">
                      {i + 1}
                      <span className="hidden lg:inline"> &middot; {engine?.KINDS[s.layout]?.label || 'Old slide'}</span>
                    </span>
                  </div>
                </button>
                {itemDelete.canDelete && (
                  <button type="button" onClick={() => itemDelete.remove(i)} title={`Delete slide ${i + 1}`} aria-label={`Delete slide ${i + 1}`}
                    className="absolute right-1 top-1 z-10 w-6 h-6 rounded-md bg-white/90 border-0 text-slate hover:text-red-700 hover:bg-red-50 cursor-pointer flex items-center justify-center opacity-0 group-hover/item:opacity-100 focus:opacity-100">
                    <Trash2 size={13} />
                  </button>
                )}
                {/* Add a slide here: shown between slides on hover */}
                <button type="button" onClick={() => onAddAfter?.(i)}
                  title={`Add a slide after slide ${i + 1}`}
                  className={`absolute left-1/2 -translate-x-1/2 -bottom-2.5 z-10 w-5 h-5 rounded-full bg-white border border-border text-slate hover:text-navy hover:border-navy cursor-pointer flex items-center justify-center ${
                    addAfter === i ? 'opacity-100 border-navy text-navy' : 'opacity-0 group-hover/item:opacity-100'}`}>
                  <Plus size={12} />
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Slide preview — center, fills remaining space */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#E8ECF0] overflow-hidden">
          <ItemToolbar key={activeSlide} type="deck" genId={id} index={activeSlide} item={slides[activeSlide]}
            documentIds={gen.source_document_ids || []}
            onAsk={(instruction, label) => onAsk?.(instruction, label, activeSlide)}
            onUpdated={async () => { const r = await generations.get(id); setGen(r.generation); }}
            onAddFigure={(f) => updateSlideField('pictures', [...(content?.pictures || []),
              newPicture(f, { box: engine?.pictureBoxFor(layout, (content?.pictures || []).length), existing: (content?.pictures || []).length })])} />
          <SlideFitContainer>
            <article className="rounded-lg shadow-lg overflow-hidden relative bg-white w-full h-full" style={templateStyle(template)}>
              <SlideFrame>{renderSlide()}</SlideFrame>
            </article>
          </SlideFitContainer>

          {/* Diagram code and PNG download — kept outside the scaled slide so it stays readable */}
          {layout === 'diagram' && content && (
            <div className="shrink-0 border-t border-border bg-white px-4 py-2 max-h-[45%] overflow-y-auto">
              <DiagramCodePanel key={activeSlide} genId={id} content={content} templateId={template?.id}
                downloadName={content.title || 'diagram'}
                onApply={(code, key) => updateSlideFields({ mermaid_code: code, diagram_file: key })} />
            </div>
          )}

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

      </div>
      <DeletedToast removed={itemDelete.removed} noun="slide" onUndo={itemDelete.undo} onClose={itemDelete.dismiss} />
    </main>
  );
}
