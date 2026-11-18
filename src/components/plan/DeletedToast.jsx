import { X } from 'lucide-react';

/** "Slide 3 deleted · Undo", shown for a few seconds after a delete. */
export default function DeletedToast({ removed, noun, onUndo, onClose }) {
  if (!removed) return null;
  const title = removed.item.content?.title || removed.item.title;
  return (
    <div role="status" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-navy text-white rounded-lg shadow-lg pl-4 pr-2 py-2 text-[13px]">
      <span className="max-w-[360px] truncate">
        Deleted {noun} {removed.index + 1}{title ? `: ${title}` : ''}
      </span>
      <button type="button" onClick={onUndo} className="font-semibold underline bg-transparent border-0 text-white cursor-pointer px-1">Undo</button>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="p-1 bg-transparent border-0 text-white/70 hover:text-white cursor-pointer"><X size={14} /></button>
    </div>
  );
}
