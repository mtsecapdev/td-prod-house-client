import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Upload, Download, Loader2, Trash2, Copy, Sparkles } from 'lucide-react';
import { documents, generations } from '../services/api';
import { KIND } from '../components/plan/kindConfig';

// Gamma-style start: what to make, from which documents, how many slides/sections, and the format.
// Audience, tone and text amount come pre-filled on the outline screen.
export default function Brief() {
  const navigate = useNavigate();
  const location = useLocation();
  const type = location.pathname.includes('/doc') ? 'doc' : 'deck';
  const kind = KIND[type];
  const isDeck = type === 'deck';
  const fileRef = useRef(null);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(kind.defaultCount);
  const [format, setFormat] = useState(kind.formats[0].value);
  const [docs, setDocs] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
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
      setRecentGens(list.filter((g) => g.type === type && g.brief?.topic).slice(0, 3));
    }).catch(() => {});
  }, [type]);

  const readyDocs = docs.filter((d) => d.status === 'ready');
  const allSelected = readyDocs.length > 0 && readyDocs.every((d) => selectedIds.includes(d.id));

  function toggleDoc(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : readyDocs.map((d) => d.id));
  }

  function reuseBrief(gen) {
    setTopic(gen.brief.topic || '');
    if (gen.brief.count) setCount(gen.brief.count);
    if (gen.brief.format) setFormat(gen.brief.format);
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
    setError(null);
    try {
      const { generation } = await generations.create({
        type,
        brief: { topic, count, format, text_amount: 'concise' },
        sourceDocumentIds: selectedIds,
      });
      navigate(`/create/${type}/${generation.id}/outline`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const counts = [];
  for (let n = kind.countRange[0]; n <= kind.countRange[1]; n++) counts.push(n);

  return (
    <main className="max-w-[880px] w-[90%] mx-auto py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/" className="btn-ghost"><ArrowLeft size={18} />Back</Link>
      </div>

      <div>
        <h1 className="font-heading text-[32px] leading-10 font-bold tracking-tight m-0">
          {isDeck ? 'New slide deck' : 'New training document'}
        </h1>
        <p className="text-[15px] text-slate mt-1.5 mb-0">
          Describe what you need. You will get an outline to edit before anything is written.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-7 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="topic" className="label">What should it cover?</label>
          <textarea id="topic" className="field min-h-[110px] text-[16px] leading-relaxed" maxLength={2000} value={topic}
            onChange={(e) => setTopic(e.target.value)} autoFocus
            placeholder={isDeck
              ? 'e.g. Onboarding deck for new buyers: how to read the supplier scorecard and which suppliers need attention'
              : 'e.g. A procedure guide for incoming inspection, including what to do when a part fails'} />
          {recentGens.length > 0 && (
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-[12px] text-slate">Reuse:</span>
              {recentGens.map((g) => (
                <button key={g.id} type="button" onClick={() => reuseBrief(g)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-white text-[12px] text-ink hover:bg-canvas cursor-pointer">
                  <Copy size={11} className="text-slate" />
                  <span className="truncate max-w-[220px]">{g.brief.topic}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-6 items-end">
          <div className="flex flex-col gap-2">
            <label htmlFor="count" className="label">{isDeck ? 'Slides' : 'Sections'}</label>
            <select id="count" className="field w-[110px]" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {counts.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <fieldset className="border-0 m-0 p-0 flex flex-col gap-2">
            <legend className="label mb-2">{isDeck ? 'Used as' : 'Kind of document'}</legend>
            <div className="flex flex-wrap gap-2">
              {kind.formats.map((f) => (
                <button key={f.value} type="button" onClick={() => setFormat(f.value)} title={f.desc}
                  className={`px-3.5 py-2 rounded-lg border text-[14px] cursor-pointer transition-colors ${
                    format === f.value ? 'border-navy bg-[#EAF0F8] text-navy font-semibold' : 'border-border bg-white text-ink hover:bg-canvas'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset className="border-0 m-0 p-0 flex flex-col gap-3">
          <legend className="label mb-1">Source documents</legend>
          <span className="hint -mt-1">{isDeck ? 'Slides are' : 'Content is'} written from the documents you select.</span>

          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" id="doc-upload" className="hidden"
              accept=".pdf,.docx,.pptx,.md,.txt" onChange={handleUpload} />
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="btn-outline text-[14px] gap-1.5">
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
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-[18px] h-[18px] accent-navy" />
                  <span className="text-[13px] font-semibold text-slate">Select all ({readyDocs.length})</span>
                </label>
              )}
              {docs.map((d) => (
                <label key={d.id} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-canvas">
                  <input type="checkbox" checked={selectedIds.includes(d.id)} onChange={() => toggleDoc(d.id)}
                    disabled={d.status !== 'ready'} className="w-[18px] h-[18px] accent-navy" />
                  <span className="text-[15px] flex-1">{d.name}</span>
                  {d.status && d.status !== 'ready' && <span className="chip-muted">{d.status}</span>}
                  {d.file_path && d.status === 'ready' && (
                    <a href={documents.downloadUrl(d.id)} download onClick={(e) => e.stopPropagation()}
                      className="text-cobalt hover:text-navy p-1" title="Download original">
                      <Download size={16} />
                    </a>
                  )}
                  <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(d.id); }}
                    className="text-slate hover:text-red-600 p-1" title="Delete document">
                    <Trash2 size={16} />
                  </button>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {error && <p className="text-red-700 text-[14px] m-0">{error}</p>}

        <div className="flex justify-end">
          <button type="submit" disabled={submitting || !topic.trim() || selectedIds.length === 0} className="btn-primary">
            <Sparkles size={16} />{submitting ? 'Starting...' : 'Generate outline'}
          </button>
        </div>
      </form>
    </main>
  );
}
