import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Upload, Download, Loader2, Trash2, Copy, Sparkles } from 'lucide-react';
import { documents, generations } from '../services/api';
import { KIND } from '../components/plan/kindConfig';

// Gamma-style start: describe what to make (from documents), or paste your own text. Then how many
// slides/sections and the format. Audience, tone and text amount come pre-filled on the outline screen.

const TEXT_MODES = [
  { value: 'generate', label: 'Generate', desc: 'Use it as a starting point and expand' },
  { value: 'condense', label: 'Condense', desc: 'Shorten it into the layouts' },
  { value: 'preserve', label: 'Preserve', desc: 'Keep your exact wording' },
];
const SPLIT_RE = /\n\s*-{3,}\s*\n/;
export default function Brief() {
  const navigate = useNavigate();
  const location = useLocation();
  const type = location.pathname.includes('/doc') ? 'doc' : 'deck';
  const kind = KIND[type];
  const isDeck = type === 'deck';
  const fileRef = useRef(null);
  const [mode, setMode] = useState('describe'); // 'describe' | 'paste'
  const [topic, setTopic] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [textMode, setTextMode] = useState('generate');
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

  const pasting = mode === 'paste';
  // Parts marked with "---" fix the number of slides/sections.
  const parts = pasting ? sourceText.trim().split(SPLIT_RE).filter((p) => p.trim()).length : 0;
  const canSubmit = pasting ? sourceText.trim().length > 0 : topic.trim() && selectedIds.length > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const { generation } = await generations.create({
        type,
        brief: pasting
          ? {
            topic: topic.trim() || sourceText.trim().split('\n')[0].slice(0, 120),
            source_text: sourceText, text_mode: textMode,
            count: parts > 1 ? parts : count, format, text_amount: 'concise',
          }
          : { topic, count, format, text_amount: 'concise' },
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
        <div className="flex gap-1 p-1 bg-canvas rounded-lg self-start" role="tablist">
          {[['describe', 'Describe it'], ['paste', 'Paste text']].map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => setMode(value)}
              className={`px-3.5 py-1.5 rounded-md text-[14px] border-0 cursor-pointer ${
                mode === value ? 'bg-white text-navy font-semibold shadow-sm' : 'bg-transparent text-slate'}`}>
              {label}
            </button>
          ))}
        </div>

        {pasting && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label htmlFor="source-text" className="label">Your text</label>
              <span className="hint -mt-1">
                Notes, an outline or a draft. Put <code>---</code> on its own line to choose where each {isDeck ? 'slide' : 'section'} starts.
              </span>
              <textarea id="source-text" className="field min-h-[220px] text-[14px] leading-relaxed font-mono" value={sourceText}
                onChange={(e) => setSourceText(e.target.value)} autoFocus
                placeholder={'Supplier scorecard basics\n- Top 25 suppliers by spend\n- Red / amber / green ratings\n---\nWhen to escalate\n- Two quality escapes in a quarter\n- On-time delivery under 90%'} />
              {parts > 1 && <span className="text-[13px] text-cobalt">{parts} {isDeck ? 'slides' : 'sections'}, split where you put ---</span>}
            </div>
            <div className="flex flex-col gap-2">
              <span className="label">What to do with it</span>
              <div className="flex flex-wrap gap-2">
                {TEXT_MODES.map((m) => (
                  <button key={m.value} type="button" onClick={() => setTextMode(m.value)} title={m.desc}
                    className={`px-3.5 py-2 rounded-lg border text-left cursor-pointer transition-colors ${
                      textMode === m.value ? 'border-navy bg-[#EAF0F8] text-navy' : 'border-border bg-white text-ink hover:bg-canvas'}`}>
                    <span className="block text-[14px] font-semibold">{m.label}</span>
                    <span className="block text-[12px] text-slate">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="topic" className="label">
            {pasting ? <>What is it for? <span className="font-normal text-slate text-[13px]">(optional)</span></> : 'What should it cover?'}
          </label>
          <textarea id="topic" className={`field text-[16px] leading-relaxed ${pasting ? 'min-h-[60px]' : 'min-h-[110px]'}`} maxLength={2000} value={topic}
            onChange={(e) => setTopic(e.target.value)} autoFocus={!pasting}
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
            <select id="count" className="field w-[110px]" value={parts > 1 ? parts : count} disabled={parts > 1}
              onChange={(e) => setCount(Number(e.target.value))}>
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
          <legend className="label mb-1">
            Source documents{pasting && <span className="font-normal text-slate text-[13px]"> (optional)</span>}
          </legend>
          <span className="hint -mt-1">
            {pasting
              ? 'Selected documents are used to check and add facts to your text.'
              : `${isDeck ? 'Slides are' : 'Content is'} written from the documents you select.`}
          </span>

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
          <button type="submit" disabled={submitting || !canSubmit} className="btn-primary">
            <Sparkles size={16} />{submitting ? 'Starting...' : 'Generate outline'}
          </button>
        </div>
      </form>
    </main>
  );
}
