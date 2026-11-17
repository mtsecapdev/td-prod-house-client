import { Check } from 'lucide-react';

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

/** A gallery of visual templates with a mini slide preview each. */
export default function TemplatePicker({ templates, value, onChange, columns = 2 }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {templates.map((t) => {
        const selected = t.id === value;
        return (
          <button key={t.id} type="button" onClick={() => onChange(t.id)} title={t.description}
            className={`relative text-left p-1.5 rounded-lg border-2 bg-white cursor-pointer transition-colors ${
              selected ? 'border-navy' : 'border-transparent hover:border-border'}`}>
            <MiniSlide template={t} />
            <span className="block text-[12px] font-semibold text-ink mt-1 px-0.5">{t.name}</span>
            {selected && (
              <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow">
                <Check size={12} className="text-navy" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
