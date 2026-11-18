import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { documents } from '../services/api';

/** Figures from the documents that a chat answer refers to: thumbnails, full size on click. */
export default function AnswerFigures({ figures }) {
  const [open, setOpen] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!figures?.length) return null;
  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {figures.map((f) => (
          <button key={f.id} type="button" onClick={() => setOpen(f)} title="Open full size"
            className="group text-left bg-white border border-border rounded-lg p-1.5 cursor-pointer hover:border-navy max-w-[260px]">
            <img src={documents.figureUrl(f.id)} alt={f.caption || 'Figure'} loading="lazy"
              className="block max-h-[150px] max-w-full object-contain rounded" />
            <span className="block text-[11px] text-slate mt-1 leading-snug line-clamp-2">
              {f.caption || 'Figure'}{f.page != null ? ` · p. ${f.page}` : ''}
            </span>
          </button>
        ))}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={() => setOpen(null)}
          role="dialog" aria-modal="true" aria-label={open.caption || 'Figure'}>
          <figure className="m-0 bg-white rounded-lg p-4 max-w-[95vw] max-h-[92vh] flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <figcaption className="text-[14px] font-semibold text-navy">
                {open.caption || 'Figure'}{open.page != null ? <span className="font-normal text-slate"> · p. {open.page}</span> : null}
              </figcaption>
              <button type="button" onClick={() => setOpen(null)} className="icon-btn" aria-label="Close"><X size={16} /></button>
            </div>
            <img src={documents.figureUrl(open.id)} alt={open.caption || 'Figure'} className="max-w-full max-h-[80vh] object-contain" />
          </figure>
        </div>
      )}
    </>
  );
}
