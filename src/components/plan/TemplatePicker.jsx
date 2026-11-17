import { useRef, useState } from 'react';
import { Check, Upload, Loader2, Trash2 } from 'lucide-react';
import { generations } from '../../services/api';
import { reloadTemplates } from './templates';

function MiniSlide({ template }) {
  const c = template.colors;
  return (
    <div className="w-full aspect-[16/9] rounded-md overflow-hidden border" style={{ borderColor: c.border, background: c.surface }}>
      <div className="h-[46%] px-2.5 flex flex-col justify-center gap-1" style={{ background: c.primary }}>
        <span className="text-[13px] leading-none font-bold text-white truncate" style={{ fontFamily: `'${template.fonts.heading}', sans-serif` }}>
          Aa {template.name}
        </span>
        <span className="block h-[3px] w-6 rounded-full" style={{ background: c.accent_light }} />
      </div>
      <div className="px-2.5 pt-2 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 rounded-sm p-1" style={{ background: c.canvas, borderTop: `2px solid ${c.accent}` }}>
            <div className="h-[3px] w-3/4 rounded-full mb-1" style={{ background: c.primary }} />
            <div className="h-[2px] w-full rounded-full" style={{ background: c.text_light }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A gallery of visual templates with a mini slide preview each, and an upload tile for a company .pptx
 * (its theme colours and fonts become a template; decks build on its slide masters).
 */
export default function TemplatePicker({ templates, value, onChange, columns = 2 }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { template } = await generations.uploadTemplate(file);
      await reloadTemplates();
      onChange(template.id);
    } catch (err) {
      setError(err.message);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function remove(t) {
    setError(null);
    try {
      await generations.deleteTemplate(t.id);
      await reloadTemplates();
      if (t.id === value) onChange('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {templates.map((t) => {
          const selected = t.id === value;
          return (
            <div key={t.id} className="relative group">
              <button type="button" onClick={() => onChange(t.id)} title={t.description}
                className={`w-full text-left p-1.5 rounded-lg border-2 bg-white cursor-pointer transition-colors ${
                  selected ? 'border-navy' : 'border-transparent hover:border-border'}`}>
                <MiniSlide template={t} />
                <span className="block text-[12px] font-semibold text-ink mt-1 px-0.5 truncate">{t.name}</span>
              </button>
              {selected && (
                <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow pointer-events-none">
                  <Check size={12} className="text-navy" />
                </span>
              )}
              {t.custom && (
                <button type="button" onClick={() => remove(t)} title="Delete this uploaded template"
                  className="absolute bottom-1.5 right-1.5 p-1 rounded bg-white/90 text-slate hover:text-red-600 border-0 cursor-pointer opacity-0 group-hover:opacity-100">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="p-1.5 rounded-lg border-2 border-dashed border-border bg-white hover:bg-canvas cursor-pointer flex flex-col items-center justify-center gap-1 min-h-[96px] text-slate"
          title="Use your company's PowerPoint template">
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          <span className="text-[12px] font-semibold">{uploading ? 'Reading…' : 'Upload .pptx'}</span>
        </button>
        <input ref={fileRef} type="file" accept=".pptx" className="hidden" onChange={upload} />
      </div>
      {error && <p className="text-[12px] text-red-700 m-0">{error}</p>}
    </div>
  );
}
