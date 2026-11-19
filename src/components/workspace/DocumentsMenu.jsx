import { useEffect, useRef, useState } from 'react';
import { Paperclip, Upload, Download, Trash2, Check, X, ChevronDown } from 'lucide-react';
import { documents } from '../../services/api';
import { useUpload } from '../../contexts/UploadContext';
import ConfirmDocumentDelete from '../figures/ConfirmDocumentDelete';

function IngestionProgress({ progress, phase }) {
  const size = 28;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const isDone = phase === 'done';
  const isError = phase === 'error';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={isDone ? '#10B981' : isError ? '#EF4444' : '#2563EB'} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference - (progress / 100) * circumference}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-slate">
        {isDone ? <Check size={12} className="text-emerald-600" /> : isError ? <X size={12} className="text-red-500" /> : `${progress}%`}
      </span>
    </div>
  );
}

/**
 * The documents a conversation works with (tick to include), plus uploading and deleting documents.
 * selected/onChange: the conversation's document ids.
 */
export default function DocumentsMenu({ docs, selected, onChange, onDocsChanged }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const fileRef = useRef(null);
  const rootRef = useRef(null);
  const { uploading, uploadPhase, uploadMsg, uploadProgress, uploadFileName, startUpload } = useUpload();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!rootRef.current?.contains(e.target) && !deleting) setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, deleting]);

  const ready = docs.filter((d) => d.status === 'ready');
  const chosen = selected.filter((id) => ready.some((d) => d.id === id));
  const label = !ready.length ? 'Add documents' : chosen.length === ready.length ? 'All documents' : `${chosen.length} document${chosen.length === 1 ? '' : 's'}`;

  function toggle(id) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    // A new document joins this conversation once it is ready.
    startUpload(file, (docId) => onDocsChanged(docId), () => onDocsChanged());
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] border cursor-pointer ${
          chosen.length ? 'border-border bg-white text-ink hover:bg-canvas' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
        <Paperclip size={14} />{label}<ChevronDown size={13} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-30 w-[380px] max-w-[90vw] bg-white border border-border rounded-lg shadow-lg flex flex-col">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[13px] font-semibold text-navy">Documents for this chat</span>
            {ready.length > 1 && (
              <button type="button" className="text-[12px] text-cobalt bg-transparent border-0 cursor-pointer p-0"
                onClick={() => onChange(chosen.length === ready.length ? [] : ready.map((d) => d.id))}>
                {chosen.length === ready.length ? 'Clear' : 'Select all'}
              </button>
            )}
          </div>
          <ul className="list-none m-0 p-0 max-h-[280px] overflow-y-auto">
            {docs.length === 0 && <li className="hint text-[13px] px-3 py-3">No documents yet. Upload a PDF, Word or text file.</li>}
            {docs.map((d) => (
              <li key={d.id} className="group flex items-center gap-2.5 px-3 py-2 hover:bg-canvas">
                {d.status === 'processing' && uploading && d.name === uploadFileName ? (
                  <IngestionProgress progress={uploadProgress} phase={uploadPhase} />
                ) : (
                  <input type="checkbox" checked={selected.includes(d.id)} disabled={d.status !== 'ready'}
                    onChange={() => toggle(d.id)} className="w-4 h-4 accent-navy shrink-0" aria-label={`Use ${d.name}`} />
                )}
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] truncate" title={d.name}>{d.name}</span>
                  {d.status !== 'ready' && (
                    <span className={`block text-[11px] ${d.status === 'failed' ? 'text-red-600' : 'text-amber-700'}`}>
                      {d.status === 'processing' && uploading && d.name === uploadFileName ? uploadMsg || 'Processing…' : d.status}
                    </span>
                  )}
                </span>
                {d.file_path && d.status === 'ready' && (
                  <a href={documents.downloadUrl(d.id)} download className="p-1 text-slate hover:text-navy opacity-0 group-hover:opacity-100" title="Download original">
                    <Download size={14} />
                  </a>
                )}
                <button type="button" onClick={() => setDeleting(d)} title="Delete document"
                  className="p-1 text-slate hover:text-red-600 bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
          <div className="px-3 py-2 border-t border-border">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-outline text-[13px] w-full justify-center">
              <Upload size={14} />{uploading ? 'Uploading…' : 'Upload a document'}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.pptx,.md,.txt" className="hidden" onChange={upload} />
          </div>
        </div>
      )}
      {deleting && (
        <ConfirmDocumentDelete doc={deleting} onCancel={() => setDeleting(null)}
          onDeleted={(id) => { setDeleting(null); onChange(selected.filter((x) => x !== id)); onDocsChanged(); }} />
      )}
    </div>
  );
}
