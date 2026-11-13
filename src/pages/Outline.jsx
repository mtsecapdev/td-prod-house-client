import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Plus, Layout, Loader2 } from 'lucide-react';
import { generations } from '../services/api';

const LAYOUT_OPTIONS = [
  { key: 'title',            label: 'Title',            description: 'Opening slide' },
  { key: 'bullets',          label: 'Bullets',           description: 'Standard content slide' },
  { key: 'two_column',       label: 'Two Column',        description: 'Side-by-side comparison' },
  { key: 'stat_focus',       label: 'Key Stat',          description: 'Highlight a single metric' },
  { key: 'quote_highlight',  label: 'Quote',             description: 'Featured quote or principle' },
  { key: 'checklist',        label: 'Checklist',         description: 'Steps or procedure list' },
  { key: 'section_divider',  label: 'Section Divider',   description: 'Visual break between topics' },
  { key: 'big_idea',         label: 'Big Idea',          description: 'One bold statement' },
  { key: 'timeline',         label: 'Timeline',          description: 'Chronological events' },
  { key: 'process_flow',     label: 'Process Flow',      description: 'Sequential workflow steps' },
  { key: 'icon_grid',        label: 'Icon Grid',         description: 'Concept cards in a grid' },
  { key: 'comparison_table', label: 'Comparison Table',  description: 'Structured data table' },
  { key: 'closing',          label: 'Closing',           description: 'Takeaways and call to action' },
];

const LAYOUT_LABELS = Object.fromEntries(LAYOUT_OPTIONS.map((o) => [o.key, o.label]));

export default function Outline() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gen, setGen] = useState(null);
  const [slides, setSlides] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [layoutPicker, setLayoutPicker] = useState(null);
  const [generating, setGenerating] = useState(false);

  const pollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { generation } = await generations.get(id);
      if (cancelled) return;
      setGen(generation);

      if (generation.status === 'generating' || (generation.status === 'pending')) {
        pollRef.current = setInterval(async () => {
          const { generation: g } = await generations.get(id);
          if (cancelled) return;
          setGen(g);
          if (g.status === 'outline_ready' || g.status === 'done') {
            clearInterval(pollRef.current);
            setSlides(g.outline?.slides || []);
          } else if (g.status === 'failed') {
            clearInterval(pollRef.current);
          }
        }, 3000);
      } else {
        setSlides(generation.outline?.slides || []);
      }
    }

    load();
    return () => { cancelled = true; clearInterval(pollRef.current); };
  }, [id]);

  function startEdit(i) {
    setEditing(i);
    setEditValue(slides[i].title);
  }

  function saveEdit() {
    if (editing === null) return;
    const updated = [...slides];
    updated[editing] = { ...updated[editing], title: editValue };
    setSlides(updated);
    setEditing(null);
  }

  function removeSlide(i) {
    setSlides(slides.filter((_, idx) => idx !== i));
    if (layoutPicker === i) setLayoutPicker(null);
  }

  function addSlide() {
    setSlides([...slides, { title: 'New slide', intent: '', layout: 'bullets', source_chunks: [] }]);
  }

  function updateSlideLayout(i, layout) {
    const updated = [...slides];
    updated[i] = { ...updated[i], layout, content: null };
    setSlides(updated);
    setLayoutPicker(null);
  }

  async function handleGenerate() {
    setGenerating(true);
    await generations.updateOutline(id, { slides });
    navigate(`/create/deck/${id}/progress`);
  }

  if (!gen) return <main className="max-w-[960px] w-[90%] mx-auto py-8"><p className="hint">Loading...</p></main>;

  if (gen.status === 'generating' || gen.status === 'pending') {
    return (
      <main className="max-w-[960px] w-[90%] mx-auto py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link to="/create/deck" className="btn-ghost"><ArrowLeft size={18} />Back to brief</Link>
        </div>
        <div className="card p-10 flex flex-col items-center gap-4 text-center">
          <Loader2 size={36} className="text-cobalt animate-spin" />
          <p className="font-medium text-[16px]">Generating outline...</p>
          <p className="hint text-[13px]">The LLM is analysing your source material and creating a slide outline. This usually takes 30-60 seconds.</p>
        </div>
      </main>
    );
  }

  if (gen.status === 'failed') {
    return (
      <main className="max-w-[960px] w-[90%] mx-auto py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link to="/create/deck" className="btn-ghost"><ArrowLeft size={18} />Back to brief</Link>
        </div>
        <div className="card p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-red-600 text-xl font-bold">!</span>
          </div>
          <p className="text-red-600">{gen.error || 'Outline generation failed'}</p>
          <Link to="/create/deck" className="btn-primary">Try again</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[960px] w-[90%] mx-auto py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/create/deck" className="btn-ghost"><ArrowLeft size={18} />Back to brief</Link>
        <span className="hint"><strong className="text-ink">Step 2 of 4</strong> &middot; Brief, outline, generate, review</span>
      </div>

      <div>
        <h1 className="font-heading text-[32px] leading-10 font-bold tracking-tight m-0">Check the outline</h1>
        <p className="text-[15px] text-slate mt-1.5">Edit titles, change layouts, or reorder slides. Nothing is generated until you continue.</p>
      </div>

      <section className="card">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold m-0">{slides.length} slides</h2>
          <button type="button" onClick={addSlide} className="btn-outline h-10 text-sm"><Plus size={16} />Add slide</button>
        </div>
        <ol className="list-none m-0 p-0">
          {slides.map((s, i) => (
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
                  onClick={() => setLayoutPicker(layoutPicker === i ? null : i)}
                  className="chip-muted cursor-pointer hover:bg-[#E2E8F0] transition-colors text-[12px] flex items-center gap-1">
                  <Layout size={12} />
                  {LAYOUT_LABELS[s.layout] || 'Bullets'}
                </button>
                {s.source_chunks?.[0]?.page != null && (
                  <span className="chip-muted">p. {s.source_chunks[0].page}</span>
                )}
                <button type="button" onClick={() => startEdit(i)} className="icon-btn" aria-label="Edit title">
                  <Pencil size={16} />
                </button>
                <button type="button" onClick={() => removeSlide(i)} className="icon-btn" aria-label="Remove slide">
                  <Trash2 size={16} />
                </button>
              </div>

              {layoutPicker === i && (
                <div className="px-5 py-3 bg-canvas border-t border-border">
                  <p className="text-[13px] text-slate mb-2 font-semibold">Choose layout</p>
                  <div className="grid grid-cols-4 gap-2">
                    {LAYOUT_OPTIONS.map((opt) => (
                      <button key={opt.key} type="button"
                        onClick={() => updateSlideLayout(i, opt.key)}
                        className={`option text-left ${s.layout === opt.key ? 'option-selected' : ''}`}>
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
        <span className="hint mr-auto">Takes about 1-3 minutes.</span>
        <button type="button" onClick={handleGenerate} disabled={generating || slides.length === 0}
          className="btn-primary">
          {generating ? 'Starting...' : 'Generate slides'}
        </button>
      </div>
    </main>
  );
}
