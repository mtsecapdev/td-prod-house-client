import { useEffect, useRef, useState } from 'react';
import { Palette, ChevronDown } from 'lucide-react';
import TemplatePicker from './TemplatePicker';

/** Editor header button that opens the template gallery (previews, company .pptx upload). */
export default function TemplateMenu({ templates, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = templates.find((t) => t.id === value);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!templates.length) return null;
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="btn-outline text-[12px] gap-1 py-1 px-2">
        <Palette size={13} />{current?.name || 'Template'}<ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-[420px] max-w-[90vw] bg-white border border-border rounded-lg shadow-raised p-3">
          <TemplatePicker templates={templates} value={value} columns={3}
            onChange={(id) => { onChange(id); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}
