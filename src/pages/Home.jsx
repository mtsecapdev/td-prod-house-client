import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileSliders, FileText, Image, LayoutGrid, ArrowRight, Trash2, Upload, Download, ChevronDown, ChevronUp, FolderOpen, Check, X } from 'lucide-react';
import { generations, documents } from '../services/api';
import { useUpload } from '../contexts/UploadContext';

const types = [
  { type: 'deck', label: 'Slide deck', desc: 'Training presentations from your source material', icon: FileSliders, to: '/create/deck' },
  { type: 'doc', label: 'Training document', desc: 'Structured documents for print or digital', icon: FileText, to: '/create/doc' },
  { type: 'image', label: 'Image', desc: 'Photorealistic, illustration and conceptual images', icon: Image, to: '/create/image' },
  { type: 'infographic', label: 'Diagram & Infographic', desc: 'Process flows, comparisons, timelines and key stats', icon: LayoutGrid, to: '/create/infographic' },
];

const statusLabels = {
  pending: 'Ready',
  outline_ready: 'Outline ready',
  prompt_ready: 'Prompt ready',
  generating: 'Generating',
  done: 'Review',
  failed: 'Failed',
};

function getResumeUrl(g) {
  const base = `/create/${g.type}/${g.id}`;
  if (g.type === 'image') {
    if (g.status === 'done') return `${base}/review`;
    if (g.status === 'prompt_ready') return `${base}/prompt`;
    if (g.status === 'pending') return `${base}/prompt`;
    if (g.status === 'generating') return `${base}/progress`;
    return null;
  }
  if (g.type === 'infographic') {
    if (g.status === 'done') return `${base}/review`;
    if (g.status === 'pending') return `${base}/progress`;
    if (g.status === 'generating') return `${base}/progress`;
    return null;
  }
  if (g.status === 'done') return `${base}/review`;
  if (g.status === 'generating') return `${base}/progress`;
  if (g.status === 'outline_ready') return `${base}/outline`;
  return null;
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function IngestionProgress({ progress, phase }) {
  const size = 36;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const isDone = phase === 'done';
  const isError = phase === 'error';

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={isDone ? '#10B981' : isError ? '#EF4444' : '#2563EB'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-slate">
        {isDone ? <Check size={14} className="text-emerald-600" /> :
         isError ? <X size={14} className="text-red-500" /> :
         `${progress}%`}
      </span>
    </div>
  );
}

export default function Home() {
  const [recentWork, setRecentWork] = useState([]);
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const [docs, setDocs] = useState([]);
  const [docsOpen, setDocsOpen] = useState(false);
  const { uploading, uploadPhase, uploadMsg, uploadProgress, uploadFileName, startUpload } = useUpload();
  const fileRef = useRef(null);

  function loadDocs() {
    documents.list().then((d) => setDocs(d.docs || d || [])).catch(() => {});
  }

  useEffect(() => {
    loadDocs();
    generations.list().then((data) => {
      const list = data.generations || data || [];
      const cutoff = Date.now() - SEVEN_DAYS;
      const resumable = list
        .filter((g) => ['pending', 'outline_ready', 'prompt_ready', 'generating', 'done'].includes(g.status)
          && new Date(g.updated_at || g.created_at).getTime() > cutoff)
        .slice(0, 3);
      setRecentWork(resumable);
    }).catch(() => {});
  }, []);

  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    startUpload(file, loadDocs);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleDeleteDoc(id) {
    try {
      await documents.delete(id);
      loadDocs();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  function handleTrashClick(e, id) {
    e.preventDefault();
    e.stopPropagation();
    setConfirmId(id);
  }

  function handleCancelDelete(e) {
    e.preventDefault();
    e.stopPropagation();
    setConfirmId(null);
  }

  async function handleConfirmDelete(e, id) {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    setDeleting(id);
    try {
      await generations.delete(id);
      setRecentWork((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setDeleting(null);
    setConfirmId(null);
  }

  return (
    <main className="max-w-[960px] w-[90%] mx-auto py-[8vh] flex flex-col gap-8">
      {recentWork.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[14px] font-semibold text-slate tracking-wide uppercase m-0">Continue where you left off</h2>
          <div className="flex flex-col gap-2">
            {recentWork.map((g) => {
              const url = getResumeUrl(g);
              if (!url) return null;
              const Icon = g.type === 'deck' ? FileSliders : g.type === 'image' ? Image : g.type === 'infographic' ? LayoutGrid : FileText;
              return (
                <Link key={g.id} to={url} className="card px-5 py-4 flex items-center gap-4 no-underline text-ink hover:shadow-raised hover:border-[#CBD5E1] transition-all">
                  <Icon size={18} className="text-navy shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium truncate">{g.brief?.topic || 'Untitled'}</p>
                    <p className="text-[13px] text-slate mt-0.5">
                      {g.type === 'deck' ? 'Slide deck' : g.type === 'image' ? 'Image' : g.type === 'infographic' ? 'Infographic' : 'Training document'}
                      {' · '}
                      {new Date(g.updated_at || g.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`text-[13px] font-medium px-2.5 py-1 rounded-md ${
                    g.status === 'done' ? 'bg-emerald-50 text-emerald-700' :
                    g.status === 'generating' ? 'bg-amber-50 text-amber-700' :
                    'bg-canvas text-slate'
                  }`}>{statusLabels[g.status]}</span>
                  {confirmId === g.id ? (
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.preventDefault()}>
                      <span className="text-[13px] text-red-600">Delete draft?</span>
                      <button onClick={(e) => handleConfirmDelete(e, g.id)}
                        disabled={deleting === g.id}
                        className="px-2.5 py-1 rounded-md text-[13px] font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">
                        {deleting === g.id ? 'Deleting...' : 'Delete'}
                      </button>
                      <button onClick={handleCancelDelete}
                        className="px-2.5 py-1 rounded-md text-[13px] font-medium text-slate hover:bg-canvas transition-colors">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <ArrowRight size={16} className="text-slate shrink-0" />
                      <button onClick={(e) => handleTrashClick(e, g.id)}
                        className="p-1.5 rounded-md text-slate hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                        title="Delete draft">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-center">
        <h1 className="font-heading text-[36px] leading-[1.15] font-bold tracking-tight m-0">
          What would you like to create?
        </h1>
        <p className="text-[15px] text-slate mt-2">Choose a format to get started with your source material.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-rows-2 gap-5 max-w-[720px] mx-auto w-full">
        {types.map((t) => {
          const Icon = t.icon;
          if (t.disabled) {
            return (
              <div key={t.type} className="card p-7 flex gap-5 items-start opacity-45 cursor-not-allowed">
                <div className="w-11 h-11 rounded-lg bg-canvas flex items-center justify-center shrink-0">
                  <Icon size={22} className="text-slate" />
                </div>
                <div>
                  <p className="font-semibold text-[16px]">{t.label}</p>
                  <p className="text-[14px] text-slate mt-1 leading-relaxed">{t.desc}</p>
                  <p className="text-xs text-slate mt-2">Coming soon</p>
                </div>
              </div>
            );
          }
          return (
            <Link key={t.type} to={t.to} className="card p-7 flex gap-5 items-start no-underline text-ink hover:shadow-raised hover:border-[#CBD5E1] transition-all">
              <div className="w-11 h-11 rounded-lg bg-navy/5 flex items-center justify-center shrink-0">
                <Icon size={22} className="text-navy" />
              </div>
              <div>
                <p className="font-semibold text-[16px]">{t.label}</p>
                <p className="text-[14px] text-slate mt-1 leading-relaxed">{t.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="max-w-[720px] mx-auto w-full">
        <button type="button" onClick={() => setDocsOpen(!docsOpen)}
          className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-lg border border-border bg-white hover:bg-canvas transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <FolderOpen size={18} className="text-navy" />
            <span className="font-semibold text-[15px]">Source documents</span>
            {docs.length > 0 && (
              <span className="text-[13px] text-slate">{docs.filter((d) => d.status === 'ready').length} ready</span>
            )}
          </div>
          {docsOpen ? <ChevronUp size={18} className="text-slate" /> : <ChevronDown size={18} className="text-slate" />}
        </button>

        {docsOpen && (
          <div className="card mt-2 overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3 border-b border-border">
              <input ref={fileRef} type="file" id="home-doc-upload" className="hidden"
                accept=".pdf,.docx,.pptx,.md,.txt" onChange={handleUpload} />
              {uploading ? (
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <IngestionProgress progress={uploadProgress} phase={uploadPhase} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium truncate">{uploadFileName}</p>
                    <p className="text-[13px] text-slate truncate">{uploadMsg}</p>
                  </div>
                </div>
              ) : (
                <>
                  <button type="button"
                    onClick={() => fileRef.current?.click()}
                    className="btn-outline text-[14px] gap-1.5">
                    <Upload size={16} />
                    Upload document
                  </button>
                  {uploadMsg && (
                    <span className={`text-[13px] flex items-center gap-1.5 ${uploadPhase === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {uploadPhase === 'done' && <Check size={14} />}
                      {uploadPhase === 'error' && <X size={14} />}
                      {uploadMsg}
                    </span>
                  )}
                </>
              )}
            </div>

            {docs.length === 0 ? (
              <p className="hint px-5 py-4">No documents ingested yet. Upload PDFs, DOCX, or text files to use as source material.</p>
            ) : (
              <ul className="list-none m-0 p-0">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0 hover:bg-canvas">
                    <span className="text-[15px] flex-1 truncate">{d.name}</span>
                    {d.status === 'processing' && uploading && d.name === uploadFileName ? (
                      <div className="flex items-center gap-2">
                        <IngestionProgress progress={uploadProgress} phase={uploadPhase} />
                        <span className="text-[12px] text-amber-700">{uploadMsg || 'processing'}</span>
                      </div>
                    ) : (
                      <span className={`text-[12px] font-medium px-2 py-0.5 rounded-md ${
                        d.status === 'ready' ? 'bg-emerald-50 text-emerald-700' :
                        d.status === 'failed' ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-700'
                      }`}>{d.status || 'processing'}</span>
                    )}
                    {d.file_path && d.status === 'ready' && (
                      <a href={documents.downloadUrl(d.id)} download
                        className="text-cobalt hover:text-navy p-1" title="Download original">
                        <Download size={16} />
                      </a>
                    )}
                    <button type="button" onClick={() => handleDeleteDoc(d.id)}
                      className="text-slate hover:text-red-600 p-1" title="Delete document">
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
