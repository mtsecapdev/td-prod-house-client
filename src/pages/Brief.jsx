import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { documents, generations } from '../services/api';

const lengths = [
  { value: 'quick', label: 'Quick', desc: '3-5 slides' },
  { value: 'standard', label: 'Standard', desc: '6-10 slides' },
  { value: 'deep', label: 'Deep dive', desc: '12-18 slides' },
];

export default function Brief() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [length, setLength] = useState('standard');
  const [docs, setDocs] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    documents.list().then((d) => setDocs(d.docs || d || [])).catch(() => {});
  }, []);

  function toggleDoc(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!topic.trim() || selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const { generation } = await generations.create({
        type: 'deck',
        brief: { topic, audience, length },
        sourceDocumentIds: selectedIds,
      });
      navigate(`/create/deck/${generation.id}/outline`);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-[820px] mx-auto px-8 py-6 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/" className="btn-ghost"><ArrowLeft size={18} />Back</Link>
        <span className="hint"><strong className="text-ink">Step 1 of 4</strong> &middot; Brief, outline, generate, review</span>
      </div>

      <h1 className="font-heading text-[32px] leading-10 font-bold tracking-tight m-0">New slide deck</h1>

      <form onSubmit={handleSubmit} className="card p-7 flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <label htmlFor="topic" className="label">Lesson topic</label>
          <textarea id="topic" className="field" rows={3} maxLength={400} value={topic}
            onChange={(e) => setTopic(e.target.value)} placeholder="What should the deck teach?" />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="audience" className="label">Audience</label>
          <input id="audience" className="field" value={audience}
            onChange={(e) => setAudience(e.target.value)} placeholder="Who is this for?" />
        </div>

        <fieldset className="border-0 m-0 p-0">
          <legend className="label mb-3">Deck length</legend>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
            {lengths.map((l) => (
              <label key={l.value} className={`option ${length === l.value ? 'option-selected' : ''}`}>
                <input type="radio" name="length" value={l.value} checked={length === l.value}
                  onChange={() => setLength(l.value)} className="mt-0.5 w-[18px] h-[18px] accent-navy" />
                <span>
                  <span className="block font-semibold text-[15px]">{l.label}</span>
                  <span className="hint">{l.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-0 m-0 p-0 flex flex-col gap-3">
          <legend className="label mb-1">Sources</legend>
          <span className="hint -mt-1">Slides only use the documents you tick.</span>
          {docs.length === 0 ? (
            <p className="hint">No documents ingested yet.</p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              {docs.map((d) => (
                <label key={d.id} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-canvas">
                  <input type="checkbox" checked={selectedIds.includes(d.id)}
                    onChange={() => toggleDoc(d.id)} className="w-[18px] h-[18px] accent-navy" />
                  <span className="text-[15px]">{d.name}</span>
                  {d.status && d.status !== 'ready' && (
                    <span className="chip-muted ml-auto">{d.status}</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="flex justify-end">
          <button type="submit" disabled={submitting || !topic.trim() || selectedIds.length === 0}
            className="btn-primary">
            {submitting ? 'Generating outline...' : 'Generate outline'}
          </button>
        </div>
      </form>
    </main>
  );
}
