import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Upload, Download, Loader2, Trash2, Copy } from 'lucide-react';
import { documents, generations } from '../services/api';

const deckLengths = [
  { value: 'quick', label: 'Quick', desc: '3-5 slides' },
  { value: 'standard', label: 'Standard', desc: '6-10 slides' },
  { value: 'deep', label: 'Deep dive', desc: '12-18 slides' },
];

const docLengths = [
  { value: 'short', label: 'Short', desc: '2-4 pages' },
  { value: 'standard', label: 'Standard', desc: '5-8 pages' },
  { value: 'comprehensive', label: 'Comprehensive', desc: '10-15 pages' },
];

const tones = [
  { value: 'formal', label: 'Formal', desc: 'Professional, authoritative' },
  { value: 'instructional', label: 'Instructional', desc: 'Clear, step-by-step' },
  { value: 'conversational', label: 'Conversational', desc: 'Approachable, casual' },
];

export default function Brief() {
  const navigate = useNavigate();
  const location = useLocation();
  const type = location.pathname.includes('/doc') ? 'doc' : 'deck';
  const isDeck = type === 'deck';
  const lengths = isDeck ? deckLengths : docLengths;
  const fileRef = useRef(null);
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('instructional');
  const [length, setLength] = useState('standard');
  const [docs, setDocs] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [recentGens, setRecentGens] = useState([]);

  function loadDocs() {
    documents.list().then((d) => setDocs(d.docs || d || [])).catch(() => {});
  }

  useEffect(() => {
    loadDocs();
    generations.list().then((data) => {
      const list = data.generations || data || [];
      setRecentGens(list.filter((g) => g.type === type && g.brief).slice(0, 3));
    }).catch(() => {});
  }, []);

  const readyDocs = docs.filter((d) => d.status === 'ready');
  const allSelected = readyDocs.length > 0 && readyDocs.every((d) => selectedIds.includes(d.id));

  function toggleDoc(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(readyDocs.map((d) => d.id));
    }
  }

  function useBrief(gen) {
    setTopic(gen.brief.topic || '');
    setAudience(gen.brief.audience || '');
    setTone(gen.brief.tone || 'instructional');
    setLength(gen.brief.length || 'standard');
    if (gen.source_document_ids) setSelectedIds(gen.source_document_ids);
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg('');
    try {
      const result = await documents.upload(file);
      setUploadMsg(result.message || `Uploaded ${file.name}`);
      loadDocs();
      const pollInterval = setInterval(() => {
        documents.list().then((d) => {
          const list = d.docs || d || [];
          setDocs(list);
          const uploaded = list.find((doc) => doc.name === file.name);
          if (uploaded && uploaded.status === 'ready') {
            clearInterval(pollInterval);
            setUploading(false);
            setUploadMsg(`${file.name} is ready`);
          } else if (uploaded && uploaded.status === 'failed') {
            clearInterval(pollInterval);
            setUploading(false);
            setUploadMsg(`${file.name} failed to process`);
          }
        });
      }, 3000);
      setTimeout(() => clearInterval(pollInterval), 300000);
    } catch (err) {
      setUploadMsg(`Upload failed: ${err.message}`);
      setUploading(false);
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleDelete(id) {
    try {
      await documents.delete(id);
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      loadDocs();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!topic.trim() || selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const { generation } = await generations.create({
        type,
        brief: { topic, audience: audience || undefined, tone, length },
        sourceDocumentIds: selectedIds,
      });
      navigate(`/create/${type}/${generation.id}/outline`);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-[960px] w-[90%] mx-auto py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/" className="btn-ghost"><ArrowLeft size={18} />Back</Link>
        <span className="hint"><strong className="text-ink">Step 1 of 4</strong> &middot; Brief, outline, generate, review</span>
      </div>

      <h1 className="font-heading text-[32px] leading-10 font-bold tracking-tight m-0">
        {isDeck ? 'New slide deck' : 'New training document'}
      </h1>

      {recentGens.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-slate">Recent briefs</span>
          <div className="flex gap-2 flex-wrap">
            {recentGens.map((g) => (
              <button key={g.id} type="button" onClick={() => useBrief(g)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-white text-[13px] text-ink hover:bg-canvas hover:border-[#CBD5E1] cursor-pointer transition-colors">
                <Copy size={12} className="text-slate" />
                <span className="truncate max-w-[200px]">{g.brief.topic}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-7 flex flex-col gap-7">
        {/* Sources — first, so user picks what to work with */}
        <fieldset className="border-0 m-0 p-0 flex flex-col gap-3">
          <legend className="label mb-1">Source documents</legend>
          <span className="hint -mt-1">{isDeck ? 'Slides are' : 'Content is'} grounded in the documents you select.</span>

          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" id="doc-upload" className="hidden"
              accept=".pdf,.docx,.pptx,.md,.txt" onChange={handleUpload} />
            <button type="button" disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="btn-outline text-[14px] gap-1.5">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? 'Processing...' : 'Upload document'}
            </button>
            {uploadMsg && <span className="hint text-[13px]">{uploadMsg}</span>}
          </div>

          {docs.length === 0 ? (
            <p className="hint">No documents ingested yet.</p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              {readyDocs.length > 1 && (
                <label className="flex items-center gap-3 px-5 py-2.5 border-b border-border cursor-pointer hover:bg-canvas bg-[#FAFBFC]">
                  <input type="checkbox" checked={allSelected}
                    onChange={toggleAll}
                    className="w-[18px] h-[18px] accent-navy" />
                  <span className="text-[13px] font-semibold text-slate">Select all ({readyDocs.length})</span>
                </label>
              )}
              {docs.map((d) => (
                <label key={d.id} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-canvas">
                  <input type="checkbox" checked={selectedIds.includes(d.id)}
                    onChange={() => toggleDoc(d.id)}
                    disabled={d.status !== 'ready'}
                    className="w-[18px] h-[18px] accent-navy" />
                  <span className="text-[15px] flex-1">{d.name}</span>
                  {d.status && d.status !== 'ready' && (
                    <span className="chip-muted">{d.status}</span>
                  )}
                  {d.file_path && d.status === 'ready' && (
                    <a href={documents.downloadUrl(d.id)} download
                      onClick={(e) => e.stopPropagation()}
                      className="text-cobalt hover:text-navy p-1" title="Download original">
                      <Download size={16} />
                    </a>
                  )}
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(d.id); }}
                    className="text-slate hover:text-red-600 p-1" title="Delete document">
                    <Trash2 size={16} />
                  </button>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {/* Topic — single line input */}
        <div className="flex flex-col gap-2">
          <label htmlFor="topic" className="label">Lesson topic</label>
          <input id="topic" className="field" maxLength={200} value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Safety procedures for engine room operations" />
        </div>

        {/* Audience — optional */}
        <div className="flex flex-col gap-2">
          <label htmlFor="audience" className="label">
            Audience <span className="font-normal text-slate text-[13px]">(optional)</span>
          </label>
          <input id="audience" className="field" value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Leave blank for general audience" />
        </div>

        {/* Tone */}
        <fieldset className="border-0 m-0 p-0">
          <legend className="label mb-3">Tone</legend>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
            {tones.map((t) => (
              <label key={t.value} className={`option ${tone === t.value ? 'option-selected' : ''}`}>
                <input type="radio" name="tone" value={t.value} checked={tone === t.value}
                  onChange={() => setTone(t.value)} className="mt-0.5 w-[18px] h-[18px] accent-navy" />
                <span>
                  <span className="block font-semibold text-[15px]">{t.label}</span>
                  <span className="hint">{t.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Length */}
        <fieldset className="border-0 m-0 p-0">
          <legend className="label mb-3">{isDeck ? 'Deck length' : 'Document length'}</legend>
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
