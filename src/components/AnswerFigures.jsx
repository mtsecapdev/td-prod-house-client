import { useState } from 'react';
import { figures as figuresApi } from '../services/api';
import FigureLightbox from './figures/FigureLightbox';

/** Figures from the documents that a chat answer refers to: thumbnails, full size on click. */
export default function AnswerFigures({ figures }) {
  const [open, setOpen] = useState(null);

  if (!figures?.length) return null;
  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {figures.map((f) => (
          <button key={f.id} type="button" onClick={() => setOpen(f)} title="Open full size"
            className="group text-left bg-white border border-border rounded-lg p-1.5 cursor-pointer hover:border-navy max-w-[260px]">
            <img src={figuresApi.imageUrl(f.id)} alt={f.caption || 'Figure'} loading="lazy"
              className="block max-h-[150px] max-w-full object-contain rounded" />
            <span className="block text-[11px] text-slate mt-1 leading-snug line-clamp-2">
              {f.caption || 'Figure'}{f.page != null ? ` · p. ${f.page}` : ''}
            </span>
          </button>
        ))}
      </div>
      {open && <FigureLightbox figure={open} onClose={() => setOpen(null)} />}
    </>
  );
}
