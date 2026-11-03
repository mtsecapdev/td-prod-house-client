import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Plus } from 'lucide-react';
import { generations } from '../services/api';

export default function Outline() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gen, setGen] = useState(null);
  const [slides, setSlides] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    generations.get(id).then(({ generation }) => {
      setGen(generation);
      setSlides(generation.outline?.slides || []);
    });
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
  }

  function addSlide() {
    setSlides([...slides, { title: 'New slide', intent: '', source_chunks: [] }]);
  }

  async function handleGenerate() {
    setGenerating(true);
    await generations.updateOutline(id, { slides });
    navigate(`/create/deck/${id}/progress`);
  }

  if (!gen) return <main className="max-w-[820px] mx-auto px-8 py-6"><p className="hint">Loading...</p></main>;

  return (
    <main className="max-w-[820px] mx-auto px-8 py-6 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/create/deck" className="btn-ghost"><ArrowLeft size={18} />Back to brief</Link>
        <span className="hint"><strong className="text-ink">Step 2 of 4</strong> &middot; Brief, outline, generate, review</span>
      </div>

      <div>
        <h1 className="font-heading text-[32px] leading-10 font-bold tracking-tight m-0">Check the outline</h1>
        <p className="text-[15px] text-slate mt-1.5">Rename or remove slides now. Nothing is generated until you continue.</p>
      </div>

      <section className="card">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold m-0">{slides.length} slides</h2>
          <button type="button" onClick={addSlide} className="btn-outline h-10 text-sm"><Plus size={16} />Add slide</button>
        </div>
        <ol className="list-none m-0 p-0">
          {slides.map((s, i) => (
            <li key={i} className="flex items-center gap-3 px-5 py-2 border-t border-border">
              <span className="w-5 text-sm font-semibold text-slate">{i + 1}</span>
              {editing === i ? (
                <input className="field flex-1" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} autoFocus />
              ) : (
                <span className="flex-1 min-w-0 text-[15px] font-semibold">{s.title}</span>
              )}
              {s.source_chunks?.[0]?.page != null && (
                <span className="chip-muted">p. {s.source_chunks[0].page}</span>
              )}
              <button type="button" onClick={() => startEdit(i)} className="icon-btn" aria-label="Edit title">
                <Pencil size={16} />
              </button>
              <button type="button" onClick={() => removeSlide(i)} className="icon-btn" aria-label="Remove slide">
                <Trash2 size={16} />
              </button>
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
