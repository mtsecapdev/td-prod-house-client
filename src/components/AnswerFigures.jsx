import { useState } from 'react';
import { Plus } from 'lucide-react';
import { figures as figuresApi } from '../services/api';
import FigureLightbox from './figures/FigureLightbox';

/**
 * Figures from the documents that a chat answer refers to: thumbnails, full size on click. While a deck or
 * document is open, each can go straight onto the selected slide/section (onAdd, labelled addLabel).
 */
export default function AnswerFigures({ figures, addLabel, onAdd }) {
  const [open, setOpen] = useState(null);

  if (!figures?.length) return null;
  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {figures.map((f) => (
          <div key={f.id} className="bg-white border border-border rounded-lg p-1.5 max-w-[260px] flex flex-col gap-1">
            <button type="button" onClick={() => setOpen(f)} title="Open full size"
              className="text-left bg-transparent border-0 p-0 cursor-zoom-in">
              <img src={figuresApi.imageUrl(f.id)} alt={f.caption || 'Figure'} loading="lazy"
                className="block max-h-[150px] max-w-full object-contain rounded" />
              <span className="block text-[11px] text-slate mt-1 leading-snug line-clamp-2">
                {f.caption || 'Figure'}{f.page != null ? ` · p. ${f.page}` : ''}
              </span>
            </button>
            {onAdd && (
              <button type="button" onClick={() => onAdd(f)} className="btn-ghost text-[12px] py-0.5 px-1.5 self-start">
                <Plus size={12} />{addLabel}
              </button>
            )}
          </div>
        ))}
      </div>
      {open && <FigureLightbox figure={open} onClose={() => setOpen(null)} />}
    </>
  );
}
