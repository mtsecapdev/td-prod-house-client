import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Undo2, Redo2, Download, BookmarkPlus, Check, Plus, X, AlertTriangle, MessageSquare, ExternalLink, Loader2, Pencil } from 'lucide-react';
import { generations, assets } from '../services/api';
import DiagramCodePanel from '../components/DiagramCodePanel';
import ItemPanel from '../components/plan/ItemPanel';
import AddItemForm from '../components/plan/AddItemForm';
import Pictures from '../components/figures/Pictures';
import { newPicture } from '../components/figures/pictureLayout';
import AdjustableImage from '../components/figures/AdjustableImage';
import TemplateMenu from '../components/plan/TemplateMenu';
import AgentPanel from '../components/plan/AgentPanel';
import { useLiveWrite } from '../components/plan/useLiveWrite';
import { useTemplates, findTemplate, templateStyle } from '../components/plan/templates';

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

const TYPE_LABELS = {
  heading: 'Heading', body: 'Body', procedure: 'Procedure',
  key_points: 'Key Points', reference_table: 'Table', diagram: 'Diagram', figure: 'Figure', summary: 'Summary',
};

function HeadingSection({ content, onField }) {
  return (
    <div className="py-8 border-b-2 border-navy/20">
      <AutoTextarea value={content.title}
        onChange={(val) => onField('title', val)}
        className={`${inputBase} font-heading text-[28px] leading-[1.15] font-bold tracking-tight text-navy`}
        placeholder="Document title" />
      {content.subtitle !== undefined && (
        <AutoTextarea value={content.subtitle}
          onChange={(val) => onField('subtitle', val)}
          className={`${inputBase} text-[16px] text-slate mt-2`}
          placeholder="Subtitle" />
      )}
      <div className="w-16 h-[3px] bg-cobalt rounded-full mt-4" />
      {content.summary !== undefined && (
        <AutoTextarea value={content.summary}
          onChange={(val) => onField('summary', val)}
          className={`${inputBase} text-[15px] text-slate mt-4 leading-relaxed`}
          placeholder="Executive summary" />
      )}
    </div>
  );
}

function BodySection({ content, onField, onParagraph, onAddParagraph, onRemoveParagraph }) {
  return (
    <div className="py-6">
      <AutoTextarea value={content.title}
        onChange={(val) => onField('title', val)}
        className={`${inputBase} font-heading text-[22px] font-bold text-navy mb-4`}
        placeholder="Section title" />
      {(content.paragraphs || []).map((p, i) => (
        <div key={i} className="group mb-4 relative">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <AutoTextarea value={p.subheading}
                onChange={(val) => onParagraph(i, 'subheading', val)}
                className={`${inputBase} text-[15px] font-semibold text-navy`}
                placeholder="Subheading" />
              <AutoTextarea value={p.text}
                onChange={(val) => onParagraph(i, 'text', val)}
                className={`${inputBase} text-[15px] text-ink leading-relaxed`}
                placeholder="Paragraph text" />
            </div>
            <div className="flex gap-0.5 pt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={() => onAddParagraph(i)} title="Add paragraph below"
                className="p-0 w-5 h-5 flex items-center justify-center text-slate hover:text-cobalt cursor-pointer bg-transparent border-0"><Plus size={13} /></button>
              <button type="button" onClick={() => onRemoveParagraph(i)} title="Remove" disabled={(content.paragraphs || []).length <= 1}
                className="p-0 w-5 h-5 flex items-center justify-center text-slate hover:text-red-600 disabled:opacity-20 cursor-pointer disabled:cursor-default bg-transparent border-0"><X size={13} /></button>
            </div>
          </div>
        </div>
      ))}
      {content.key_takeaway !== undefined && (
        <div className="mt-4 p-4 bg-cobalt/5 rounded-lg border-l-4 border-cobalt">
          <span className="text-[13px] font-bold text-cobalt block mb-1">Key Takeaway</span>
          <AutoTextarea value={content.key_takeaway}
            onChange={(val) => onField('key_takeaway', val)}
            className={`${inputBase} text-[14px] text-ink leading-relaxed`}
            placeholder="Key takeaway" />
        </div>
      )}
    </div>
  );
}

function ProcedureSection({ content, onField, onStep, onAddStep, onRemoveStep }) {
  return (
    <div className="py-6">
      <AutoTextarea value={content.title}
        onChange={(val) => onField('title', val)}
        className={`${inputBase} font-heading text-[22px] font-bold text-navy mb-2`}
        placeholder="Section title" />
      {content.introduction !== undefined && (
        <AutoTextarea value={content.introduction}
          onChange={(val) => onField('introduction', val)}
          className={`${inputBase} text-[15px] text-slate mb-4 leading-relaxed`}
          placeholder="Introduction" />
      )}
      {(content.steps || []).map((step, i) => (
        <div key={i} className="group flex gap-3 items-start py-2">
          <div className="w-[30px] h-[30px] rounded-lg bg-gradient-to-br from-navy to-[#1E4A7A] text-white text-[13px] font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            {step.step_number || i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <AutoTextarea value={step.action}
              onChange={(val) => onStep(i, 'action', val)}
              className={`${inputBase} text-[15px] font-semibold text-ink`}
              placeholder="Action" />
            <AutoTextarea value={step.detail}
              onChange={(val) => onStep(i, 'detail', val)}
              className={`${inputBase} text-[14px] text-slate leading-relaxed`}
              placeholder="Detail" />
            {step.caution && (
              <div className="flex items-start gap-1.5 mt-1 text-[13px] text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <AutoTextarea value={step.caution}
                  onChange={(val) => onStep(i, 'caution', val)}
                  className={`${inputBase} text-[13px] text-red-600 font-medium`}
                  placeholder="Caution" />
              </div>
            )}
          </div>
          <div className="flex gap-0.5 pt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => onAddStep(i)} title="Add step below"
              className="p-0 w-5 h-5 flex items-center justify-center text-slate hover:text-cobalt cursor-pointer bg-transparent border-0"><Plus size={13} /></button>
            <button type="button" onClick={() => onRemoveStep(i)} title="Remove" disabled={(content.steps || []).length <= 1}
              className="p-0 w-5 h-5 flex items-center justify-center text-slate hover:text-red-600 disabled:opacity-20 cursor-pointer disabled:cursor-default bg-transparent border-0"><X size={13} /></button>
          </div>
        </div>
      ))}
      {content.notes !== undefined && content.notes && (
        <div className="mt-4 text-[13px] text-slate">
          <AutoTextarea value={content.notes}
            onChange={(val) => onField('notes', val)}
            className={`${inputBase} text-[13px] text-slate leading-relaxed`}
            placeholder="Notes" />
        </div>
      )}
    </div>
  );
}

function KeyPointsSection({ content, onField, onPoint, onAddPoint, onRemovePoint }) {
  return (
    <div className="py-6">
      <AutoTextarea value={content.title}
        onChange={(val) => onField('title', val)}
        className={`${inputBase} font-heading text-[22px] font-bold text-navy mb-2`}
        placeholder="Section title" />
      {content.introduction !== undefined && (
        <AutoTextarea value={content.introduction}
          onChange={(val) => onField('introduction', val)}
          className={`${inputBase} text-[15px] text-slate mb-4 leading-relaxed`}
          placeholder="Introduction" />
      )}
      {(content.points || []).map((pt, i) => (
        <div key={i} className="group flex gap-3 items-start py-2">
          <div className="w-2 h-2 rounded-full bg-cobalt shrink-0 mt-2" />
          <div className="flex-1 min-w-0">
            <AutoTextarea value={pt.label}
              onChange={(val) => onPoint(i, 'label', val)}
              className={`${inputBase} text-[15px] font-bold text-cobalt`}
              placeholder="Label" />
            <AutoTextarea value={pt.description}
              onChange={(val) => onPoint(i, 'description', val)}
              className={`${inputBase} text-[14px] text-ink leading-relaxed`}
              placeholder="Description" />
          </div>
          <div className="flex gap-0.5 pt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => onAddPoint(i)} title="Add point below"
              className="p-0 w-5 h-5 flex items-center justify-center text-slate hover:text-cobalt cursor-pointer bg-transparent border-0"><Plus size={13} /></button>
            <button type="button" onClick={() => onRemovePoint(i)} title="Remove" disabled={(content.points || []).length <= 1}
              className="p-0 w-5 h-5 flex items-center justify-center text-slate hover:text-red-600 disabled:opacity-20 cursor-pointer disabled:cursor-default bg-transparent border-0"><X size={13} /></button>
          </div>
        </div>
      ))}
      {content.notes !== undefined && content.notes && (
        <AutoTextarea value={content.notes}
          onChange={(val) => onField('notes', val)}
          className={`${inputBase} text-[13px] text-slate mt-4 leading-relaxed`}
          placeholder="Notes" />
      )}
    </div>
  );
}

function ReferenceTableSection({ content, onField, onCell, onAddRow, onRemoveRow, onAddColumn, onRemoveColumn, onColumnHeader }) {
  const columns = content.columns || [];
  const rows = content.rows || [];
  return (
    <div className="py-6">
      <AutoTextarea value={content.title}
        onChange={(val) => onField('title', val)}
        className={`${inputBase} font-heading text-[22px] font-bold text-navy mb-2`}
        placeholder="Section title" />
      {content.introduction !== undefined && (
        <AutoTextarea value={content.introduction}
          onChange={(val) => onField('introduction', val)}
          className={`${inputBase} text-[15px] text-slate mb-4 leading-relaxed`}
          placeholder="Introduction" />
      )}
      {columns.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr>
                {columns.map((col, ci) => (
                  <th key={ci} className="border border-[#E2E8F0] bg-navy/5 px-3 py-2 text-left">
                    <input type="text" value={col}
                      onChange={(e) => onColumnHeader(ci, e.target.value)}
                      className={`${inputBase} text-[13px] font-bold text-navy`}
                      placeholder="Header" />
                  </th>
                ))}
                <th className="border border-[#E2E8F0] bg-navy/5 px-1 py-1 w-8">
                  <button type="button" onClick={onAddColumn} title="Add column"
                    className="p-0 w-5 h-5 flex items-center justify-center text-slate hover:text-cobalt cursor-pointer bg-transparent border-0"><Plus size={12} /></button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="group">
                  {columns.map((_, ci) => (
                    <td key={ci} className="border border-[#E2E8F0] px-3 py-1.5">
                      <input type="text" value={row[ci] || ''}
                        onChange={(e) => onCell(ri, ci, e.target.value)}
                        className={`${inputBase} text-[13px]`}
                        placeholder="-" />
                    </td>
                  ))}
                  <td className="border border-[#E2E8F0] px-1 py-1 w-8">
                    <button type="button" onClick={() => onRemoveRow(ri)} title="Remove row"
                      className="p-0 w-5 h-5 flex items-center justify-center text-slate hover:text-red-600 opacity-0 group-hover:opacity-100 cursor-pointer bg-transparent border-0 transition-opacity"><X size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={onAddRow}
            className="mt-2 text-[13px] text-cobalt hover:text-navy cursor-pointer bg-transparent border-0 flex items-center gap-1">
            <Plus size={12} />Add row
          </button>
        </div>
      )}
      {content.notes !== undefined && content.notes && (
        <AutoTextarea value={content.notes}
          onChange={(val) => onField('notes', val)}
          className={`${inputBase} text-[13px] text-slate mt-4 leading-relaxed`}
          placeholder="Notes" />
      )}
    </div>
  );
}

function SummarySection({ content, onField, onRecapPoint, onAddRecapPoint, onRemoveRecapPoint }) {
  return (
    <div className="py-6">
      <AutoTextarea value={content.title}
        onChange={(val) => onField('title', val)}
        className={`${inputBase} font-heading text-[22px] font-bold text-navy mb-4`}
        placeholder="Section title" />
      {(content.recap_points || []).map((pt, i) => (
        <div key={i} className="group flex gap-2 items-start py-1">
          <span className="text-cobalt mt-1 shrink-0">&#8226;</span>
          <AutoTextarea value={pt}
            onChange={(val) => onRecapPoint(i, val)}
            className={`${inputBase} text-[15px] text-ink leading-relaxed flex-1`}
            placeholder="Recap point" />
          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => onAddRecapPoint(i)} title="Add point below"
              className="p-0 w-5 h-5 flex items-center justify-center text-slate hover:text-cobalt cursor-pointer bg-transparent border-0"><Plus size={13} /></button>
            <button type="button" onClick={() => onRemoveRecapPoint(i)} title="Remove" disabled={(content.recap_points || []).length <= 1}
              className="p-0 w-5 h-5 flex items-center justify-center text-slate hover:text-red-600 disabled:opacity-20 cursor-pointer disabled:cursor-default bg-transparent border-0"><X size={13} /></button>
          </div>
        </div>
      ))}
      {content.next_steps !== undefined && (
        <div className="mt-4 p-4 bg-navy/5 rounded-lg">
          <span className="text-[13px] font-bold text-navy block mb-1">Next Steps</span>
          <AutoTextarea value={content.next_steps}
            onChange={(val) => onField('next_steps', val)}
            className={`${inputBase} text-[14px] text-ink leading-relaxed`}
            placeholder="Next steps" />
        </div>
      )}
      {content.notes !== undefined && content.notes && (
        <AutoTextarea value={content.notes}
          onChange={(val) => onField('notes', val)}
          className={`${inputBase} text-[13px] text-slate mt-4 leading-relaxed`}
          placeholder="Notes" />
      )}
    </div>
  );
}

// Title and introduction; the figure (the section's first picture) comes next, then the notes.
function FigureSection({ content, onField, children }) {
  return (
    <div className="py-6">
      <AutoTextarea value={content.title}
        onChange={(val) => onField('title', val)}
        className={`${inputBase} font-heading text-[22px] font-bold text-navy mb-2`}
        placeholder="Section title" />
      <AutoTextarea value={content.introduction || ''}
        onChange={(val) => onField('introduction', val)}
        className={`${inputBase} text-[15px] text-slate mb-4 leading-relaxed`}
        placeholder="Introduction" />
      {children}
      {content.notes && (
        <AutoTextarea value={content.notes}
          onChange={(val) => onField('notes', val)}
          className={`${inputBase} text-[13px] text-slate mt-4 leading-relaxed`}
          placeholder="Notes" />
      )}
    </div>
  );
}

function DiagramSection({ content, genId, templateId, onField, onApplyCode }) {
  return (
    <div className="py-6">
      <AutoTextarea value={content.title}
        onChange={(val) => onField('title', val)}
        className={`${inputBase} font-heading text-[22px] font-bold text-navy mb-2`}
        placeholder="Section title" />
      <AutoTextarea value={content.introduction || ''}
        onChange={(val) => onField('introduction', val)}
        className={`${inputBase} text-[15px] text-slate mb-4 leading-relaxed`}
        placeholder="Introduction" />
      <figure className="m-0 flex flex-col items-center gap-2">
        {content.diagram_file
          ? <AdjustableImage src={generations.diagramUrl(genId, content.diagram_file, templateId)} alt={content.caption || content.title}
              value={content.image} onChange={(v) => onField('image', v)} />
          : <p className="hint">Diagram not rendered yet.</p>}
        <figcaption className="w-full">
          <AutoTextarea value={content.caption || ''}
            onChange={(val) => onField('caption', val)}
            className={`${inputBase} text-[13px] italic text-slate text-center`}
            placeholder="Figure caption" />
        </figcaption>
      </figure>
      <div className="mt-3">
        <DiagramCodePanel genId={genId} content={content} downloadName={content.title || 'figure'} onApply={onApplyCode} templateId={templateId} />
      </div>
      {content.notes && (
        <AutoTextarea value={content.notes}
          onChange={(val) => onField('notes', val)}
          className={`${inputBase} text-[13px] text-slate mt-4 leading-relaxed`}
          placeholder="Notes" />
      )}
    </div>
  );
}

export default function DocReview() {
  const { id } = useParams();
  const [gen, setGen] = useState(null);
  const [activeSection, setActiveSection] = useState(0);
  const [chatOpen, setChatOpen] = useState(true);
  const [panelTab, setPanelTab] = useState('item'); // 'item' | 'deck' (agent)
  const [addAfter, setAddAfter] = useState(null); // index the "+" was pressed after, or null
  const [saving, setSaving] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [openingWordCraft, setOpeningWordCraft] = useState(false);
  const saveTimer = useRef(null);
  const undoStack = useRef({});
  const [stackSizes, setStackSizes] = useState({});
  const redoStack = useRef({});
  const sectionRefs = useRef([]);
  // Sections that are not written yet are written now and appear one by one.
  const live = useLiveWrite(id, gen, setGen, 'sections');
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

  // The stacks live in refs; their sizes are mirrored in state so the undo/redo buttons render from state.
  function syncStacks(idx) {
    setStackSizes((sizes) => ({ ...sizes, [idx]: { undo: getUndoStack(idx).length, redo: getRedoStack(idx).length } }));
  }

  function getUndoStack(idx) { if (!undoStack.current[idx]) undoStack.current[idx] = []; return undoStack.current[idx]; }
  function getRedoStack(idx) { if (!redoStack.current[idx]) redoStack.current[idx] = []; return redoStack.current[idx]; }

  function undo() {
    if (!gen) return;
    const stack = getUndoStack(activeSection);
    if (stack.length === 0) return;
    const prev = stack.pop();
    const current = gen.outline.sections[activeSection]?.content;
    if (current) getRedoStack(activeSection).push(JSON.parse(JSON.stringify(current)));
    syncStacks(activeSection);
    const updatedSections = gen.outline.sections.map((s, i) =>
      i === activeSection ? { ...s, content: prev } : s,
    );
    const updatedGen = { ...gen, outline: { ...gen.outline, sections: updatedSections } };
    setGen(updatedGen);
    saveOutline(updatedGen);
  }

  function redo() {
    if (!gen) return;
    const stack = getRedoStack(activeSection);
    if (stack.length === 0) return;
    const next = stack.pop();
    const current = gen.outline.sections[activeSection]?.content;
    if (current) getUndoStack(activeSection).push(JSON.parse(JSON.stringify(current)));
    syncStacks(activeSection);
    const updatedSections = gen.outline.sections.map((s, i) =>
      i === activeSection ? { ...s, content: next } : s,
    );
    const updatedGen = { ...gen, outline: { ...gen.outline, sections: updatedSections } };
    setGen(updatedGen);
    saveOutline(updatedGen);
  }

  const canUndo = (stackSizes[activeSection]?.undo || 0) > 0;
  const canRedo = (stackSizes[activeSection]?.redo || 0) > 0;

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

  if (!gen || !gen.outline?.sections) {
    return <main className="h-[calc(100vh-48px)] flex items-center justify-center"><p className="hint">Loading...</p></main>;
  }

  const sections = gen.outline.sections;

  function applyUpdateAt(secIdx, updatedGen) {
    const currentContent = gen.outline.sections[secIdx]?.content;
    if (currentContent) {
      getUndoStack(secIdx).push(JSON.parse(JSON.stringify(currentContent)));
      getRedoStack(secIdx).length = 0;
      syncStacks(secIdx);
    }
    setGen(updatedGen);
    saveOutline(updatedGen);
  }

  function updateFieldAt(secIdx, field, value) {
    updateFieldsAt(secIdx, { [field]: value });
  }

  // Several fields as one edit (one undo step), e.g. diagram code and its rendered image.
  function updateFieldsAt(secIdx, fields) {
    const sec = sections[secIdx];
    const updatedContent = { ...sec.content, ...fields };
    const updatedSections = sections.map((s, i) =>
      i === secIdx ? { ...s, content: updatedContent } : s,
    );
    applyUpdateAt(secIdx, { ...gen, outline: { ...gen.outline, sections: updatedSections } });
  }

  function makeSectionHelpers(secIdx) {
    const sec = sections[secIdx];
    const c = sec?.content || {};
    const onField = (field, value) => updateFieldAt(secIdx, field, value);

    return {
      onField,
      // Body
      onParagraph: (idx, field, value) => {
        const updated = c.paragraphs.map((p, i) => i === idx ? { ...p, [field]: value } : p);
        updateFieldAt(secIdx, 'paragraphs', updated);
      },
      onAddParagraph: (after) => {
        const a = [...c.paragraphs]; a.splice(after + 1, 0, { subheading: '', text: '' });
        updateFieldAt(secIdx, 'paragraphs', a);
      },
      onRemoveParagraph: (idx) => {
        if (c.paragraphs.length <= 1) return;
        updateFieldAt(secIdx, 'paragraphs', c.paragraphs.filter((_, i) => i !== idx));
      },
      // Procedure
      onStep: (idx, field, value) => {
        const updated = c.steps.map((s, i) => i === idx ? { ...s, [field]: value } : s);
        updateFieldAt(secIdx, 'steps', updated);
      },
      onAddStep: (after) => {
        const a = [...c.steps]; a.splice(after + 1, 0, { step_number: a.length + 1, action: '', detail: '', caution: '' });
        updateFieldAt(secIdx, 'steps', a);
      },
      onRemoveStep: (idx) => {
        if (c.steps.length <= 1) return;
        updateFieldAt(secIdx, 'steps', c.steps.filter((_, i) => i !== idx));
      },
      // Key points
      onPoint: (idx, field, value) => {
        const updated = c.points.map((p, i) => i === idx ? { ...p, [field]: value } : p);
        updateFieldAt(secIdx, 'points', updated);
      },
      onAddPoint: (after) => {
        const a = [...c.points]; a.splice(after + 1, 0, { label: '', description: '' });
        updateFieldAt(secIdx, 'points', a);
      },
      onRemovePoint: (idx) => {
        if (c.points.length <= 1) return;
        updateFieldAt(secIdx, 'points', c.points.filter((_, i) => i !== idx));
      },
      // Reference table
      onCell: (rowIdx, colIdx, value) => {
        const updatedRows = c.rows.map((r, ri) =>
          ri === rowIdx ? r.map((cell, ci) => ci === colIdx ? value : cell) : r,
        );
        updateFieldAt(secIdx, 'rows', updatedRows);
      },
      onColumnHeader: (colIdx, value) => {
        updateFieldAt(secIdx, 'columns', c.columns.map((col, i) => i === colIdx ? value : col));
      },
      onAddRow: () => {
        updateFieldAt(secIdx, 'rows', [...c.rows, c.columns.map(() => '')]);
      },
      onRemoveRow: (idx) => {
        updateFieldAt(secIdx, 'rows', c.rows.filter((_, i) => i !== idx));
      },
      onAddColumn: () => {
        updateFieldAt(secIdx, 'columns', [...c.columns, 'New']);
        updateFieldAt(secIdx, 'rows', c.rows.map((r) => [...r, '']));
      },
      onRemoveColumn: (idx) => {
        updateFieldAt(secIdx, 'columns', c.columns.filter((_, i) => i !== idx));
        updateFieldAt(secIdx, 'rows', c.rows.map((r) => r.filter((_, i) => i !== idx)));
      },
      // Summary
      onRecapPoint: (idx, value) => {
        updateFieldAt(secIdx, 'recap_points', c.recap_points.map((p, i) => i === idx ? value : p));
      },
      onAddRecapPoint: (after) => {
        const a = [...c.recap_points]; a.splice(after + 1, 0, '');
        updateFieldAt(secIdx, 'recap_points', a);
      },
      onRemoveRecapPoint: (idx) => {
        if (c.recap_points.length <= 1) return;
        updateFieldAt(secIdx, 'recap_points', c.recap_points.filter((_, i) => i !== idx));
      },
    };
  }

  // Chat


  // Switching template is instant: it only restyles the preview and the next download.
  async function changeTemplate(templateId) {
    setGen((g) => ({ ...g, brief: { ...g.brief, template: templateId } }));
    try { await generations.updateBrief(id, { template: templateId }); } catch (err) { console.error('Template change failed:', err); }
  }

  async function handleOpenWordCraft() {
    setOpeningWordCraft(true);
    try {
      await generations.openInWordCraft(id);
    } catch (err) {
      console.error('Failed to open WordCraft:', err);
    }
    setOpeningWordCraft(false);
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

  function scrollToSection(i) {
    setActiveSection(i);
    setAddAfter(null);
    sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // A section with the pictures placed on it: after its content, or inside a Figure section.
  function renderSectionAt(secIdx) {
    const sec = sections[secIdx];
    if (!sec?.content) return renderSectionBody(secIdx);
    const pics = (
      <Pictures pictures={sec.content.pictures || []} documentIds={gen.source_document_ids || []}
        onChange={(list) => updateFieldAt(secIdx, 'pictures', list.length ? list : undefined)} />
    );
    if (sec.section_type === 'figure') return renderSectionBody(secIdx, pics);
    return <>{renderSectionBody(secIdx)}{pics}</>;
  }

  function renderSectionBody(secIdx, pictures = null) {
    const sec = sections[secIdx];
    const c = sec?.content;
    if (!c) {
      return (
        <div className="py-8 flex items-center gap-3 text-slate">
          {live.phase === 'error'
            ? <span className="text-red-700 text-[14px]">Writing stopped: {live.message}</span>
            : <><Loader2 size={18} className="text-cobalt animate-spin" /><span className="text-[15px]">Writing “{sec.title}”…</span></>}
        </div>
      );
    }
    const t = sec.section_type || 'body';
    const h = makeSectionHelpers(secIdx);

    switch (t) {
      case 'heading':
        return <HeadingSection content={c} onField={h.onField} />;
      case 'body':
        return <BodySection content={c} onField={h.onField}
          onParagraph={h.onParagraph} onAddParagraph={h.onAddParagraph} onRemoveParagraph={h.onRemoveParagraph} />;
      case 'procedure':
        return <ProcedureSection content={c} onField={h.onField}
          onStep={h.onStep} onAddStep={h.onAddStep} onRemoveStep={h.onRemoveStep} />;
      case 'key_points':
        return <KeyPointsSection content={c} onField={h.onField}
          onPoint={h.onPoint} onAddPoint={h.onAddPoint} onRemovePoint={h.onRemovePoint} />;
      case 'reference_table':
        return <ReferenceTableSection content={c} onField={h.onField}
          onCell={h.onCell} onAddRow={h.onAddRow} onRemoveRow={h.onRemoveRow}
          onAddColumn={h.onAddColumn} onRemoveColumn={h.onRemoveColumn} onColumnHeader={h.onColumnHeader} />;
      case 'diagram':
        return <DiagramSection content={c} genId={id} templateId={template?.id} onField={h.onField}
          onApplyCode={(code, key) => updateFieldsAt(secIdx, { mermaid_code: code, diagram_file: key })} />;
      case 'figure':
        return <FigureSection content={c} onField={h.onField}>{pictures}</FigureSection>;
      case 'summary':
        return <SummarySection content={c} onField={h.onField}
          onRecapPoint={h.onRecapPoint} onAddRecapPoint={h.onAddRecapPoint} onRemoveRecapPoint={h.onRemoveRecapPoint} />;
      default:
        return <BodySection content={c} onField={h.onField}
          onParagraph={h.onParagraph} onAddParagraph={h.onAddParagraph} onRemoveParagraph={h.onRemoveParagraph} />;
    }
  }

  return (
    <main className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 px-4 py-2 border-b border-border bg-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="font-heading text-[18px] leading-6 font-bold tracking-tight m-0 truncate max-w-[200px] lg:max-w-none">
            {gen.name || 'Training document'}
          </h1>
          <span className="chip-muted text-[11px]">Draft</span>
          {saving && <span className="text-xs text-slate animate-pulse">Saving...</span>}
          {live.phase === 'writing' && (
            <span className="text-[12px] text-cobalt flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />Writing {Math.min(live.current || 1, sections.length)} of {sections.length}
            </span>
          )}
          {live.phase === 'error' && (
            <button type="button" onClick={live.retry} className="text-[12px] text-red-700 bg-transparent border-0 cursor-pointer underline">
              Writing stopped. Retry
            </button>
          )}
          <Link to={`/create/doc/${id}/outline`} className="text-[12px] text-slate flex items-center gap-1 no-underline hover:text-navy">
            <Pencil size={11} />Outline
          </Link>
          <span className="text-[12px] text-slate hidden sm:inline">{sections.length} sections</span>
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
          <button type="button" onClick={handleOpenWordCraft}
            disabled={openingWordCraft}
            className="btn-outline text-[12px] gap-1 py-1 px-2 hidden sm:flex">
            {openingWordCraft ? '...' : <><ExternalLink size={13} />WordCraft</>}
          </button>
          <button type="button" onClick={handleSaveToLibrary}
            disabled={savingToLibrary || savedToLibrary}
            className="btn-outline text-[12px] gap-1 py-1 px-2">
            {savedToLibrary ? <><Check size={13} /></> : savingToLibrary ? '...' : <><BookmarkPlus size={13} /><span className="hidden sm:inline">Save</span></>}
          </button>
          <a href={generations.downloadUrl(id)} download
            className="btn-primary text-[12px] gap-1 py-1 px-2 no-underline">
            <Download size={13} /><span className="hidden sm:inline">DOCX</span>
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

      {/* Main area: section nav + document + chat panel */}
      <div className="flex-1 flex min-h-0">
        {/* Section nav — left panel */}
        <nav className="w-[100px] lg:w-[200px] shrink-0 border-r border-border bg-white overflow-y-auto py-2 px-1.5 lg:px-2">
          <ol className="list-none m-0 p-0 flex flex-col gap-1">
            {sections.map((s, i) => (
              <li key={i} className="group/item relative">
                <button type="button" onClick={() => scrollToSection(i)}
                  className={`w-full flex flex-col lg:flex-row gap-1 lg:gap-2 items-center min-h-[40px] px-1 lg:px-1.5 py-1 rounded-lg text-left cursor-pointer border-2 transition-all ${
                    i === activeSection ? 'border-navy bg-[#F5F8FC] shadow-sm' : 'border-transparent hover:bg-[#F0F4F8] hover:border-[#E2E8F0]'
                  }`}>
                  <div className="flex-1 min-w-0 w-full">
                    <span className="block text-[10px] lg:text-[11px] font-semibold text-ink truncate leading-tight text-center lg:text-left">
                      {i + 1}
                      <span className="hidden lg:inline"> &middot; {TYPE_LABELS[s.section_type] || 'Body'}</span>
                    </span>
                    <span className="hidden lg:block text-[10px] text-slate mt-0.5 truncate">
                      {s.content?.title || s.title}
                    </span>
                  </div>
                </button>
                {/* Add a section here: shown between sections on hover */}
                <button type="button" onClick={() => { setAddAfter(i); setChatOpen(true); setPanelTab('item'); }}
                  title={`Add a section after section ${i + 1}`}
                  className={`absolute left-1/2 -translate-x-1/2 -bottom-2.5 z-10 w-5 h-5 rounded-full bg-white border border-border text-slate hover:text-navy hover:border-navy cursor-pointer flex items-center justify-center ${
                    addAfter === i ? 'opacity-100 border-navy text-navy' : 'opacity-0 group-hover/item:opacity-100'}`}>
                  <Plus size={12} />
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Document preview — center, continuous scroll */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#E8ECF0] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 min-h-0">
            <article className="bg-white rounded-lg shadow-lg max-w-[780px] mx-auto px-12 lg:px-16 py-10" style={templateStyle(template)}>
              {sections.map((s, i) => (
                <div key={i}
                  ref={(el) => (sectionRefs.current[i] = el)}
                  onClick={() => { if (i !== activeSection) { setActiveSection(i); setAddAfter(null); } }}
                  className={`transition-colors rounded-md cursor-pointer -mx-3 px-3 ${
                    i === activeSection ? 'bg-[#F0F4F8] ring-1 ring-navy/10' : ''
                  }`}>
                  {renderSectionAt(i)}
                </div>
              ))}
            </article>
          </div>
        </div>

        {/* Edit chat — right panel (toggleable) */}
        {chatOpen && (
          <div className="w-[280px] shrink-0 border-l border-border bg-white flex flex-col overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between gap-2">
              <div className="flex gap-1 p-0.5 bg-canvas rounded-md">
                {[['item', 'This section'], ['deck', 'Whole document']].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setPanelTab(value)}
                    className={`px-2 py-1 rounded text-[12px] border-0 cursor-pointer ${
                      panelTab === value ? 'bg-white text-navy font-semibold shadow-sm' : 'bg-transparent text-slate'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setChatOpen(false)}
                className="p-1 rounded text-slate hover:text-navy hover:bg-canvas cursor-pointer bg-transparent border-0">
                <X size={14} />
              </button>
            </div>
            {panelTab === 'deck' ? (
              <AgentPanel type="doc" genId={id} gen={gen} setGen={setGen} />
            ) : addAfter !== null ? (
              <AddItemForm type="doc" genId={id} after={addAfter} onCancel={() => setAddAfter(null)}
                onAdded={async (index) => {
                  const r = await generations.get(id);
                  setGen(r.generation);
                  setActiveSection(index);
                  setAddAfter(null);
                }} />
            ) : (
              <ItemPanel key={activeSection} type="doc" genId={id} index={activeSection} item={sections[activeSection]}
                documentIds={gen.source_document_ids || []}
                onUpdated={async () => { const r = await generations.get(id); setGen(r.generation); }}
                onAddFigure={(f) => updateFieldAt(activeSection, 'pictures', [...(sections[activeSection]?.content?.pictures || []), newPicture(f)])} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
