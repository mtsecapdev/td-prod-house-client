import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { generations } from '../../services/api';
import AdjustableImage from '../figures/AdjustableImage';
import { iconUrl } from './engine';

/*
 * Draws one slide from the layout engine's boxes (td-prod-house-server shared/slides/layout.js), the same boxes
 * the PowerPoint download is drawn from, so the preview matches the file. Nothing here decides where things go.
 * The slide is 960 x 540 px: 1 inch of the engine's 13.333 x 7.5 in slide is 72 px, and a point is a pixel.
 * Editable texts are typed into in place; icons are picked by clicking them; each list entry gets add / remove /
 * move buttons when the pointer is over it.
 */

export const SLIDE_W = 960;
export const SLIDE_H = 540;
const PX = 72;

// The engine's colour names, as the template's CSS variables (components/plan/templates.js).
const COLORS = {
  primary: 'var(--color-navy)',
  accent: 'var(--color-cobalt)',
  accent_light: 'var(--t-accent-light)',
  text: 'var(--color-slate)',
  text_light: 'var(--t-text-light)',
  border: 'var(--color-border)',
  canvas: 'var(--color-canvas)',
  surface: '#FFFFFF',
  white: '#FFFFFF',
  on_dark: 'color-mix(in srgb, white 75%, var(--color-navy))',
  accent_tint: 'color-mix(in srgb, var(--color-cobalt) 12%, white)',
  quote_mark: 'color-mix(in srgb, var(--color-cobalt) 45%, white)',
  none: 'transparent',
};
const FONTS = { heading: 'var(--font-heading)', body: 'var(--font-body)', quote: 'Georgia, serif' };
const ALIGN = { l: 'left', c: 'center', r: 'right' };
const ANCHOR = { t: 'flex-start', m: 'center', b: 'flex-end' };
const DARK = new Set(['primary']);

const at = (b) => ({ position: 'absolute', left: b.x * PX, top: b.y * PX, width: b.w * PX, height: b.h * PX });

/* ── Text fields ── */

export function AutoTextarea({ value, onChange, className = '', ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = '0';
    ref.current.style.height = ref.current.scrollHeight + 'px';
  }, [value]);
  return (
    <textarea ref={ref} value={value || ''} onChange={(e) => onChange(e.target.value)}
      rows={1} className={`resize-none overflow-hidden ${className}`} {...props} />
  );
}

export const inputBase = 'block w-full bg-transparent border-0 outline-none p-0 rounded-sm transition-colors focus:bg-black/[0.04] placeholder:text-slate/40';
const fieldClass = (dark) => `block w-full bg-transparent border-0 outline-none p-0 m-0 rounded-sm transition-colors ${
  dark ? 'focus:bg-white/10 placeholder:text-white/35' : 'focus:bg-black/[0.04] placeholder:text-slate/40'}`;

function TextBox({ box, dark, editable, onText }) {
  const style = {
    fontSize: box.size, lineHeight: box.lh, fontWeight: box.bold ? 700 : 400, fontStyle: box.italic ? 'italic' : 'normal',
    fontFamily: FONTS[box.font] || FONTS.body, color: COLORS[box.color] || COLORS.text, textAlign: ALIGN[box.align] || 'left',
    textTransform: box.caps ? 'uppercase' : 'none',
  };
  const empty = !String(box.text || '').trim();
  if (!editable || !box.path) {
    if (empty) return null;
    return (
      <div style={{ ...at(box), display: 'flex', flexDirection: 'column', justifyContent: ANCHOR[box.anchor] || 'flex-start', pointerEvents: 'none' }}>
        <div style={{ ...style, whiteSpace: 'pre-wrap' }}>{(box.prefix || '') + (box.text || '')}</div>
      </div>
    );
  }
  return (
    <div style={{ ...at(box), height: undefined, minHeight: box.h * PX, display: 'flex', flexDirection: 'column', justifyContent: ANCHOR[box.anchor] || 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        {box.prefix && !empty && <span style={{ ...style, whiteSpace: 'pre' }}>{box.prefix}</span>}
        <AutoTextarea value={box.text} onChange={(v) => onText(box.path, v)} placeholder={box.placeholder}
          className={fieldClass(dark)} style={style} />
      </div>
    </div>
  );
}

/* ── Icons ── */

function IconFace({ box }) {
  const size = box.w * PX;
  return (
    <span className="flex items-center justify-center rounded-full" style={{ width: size, height: size, background: COLORS[box.fill] || COLORS.accent }}>
      {box.name
        ? <img src={iconUrl(box.name)} alt="" draggable={false} style={{ width: size * 0.52, height: size * 0.52 }} />
        : <span style={{ color: '#fff', fontWeight: 700, fontFamily: FONTS.heading, fontSize: Math.round(size * 0.38), lineHeight: 1 }}>{box.number}</span>}
    </span>
  );
}

function IconBox({ box, icons, editable, onIcon }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!editable || !box.path) return <div style={{ ...at(box), pointerEvents: 'none' }}><IconFace box={box} /></div>;

  function toggle() {
    const slide = ref.current?.closest('[data-slide]')?.getBoundingClientRect();
    const own = ref.current?.getBoundingClientRect();
    if (slide && own) setUp(own.top - slide.top > slide.height / 2);
    setOpen((o) => !o);
  }
  const pick = (name) => { onIcon(box.path, name); setOpen(false); };

  return (
    <div ref={ref} style={{ ...at(box), zIndex: open ? 30 : undefined }}>
      <button type="button" onClick={toggle} title="Change the icon"
        className="block p-0 bg-transparent border-0 cursor-pointer rounded-full hover:ring-2 hover:ring-cobalt/40 hover:ring-offset-2">
        <IconFace box={box} />
      </button>
      {open && (
        <div className={`absolute left-0 w-[300px] max-h-[220px] overflow-y-auto p-2 rounded-lg bg-white border border-border shadow-lg grid grid-cols-8 gap-1.5 ${up ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
          <button type="button" title="No icon: show the number" onClick={() => pick('')}
            className={`w-8 h-8 p-0 rounded-full border-0 cursor-pointer text-[12px] font-bold text-white bg-cobalt ${!box.name ? 'ring-2 ring-navy ring-offset-1' : 'opacity-70 hover:opacity-100'}`}>
            {box.number}
          </button>
          {icons.map((name) => (
            <button key={name} type="button" title={name.replace(/-/g, ' ')} onClick={() => pick(name)}
              className={`w-8 h-8 p-0 rounded-full border-0 cursor-pointer bg-cobalt flex items-center justify-center ${name === box.name ? 'ring-2 ring-navy ring-offset-1' : 'opacity-70 hover:opacity-100'}`}>
              <img src={iconUrl(name)} alt="" className="w-[17px] h-[17px]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Table ── */

function TableBox({ box, editable, onText }) {
  const cell = (value, path, header, first) => {
    const style = {
      fontSize: header ? box.size - 1 : box.size, lineHeight: 1.2, fontWeight: header || first ? 700 : 400,
      fontFamily: header || first ? FONTS.heading : FONTS.body,
      color: header ? '#fff' : first ? COLORS.primary : COLORS.text,
    };
    return editable
      ? <AutoTextarea value={value} onChange={(v) => onText(path, v)} placeholder={header ? 'Heading' : '-'} className={fieldClass(header)} style={style} />
      : <div style={style}>{value}</div>;
  };
  return (
    <table style={{ position: 'absolute', left: box.x * PX, top: box.y * PX, width: box.w * PX, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <colgroup>{box.colW.map((w, k) => <col key={k} style={{ width: w * PX }} />)}</colgroup>
      <thead>
        <tr style={{ height: box.rowH[0] * PX }}>
          {box.columns.map((col, k) => (
            <th key={k} style={{ background: COLORS.primary, padding: '0 11px', textAlign: 'left', verticalAlign: 'middle' }}>
              {cell(col, ['columns', k], true, false)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {box.rows.map((row, r) => (
          <tr key={r} style={{ height: box.rowH[r + 1] * PX, borderBottom: `1px solid ${COLORS.border}` }}>
            {box.columns.map((_, k) => (
              <td key={k} style={{ padding: '0 11px', verticalAlign: 'middle' }}>{cell(row[k] || '', ['rows', r, k], false, k === 0)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── List entry controls ── */

function EntryControls({ control, bounds, onInsert, onRemove, onMove }) {
  const btn = 'w-6 h-6 p-0 flex items-center justify-center rounded bg-transparent border-0 cursor-pointer text-slate disabled:opacity-25 disabled:cursor-default';
  const { path, index, count } = control;
  return (
    <div className="absolute z-20 flex gap-0.5 p-0.5 rounded-md bg-white border border-border shadow-sm"
      style={{ left: (control.x + control.w) * PX - 4, top: control.y * PX - 14, transform: 'translateX(-100%)' }}>
      {control.move && <>
        <button type="button" onClick={() => onMove(path, index, -1)} disabled={index === 0} title="Move earlier" className={`${btn} hover:text-navy`}><ChevronUp size={14} /></button>
        <button type="button" onClick={() => onMove(path, index, 1)} disabled={index === count - 1} title="Move later" className={`${btn} hover:text-navy`}><ChevronDown size={14} /></button>
      </>}
      <button type="button" onClick={() => onInsert(control, index)} disabled={count >= bounds.max} title="Add one after this" className={`${btn} hover:text-cobalt`}><Plus size={14} /></button>
      <button type="button" onClick={() => onRemove(path, index)} disabled={count <= Math.max(1, bounds.min)} title="Remove" className={`${btn} hover:text-red-600`}><X size={14} /></button>
    </div>
  );
}

/* ══════════════════════════════════════════════ */

/**
 * One slide. layout: layoutSlide()'s result. editable: typing, icons and list buttons work (thumbnails pass
 * false). Handlers take content paths, e.g. ['points', 2, 'detail']: onText(path, value), onIcon(path, name),
 * onInsert(control, index), onRemove(listPath, index), onMove(listPath, index, dir). bounds(control): the list's
 * { min, max } entries. diagram: { genId, templateId, value, onChange } for a diagram slide's picture.
 */
export default function SlideCanvas({ layout, icons = [], editable = false, onText, onIcon, onInsert, onRemove, onMove, bounds, diagram, children }) {
  const [hover, setHover] = useState(null);
  const rootRef = useRef(null);
  const dark = DARK.has(layout.background);

  // The list entry under the pointer gets its buttons (the entries themselves stay free to type into).
  function onPointerMove(e) {
    if (!editable || !layout.controls.length) return;
    const r = rootRef.current.getBoundingClientRect();
    const k = r.width / SLIDE_W;
    const x = (e.clientX - r.left) / k / PX;
    const y = (e.clientY - r.top) / k / PX;
    const found = layout.controls.findIndex((c) => x >= c.x - 0.1 && x <= c.x + c.w + 0.1 && y >= c.y - 0.25 && y <= c.y + c.h + 0.1);
    if (found !== hover) setHover(found === -1 ? null : found);
  }

  const image = layout.boxes.find((b) => b.type === 'image');
  const control = hover !== null ? layout.controls[hover] : null;

  return (
    // flow-root: the diagram's box is placed by its margins (not positioned), so its free-move layer measures
    // against the whole slide, as the download does.
    <div ref={rootRef} data-slide className="relative flow-root overflow-hidden"
      style={{ width: SLIDE_W, height: SLIDE_H, background: COLORS[layout.background] || COLORS.surface, fontFamily: FONTS.body }}
      onPointerMove={onPointerMove} onPointerLeave={() => setHover(null)}>
      {image && (
        <div style={{ marginLeft: image.x * PX, marginTop: image.y * PX, width: image.w * PX, height: image.h * PX }}>
          {diagram?.file
            ? <AdjustableImage mode="free" src={generations.diagramUrl(diagram.genId, diagram.file, diagram.templateId)} alt={diagram.alt}
                value={diagram.value} onChange={diagram.onChange} />
            : <p className="hint h-full flex items-center justify-center">Diagram not rendered yet.</p>}
        </div>
      )}
      {layout.boxes.map((b, i) => {
        if (b.editOnly && !editable) return null;
        switch (b.type) {
          case 'rect':
          case 'oval':
            return (
              <div key={i} style={{
                ...at(b), pointerEvents: 'none', background: COLORS[b.fill] || 'transparent', opacity: b.alpha ?? 1,
                borderRadius: b.type === 'oval' ? '50%' : (b.radius || 0) * PX,
                border: b.outline ? `1px dashed ${COLORS[b.outline]}` : undefined,
              }} />
            );
          case 'line': {
            const len = Math.hypot(b.x2 - b.x1, b.y2 - b.y1) * PX;
            const angle = Math.atan2(b.y2 - b.y1, b.x2 - b.x1);
            return (
              <div key={i} style={{
                position: 'absolute', left: b.x1 * PX, top: b.y1 * PX - (b.weight || 1.5) / 2, width: len, height: b.weight || 1.5,
                background: COLORS[b.color] || COLORS.border, transform: `rotate(${angle}rad)`, transformOrigin: '0 50%', pointerEvents: 'none',
              }} />
            );
          }
          case 'text': return <TextBox key={i} box={b} dark={dark} editable={editable} onText={onText} />;
          case 'icon': return <IconBox key={i} box={b} icons={icons} editable={editable} onIcon={onIcon} />;
          case 'table': return <TableBox key={i} box={b} editable={editable} onText={onText} />;
          default: return null;
        }
      })}
      {editable && control && (
        <EntryControls control={control} bounds={bounds(control)} onInsert={onInsert} onRemove={onRemove} onMove={onMove} />
      )}
      {children}
    </div>
  );
}
