import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, Download, Loader2, Trash2 } from 'lucide-react';
import { documents, generations } from '../services/api';

const formats = [
  { value: 'diagram', label: 'Diagram', desc: 'Flowcharts, sequence diagrams, mind maps' },
  { value: 'process', label: 'Process flow', desc: 'Step-by-step process with numbered stages' },
  { value: 'comparison', label: 'Comparison', desc: 'Side-by-side comparison of two options' },
  { value: 'key_stats', label: 'Key statistics', desc: 'Highlight important numbers and metrics' },
  { value: 'timeline', label: 'Timeline', desc: 'Chronological sequence of events' },
];

export default function InfographicBrief() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [format, setFormat] = useState('diagram');
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [docs, setDocs] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  function loadDocs() {
    documents.list().then((d) => setDocs(d.docs || d || [])).catch(() => {});
  }

  useEffect(() => { loadDocs(); }, []);

  const readyDocs = docs.filter((d) => d.status === 'ready');
  const allSelected = readyDocs.length > 0 && readyDocs.every((d) => selectedIds.includes(d.id));

  function toggleDoc(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : readyDocs.map((d) => d.id));
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
        type: 'infographic',
        brief: { format, topic, audience: audience || undefined },
        sourceDocumentIds: selectedIds,
      });
      navigate(`/create/infographic/${generation.id}/progress`);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-[960px] w-[90%] mx-auto py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/" className="btn-ghost"><ArrowLeft size={18} />Back</Link>
        <span className="hint"><strong className="text-ink">Step 1 of 2</strong> &middot; Brief, then generate</span>
      </div>

      <h1 className="font-heading text-[32px] leading-10 font-bold tracking-tight m-0">
        New diagram or infographic
      </h1>

      <form onSubmit={handleSubmit} className="card p-7 flex flex-col gap-7">
        {/* Format picker */}
        <fieldset className="border-0 m-0 p-0">
          <legend className="label mb-3">Format</legend>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            {formats.map((f) => (
              <label key={f.value} className={`option ${format === f.value ? 'option-selected' : ''}`}>
                <input type="radio" name="format" value={f.value} checked={format === f.value}
                  onChange={() => setFormat(f.value)} className="mt-0.5 w-[18px] h-[18px] accent-navy" />
                <span>
                  <span className="block font-semibold text-[15px]">{f.label}</span>
                  <span className="hint">{f.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Topic */}
        <div className="flex flex-col gap-2">
          <label htmlFor="topic" className="label">Topic</label>
          <input id="topic" className="field" maxLength={200} value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Safety procedures for engine room operations" />
        </div>

        {/* Audience */}
        <div className="flex flex-col gap-2">
          <label htmlFor="audience" className="label">
            Audience <span className="font-normal text-slate text-[13px]">(optional)</span>
          </label>
          <input id="audience" className="field" value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Leave blank for general audience" />
        </div>

        {/* Source documents */}
        <fieldset className="border-0 m-0 p-0 flex flex-col gap-3">
          <legend className="label mb-1">Source documents</legend>
          <span className="hint -mt-1">Content is grounded in the documents you select.</span>

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

        <div className="flex justify-end">
          <button type="submit" disabled={submitting || !topic.trim() || selectedIds.length === 0}
            className="btn-primary">
            {submitting ? 'Starting...' : 'Generate'}
          </button>
        </div>
      </form>
    </main>
  );
}
