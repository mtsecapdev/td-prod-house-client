import { useEffect } from 'react';
import { X } from 'lucide-react';
import { figures as figuresApi } from '../../services/api';

/** Full-size view of a document figure. Escape or a click outside closes it. */
export default function FigureLightbox({ figure, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={onClose}
      role="dialog" aria-modal="true" aria-label={figure.caption || 'Figure'}>
      <figure className="m-0 bg-white rounded-lg p-4 max-w-[95vw] max-h-[92vh] flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <figcaption className="text-[14px] font-semibold text-navy">
            {figure.caption || 'Figure'}
            {figure.page != null && <span className="font-normal text-slate"> · p. {figure.page}</span>}
            {figure.document_name && <span className="font-normal text-slate"> · {figure.document_name}</span>}
          </figcaption>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close"><X size={16} /></button>
        </div>
        <img src={figuresApi.imageUrl(figure.id)} alt={figure.caption || 'Figure'} className="max-w-full max-h-[80vh] object-contain" />
      </figure>
    </div>
  );
}
