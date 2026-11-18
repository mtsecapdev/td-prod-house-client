import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { figures as figuresApi } from '../../services/api';

/** Shown where a deleted figure used to be. */
export function FigureRemoved() {
  return (
    <div className="flex flex-col items-center justify-center gap-1 text-slate border border-dashed border-border rounded-md px-6 py-8">
      <ImageOff size={20} />
      <span className="text-[13px]">Figure removed</span>
      <span className="text-[11px]">Choose another with “Change figure”.</span>
    </div>
  );
}

/** A document figure thumbnail (e.g. on outline cards); shows "Figure removed" once the asset is deleted. */
export default function FigureImage({ figureId, alt, className = '' }) {
  const [failedId, setFailedId] = useState(null);
  if (!figureId || failedId === figureId) return <FigureRemoved />;
  return <img src={figuresApi.imageUrl(figureId)} alt={alt} className={className} onError={() => setFailedId(figureId)} />;
}
