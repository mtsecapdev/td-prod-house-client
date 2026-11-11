import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Plus, FileText, Loader2 } from 'lucide-react';
import { generations } from '../services/api';

const SECTION_TYPE_OPTIONS = [
  { key: 'heading',         label: 'Heading',    description: 'Title page or major section opener' },
  { key: 'body',            label: 'Body',       description: 'Paragraphs with sub-headings' },
  { key: 'procedure',       label: 'Procedure',  description: 'Step-by-step instructions' },
  { key: 'key_points',      label: 'Key Points', description: 'Highlighted facts or rules' },
  { key: 'reference_table', label: 'Table',      description: 'Structured tabular data' },
  { key: 'summary',         label: 'Summary',    description: 'Closing recap and next steps' },
];

const TYPE_LABELS = Object.fromEntries(SECTION_TYPE_OPTIONS.map((o) => [o.key, o.label]));

export default function DocOutline() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gen, setGen] = useState(null);
  const [sections, setSections] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [typePicker, setTypePicker] = useState(null);
  const [generating, setGenerating] = useState(false);

  const pollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { generation } = await generations.get(id);
      if (cancelled) return;
      setGen(generation);

      if (generation.status === 'generating' || generation.status === 'pending') {
        pollRef.current = setInterval(async () => {
          const { generation: g } = await generations.get(id);
          if (cancelled) return;
          setGen(g);
          if (g.status === 'outline_ready' || g.status === 'done') {
            clearInterval(pollRef.current);
            setSections(g.outline?.sections || []);
          } else if (g.status === 'failed') {
            clearInterval(pollRef.current);
          }
        }, 3000);
      } else {
        setSections(generation.outline?.sections || []);
      }
    }

    load();
    return () => { cancelled = true; clearInterval(pollRef.current); };
  }, [id]);

  function startEdit(i) {
    setEditing(i);
    setEditValue(sections[i].title);
  }

  function saveEdit() {
    if (editing === null) return;
    const updated = [...sections];
    updated[editing] = { ...updated[editing], title: editValue };
    setSections(updated);
    setEditing(null);
  }

  function removeSection(i) {
    setSections(sections.filter((_, idx) => idx !== i));
    if (typePicker === i) setTypePicker(null);
  }

  function addSection() {
    setSections([...sections, { title: 'New section', intent: '', section_type: 'body', source_chunks: [] }]);
  }

  function updateSectionType(i, section_type) {
    const updated = [...sections];
    updated[i] = { ...updated[i], section_type, content: null };
    setSections(updated);
    setTypePicker(null);
  }

  async function handleGenerate() {
    setGenerating(true);
    await generations.updateOutline(id, { sections });
    navigate(`/create/doc/${id}/progress`);
  }

  if (!gen) return <main className="max-w-[960px] w-[90%] mx-auto py-8"><p className="hint">Loading...</p></main>;

  if (gen.status === 'generating' || gen.status === 'pending') {
    return (
      <main className="max-w-[960px] w-[90%] mx-auto py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link to="/create/doc" className="btn-ghost"><ArrowLeft size={18} />Back to brief</Link>
        </div>
        <div className="card p-10 flex flex-col items-center gap-4 text-center">
          <Loader2 size={36} className="text-cobalt animate-spin" />
          <p className="font-medium text-[16px]">Generating outline...</p>
          <p className="hint text-[13px]">The LLM is analysing your source material and creating a document outline. This usually takes 30-60 seconds.</p>
        </div>
      </main>
    );
  }

  if (gen.status === 'failed') {
    return (
      <main className="max-w-[960px] w-[90%] mx-auto py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link to="/create/doc" className="btn-ghost"><ArrowLeft size={18} />Back to brief</Link>
        </div>
        <div className="card p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-red-600 text-xl font-bold">!</span>
          </div>
          <p className="text-red-600">{gen.error || 'Outline generation failed'}</p>
          <Link to="/create/doc" className="btn-primary">Try again</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[960px] w-[90%] mx-auto py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/create/doc" className="btn-ghost"><ArrowLeft size={18} />Back to brief</Link>
        <span className="hint"><strong className="text-ink">Step 2 of 4</strong> &middot; Brief, outline, generate, review</span>
      </div>

      <div>
        <h1 className="font-heading text-[32px] leading-10 font-bold tracking-tight m-0">Check the outline</h1>
        <p className="text-[15px] text-slate mt-1.5">Edit titles, change section types, or reorder sections. Nothing is generated until you continue.</p>
      </div>

      <section className="card">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold m-0">{sections.length} sections</h2>
          <button type="button" onClick={addSection} className="btn-outline h-10 text-sm"><Plus size={16} />Add section</button>
        </div>
        <ol className="list-none m-0 p-0">
          {sections.map((s, i) => (
            <li key={i} className="border-t border-border">
              <div className="flex items-center gap-3 px-5 py-2">
                <span className="w-5 text-sm font-semibold text-slate">{i + 1}</span>
                {editing === i ? (
                  <input className="field flex-1" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                    onBlur={saveEdit} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} autoFocus />
                ) : (
                  <span className="flex-1 min-w-0 text-[15px] font-semibold">{s.title}</span>
                )}
                <button type="button"
                  onClick={() => setTypePicker(typePicker === i ? null : i)}
                  className="chip-muted cursor-pointer hover:bg-[#E2E8F0] transition-colors text-[12px] flex items-center gap-1">
                  <FileText size={12} />
                  {TYPE_LABELS[s.section_type] || 'Body'}
                </button>
                {s.source_chunks?.[0]?.page != null && (
                  <span className="chip-muted">p. {s.source_chunks[0].page}</span>
                )}
                <button type="button" onClick={() => startEdit(i)} className="icon-btn" aria-label="Edit title">
                  <Pencil size={16} />
                </button>
                <button type="button" onClick={() => removeSection(i)} className="icon-btn" aria-label="Remove section">
                  <Trash2 size={16} />
                </button>
              </div>

              {typePicker === i && (
                <div className="px-5 py-3 bg-canvas border-t border-border">
                  <p className="text-[13px] text-slate mb-2 font-semibold">Choose section type</p>
                  <div className="grid grid-cols-3 gap-2">
                    {SECTION_TYPE_OPTIONS.map((opt) => (
                      <button key={opt.key} type="button"
                        onClick={() => updateSectionType(i, opt.key)}
                        className={`option text-left ${s.section_type === opt.key ? 'option-selected' : ''}`}>
                        <div>
                          <span className="text-[13px] font-semibold text-ink block">{opt.label}</span>
                          <span className="text-[12px] text-slate block mt-0.5">{opt.description}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <div className="flex items-center justify-end gap-3 flex-wrap">
        <span className="hint mr-auto">Takes about 2-5 minutes.</span>
        <button type="button" onClick={handleGenerate} disabled={generating || sections.length === 0}
          className="btn-primary">
          {generating ? 'Starting...' : 'Generate document'}
        </button>
      </div>
    </main>
  );
}
