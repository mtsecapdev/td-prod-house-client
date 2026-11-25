import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { generations } from '../../services/api';
import AdjustableImage from '../figures/AdjustableImage';
import { SLIDE_ICONS } from './slideIcons';

/*
 * The editor's slide preview, one component per layout. It mirrors render_pptx.py (td-prod-house-server) so what
 * the user edits is what they download: the same grid, sizes and colours, at 1 inch = 72 px on a 960 x 540
 * slide, so a point size there is a pixel size here. Every text is edited in place.
 */

// ── Grid (px; render_pptx.py's inches x 72) ──
const M = 54;                 // side margins
const ACCENT_Y = 45;          // the short accent bar over the title
const TITLE_Y = 60;
const BODY_TOP = 148;
const BODY_BOTTOM = 486;
const BODY_H = BODY_BOTTOM - BODY_TOP;
const PANEL_X = 544;          // the picture panel on the right
const FULL_W = 852;           // text width without a panel
const PANEL_TEXT_W = 457;     // text width beside the panel
const GAP = 25;

// Layouts that give their pictures the panel on the right (render_pptx.py PANEL_LAYOUTS).
const PANEL_LAYOUTS = new Set(['bullets', 'checklist', 'stat_focus', 'big_idea', 'quote_highlight', 'two_column', 'key_stats', 'icon_grid']);
const hasPanel = (content, layout) => PANEL_LAYOUTS.has(layout) && Boolean(content.pictures?.length);

const LIGHT_ON_DARK = 'color-mix(in srgb, white 75%, var(--color-navy))';

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
const darkInput = 'block w-full bg-transparent border-0 outline-none p-0 rounded-sm transition-colors focus:bg-white/10 placeholder:text-white/35';

/* ── Shared parts ── */

/** Add / remove / move buttons shown over an item on hover. */
function ItemControls({ onAdd, onRemove, canAdd = true, canRemove = true, onMove, index = 0, count = 1, addTitle = 'Add one after this' }) {
  const btn = 'w-5 h-5 p-0 flex items-center justify-center rounded bg-transparent border-0 cursor-pointer text-slate disabled:opacity-25 disabled:cursor-default';
  return (
    <div className="absolute -top-3 right-1 z-20 flex gap-0.5 p-0.5 rounded-md bg-white border border-border shadow-sm opacity-0 group-hover/item:opacity-100 focus-within:opacity-100 transition-opacity">
      {onMove && <>
        <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} title="Move earlier" className={`${btn} hover:text-navy`}><ChevronUp size={13} /></button>
        <button type="button" onClick={() => onMove(index, 1)} disabled={index === count - 1} title="Move later" className={`${btn} hover:text-navy`}><ChevronDown size={13} /></button>
      </>}
      {onAdd && <button type="button" onClick={() => onAdd(index)} disabled={!canAdd} title={addTitle} className={`${btn} hover:text-cobalt`}><Plus size={13} /></button>}
      {onRemove && <button type="button" onClick={() => onRemove(index)} disabled={!canRemove || count <= 1} title="Remove" className={`${btn} hover:text-red-600`}><X size={13} /></button>}
    </div>
  );
}

/** A white icon on an accent circle (render_pptx.py add_icon). */
function IconCircle({ Icon, size }) {
  return (
    <span className="rounded-full bg-cobalt flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.52)} color="white" strokeWidth={2} />
    </span>
  );
}

/** A point's marker: its icon on an accent circle, else its number. Clicking it picks another icon. */
function Marker({ icon, number, size, onIcon }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const ref = useRef(null);
  const Icon = SLIDE_ICONS[icon];

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  function toggle() {
    const slide = ref.current?.closest('[data-slide]')?.getBoundingClientRect();
    const own = ref.current?.getBoundingClientRect();
    if (slide && own) setUp(own.top - slide.top > slide.height / 2);
    setOpen((o) => !o);
  }

  const face = Icon
    ? <IconCircle Icon={Icon} size={size} />
    : <span className="font-heading font-bold text-cobalt text-[18px] leading-none flex items-center shrink-0" style={{ width: size, height: size }}>{String(number).padStart(2, '0')}</span>;

  return (
    <div ref={ref} className="relative shrink-0" style={{ width: size, height: size }}>
      <button type="button" onClick={toggle} title="Change the icon"
        className="p-0 bg-transparent border-0 cursor-pointer rounded-full hover:ring-2 hover:ring-cobalt/40 hover:ring-offset-2 block">
        {face}
      </button>
      {open && (
        <div className={`absolute left-0 z-30 w-[268px] max-h-[210px] overflow-y-auto p-2 rounded-lg bg-white border border-border shadow-lg grid grid-cols-8 gap-1 ${up ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
          <button type="button" title="No icon: show the number" onClick={() => { onIcon(''); setOpen(false); }}
            className={`w-7 h-7 p-0 rounded-md border-0 cursor-pointer text-[11px] font-bold ${!Icon ? 'bg-cobalt text-white' : 'bg-transparent text-slate hover:bg-canvas'}`}>
            {String(number).padStart(2, '0')}
          </button>
          {Object.entries(SLIDE_ICONS).map(([name, I]) => (
            <button key={name} type="button" title={name.replace(/-/g, ' ')} onClick={() => { onIcon(name); setOpen(false); }}
              className={`w-7 h-7 p-0 rounded-md border-0 cursor-pointer flex items-center justify-center ${name === icon ? 'bg-cobalt text-white' : 'bg-transparent text-navy hover:bg-canvas'}`}>
              <I size={16} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** The short accent bar and the title over every content slide. */
function TitleBlock({ value, onChange, width, placeholder = 'Slide title' }) {
  return (
    <>
      <div className="absolute bg-cobalt" style={{ left: M, top: ACCENT_Y, width: 40, height: 4 }} />
      <div className="absolute" style={{ left: M, top: TITLE_Y, width }}>
        <AutoTextarea value={value} onChange={onChange} placeholder={placeholder}
          className={`${inputBase} font-heading text-[30px] leading-[1.1] font-bold text-navy`} />
      </div>
    </>
  );
}

function Panel() {
  return <div className="absolute bg-canvas" style={{ left: PANEL_X, top: 0, right: 0, bottom: 0 }} />;
}

/**
 * A white content slide: the picture panel when it has pictures, the title, and the body area below it.
 * children(width, panel) draws the body; `centred` sits it a little above the middle of the body, like
 * render_pptx.py body_top().
 */
function ContentSlide({ content, layout, onField, placeholder, centred = true, children }) {
  const panel = hasPanel(content, layout);
  const width = panel ? PANEL_TEXT_W : FULL_W;
  return (
    <div className="relative w-full h-full bg-white">
      {panel && <Panel />}
      <TitleBlock value={content.title} onChange={(v) => onField('title', v)} width={width} placeholder={placeholder} />
      <div className="absolute flex flex-col" style={{ left: M, top: BODY_TOP, width, height: BODY_H }}>
        {centred && <div style={{ flexGrow: 2 }} />}
        {children(width, panel)}
        {centred && <div style={{ flexGrow: 3 }} />}
      </div>
    </div>
  );
}

/** The slide number at the bottom right (render_pptx.py footer). */
export function SlideNumber({ number, dark = false }) {
  return (
    <div className="absolute text-right text-[10px] pointer-events-none"
      style={{ right: 40, top: 504, color: dark ? 'var(--t-accent-light)' : 'var(--t-text-light)' }}>
      {String(number).padStart(2, '0')}
    </div>
  );
}

/** A point as a card: marker on top, heading, detail (render_pptx.py point_card). */
function PointCard({ icon, number, onIcon, heading, onHeading, detail, onDetail, headingPlaceholder = 'Heading', detailPlaceholder = 'Detail' }) {
  return (
    <div className="h-full rounded-[6px] bg-canvas p-[27px] flex flex-col">
      <Marker icon={icon} number={number} size={45} onIcon={onIcon} />
      <AutoTextarea value={heading} onChange={onHeading} placeholder={headingPlaceholder}
        className={`${inputBase} mt-[18px] font-heading text-[20px] leading-[1.2] font-bold text-navy`} />
      <AutoTextarea value={detail} onChange={onDetail} placeholder={detailPlaceholder}
        className={`${inputBase} mt-1.5 text-[15px] leading-[1.3] text-slate`} />
    </div>
  );
}

/** A point as a row: marker on the left, heading and detail beside it (render_pptx.py point_row). */
function PointRow({ icon, number, onIcon, heading, onHeading, detail, onDetail, marker = 36, headingPt = 18, detailPt = 14,
  headingPlaceholder = 'Heading', detailPlaceholder = 'Detail' }) {
  return (
    <div className="flex items-start gap-[18px] min-w-0">
      <Marker icon={icon} number={number} size={marker} onIcon={onIcon} />
      <div className="flex-1 min-w-0">
        <AutoTextarea value={heading} onChange={onHeading} placeholder={headingPlaceholder}
          className={`${inputBase} font-heading font-bold text-navy leading-[1.2]`} style={{ fontSize: headingPt }} />
        <AutoTextarea value={detail} onChange={onDetail} placeholder={detailPlaceholder}
          className={`${inputBase} mt-1 text-slate leading-[1.3]`} style={{ fontSize: detailPt }} />
      </div>
    </div>
  );
}

/** Columns for n cards: all in one row up to 3, else two or three per row (render_pptx.py icon grid / key stats). */
const cardColumns = (n, panel) => (n <= 3 ? Math.max(n, 1) : n === 4 || panel ? 2 : 3);

/* ══════════════════════════════════════════════
   LAYOUTS
   ══════════════════════════════════════════════ */

/** Title, section and closing slides: the primary colour with two soft accent circles off the edge. */
function DarkSlide({ children }) {
  return (
    <div className="relative w-full h-full overflow-hidden bg-navy">
      <div className="absolute rounded-full bg-cobalt opacity-[0.18]" style={{ left: 586, top: -173, width: 576, height: 576 }} />
      <div className="absolute rounded-full opacity-10" style={{ left: 773, top: 281, width: 360, height: 360, background: 'var(--t-accent-light)' }} />
      {children}
    </div>
  );
}

export function TitleSlide({ content, onField }) {
  return (
    <DarkSlide>
      <div className="absolute" style={{ left: M + 4, top: 169, width: 50, height: 6, background: 'var(--t-accent-light)' }} />
      <div className="absolute" style={{ left: M, top: 190, width: 619 }}>
        <AutoTextarea value={content.title} onChange={(v) => onField('title', v)} placeholder="Deck title"
          className={`${darkInput} font-heading text-[46px] leading-[1.05] font-bold text-white`} />
      </div>
      <div className="absolute" style={{ left: M, top: 360, width: 562 }}>
        <AutoTextarea value={content.subtitle} onChange={(v) => onField('subtitle', v)} placeholder="Subtitle"
          className={`${darkInput} text-[20px] leading-[1.3]`} style={{ color: LIGHT_ON_DARK }} />
      </div>
    </DarkSlide>
  );
}

export function SectionDividerSlide({ content, onField }) {
  return (
    <DarkSlide>
      <div className="absolute" style={{ left: M + 4, top: 198, width: 50, height: 6, background: 'var(--t-accent-light)' }} />
      <div className="absolute" style={{ left: M, top: 220, width: 619 }}>
        <AutoTextarea value={content.title} onChange={(v) => onField('title', v)} placeholder="Section title"
          className={`${darkInput} font-heading text-[40px] leading-[1.05] font-bold text-white`} />
      </div>
      <div className="absolute" style={{ left: M, top: 338, width: 562 }}>
        <AutoTextarea value={content.subtitle} onChange={(v) => onField('subtitle', v)} placeholder="Subtitle"
          className={`${darkInput} text-[20px] leading-[1.3]`} style={{ color: LIGHT_ON_DARK }} />
      </div>
    </DarkSlide>
  );
}

export function ClosingSlide({ content, onField, onTakeaway, onAddTakeaway, onRemoveTakeaway }) {
  const takeaways = content.takeaways || [];
  const cta = content.call_to_action || '';
  const rowH = Math.min((cta ? 230 : 299) / Math.max(takeaways.length, 1), 68);
  return (
    <DarkSlide>
      <p className="absolute m-0 text-[13px] font-bold tracking-wide" style={{ left: M, top: 58, color: 'var(--t-accent-light)' }}>KEY TAKEAWAYS</p>
      <div className="absolute" style={{ left: M, top: 86, width: 720 }}>
        <input type="text" value={content.title || ''} onChange={(e) => onField('title', e.target.value)} placeholder="Key takeaways"
          className={`${darkInput} font-heading text-[34px] leading-[1.15] font-bold text-white`} />
      </div>
      <ol className="absolute list-none m-0 p-0 flex flex-col" style={{ left: M, top: 176, width: 710 }}>
        {takeaways.map((t, i) => (
          <li key={i} className="group/item relative flex items-start gap-[17px]" style={{ minHeight: rowH }}>
            <IconCircle Icon={Check} size={30} />
            <AutoTextarea value={t} onChange={(v) => onTakeaway(i, v)} placeholder="Takeaway"
              className={`${darkInput} flex-1 text-[19px] leading-[1.3] text-white`} />
            <ItemControls onAdd={onAddTakeaway} onRemove={onRemoveTakeaway} canAdd={takeaways.length < 5} index={i} count={takeaways.length} />
          </li>
        ))}
      </ol>
      <div className={`absolute flex items-center px-[22px] rounded-[9px] ${cta ? 'bg-cobalt' : 'border border-dashed border-white/25'}`}
        style={{ left: M, top: 421, width: 706, height: 54 }}>
        <input type="text" value={cta} onChange={(e) => onField('call_to_action', e.target.value)} placeholder="Call to action (optional)"
          className={`${darkInput} text-[17px] font-bold text-white`} />
      </div>
    </DarkSlide>
  );
}

export function BulletsSlide({ content, onField, onBullet, onMoveBullet, onAddBullet, onRemoveBullet, dragHandlers }) {
  const bullets = content.bullets || [];
  const n = bullets.length;
  return (
    <ContentSlide content={content} layout="bullets" onField={onField}>
      {(width, panel) => {
        const look = panel || n >= 5 ? 'rows' : n === 4 ? 'grid' : 'cards';
        const cols = look === 'rows' ? (n >= 5 && !panel ? 2 : 1) : look === 'grid' ? 2 : Math.max(n, 1);
        const point = (b, i, props = {}) => ({
          icon: b.icon, number: i + 1, onIcon: (v) => onBullet(i, 'icon', v),
          heading: b.heading, onHeading: (v) => onBullet(i, 'heading', v),
          detail: b.detail, onDetail: (v) => onBullet(i, 'detail', v), ...props,
        });
        return (
          <ol className="list-none m-0 p-0 grid" style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            columnGap: GAP, rowGap: look === 'rows' ? (n > 4 ? 14 : 26) : GAP,
          }}>
            {bullets.map((b, i) => (
              <li key={i} draggable
                onDragStart={() => dragHandlers.start(i)} onDragOver={(e) => dragHandlers.over(e, i)}
                onDrop={() => dragHandlers.drop(i)} onDragEnd={dragHandlers.end}
                className={`group/item relative rounded-[6px] ${dragHandlers.overIdx === i && dragHandlers.dragIdx !== i ? 'outline-2 outline-cobalt outline-offset-4' : ''} ${dragHandlers.dragIdx === i ? 'opacity-40' : ''}`}>
                {look === 'cards' && <PointCard {...point(b, i)} />}
                {look === 'grid' && (
                  <div className="h-full rounded-[6px] bg-canvas px-[25px] py-[29px]">
                    <PointRow {...point(b, i, { marker: 43, headingPt: 19, detailPt: 14 })} />
                  </div>
                )}
                {look === 'rows' && <PointRow {...point(b, i)} />}
                <ItemControls onMove={onMoveBullet} onAdd={onAddBullet} onRemove={onRemoveBullet} canAdd={n < 6}
                  index={i} count={n} addTitle="Add a point after this" />
              </li>
            ))}
          </ol>
        );
      }}
    </ContentSlide>
  );
}

export function IconGridSlide({ content, onField, onItem, onAddItem, onRemoveItem }) {
  const items = content.items || [];
  const n = items.length;
  return (
    <ContentSlide content={content} layout="icon_grid" onField={onField} placeholder="Grid title">
      {(width, panel) => {
        const cols = cardColumns(n, panel);
        const oneRow = n <= cols;
        return (
          <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: GAP, gridAutoRows: oneRow ? undefined : '1fr' }}>
            {items.map((it, i) => {
              const point = {
                icon: it.icon, number: i + 1, onIcon: (v) => onItem(i, 'icon', v),
                heading: it.label, onHeading: (v) => onItem(i, 'label', v), headingPlaceholder: 'Label',
                detail: it.description, onDetail: (v) => onItem(i, 'description', v), detailPlaceholder: 'Description',
              };
              return (
                <div key={i} className="group/item relative">
                  {oneRow
                    ? <PointCard {...point} />
                    : <div className="h-full rounded-[6px] bg-canvas p-[22px]"><PointRow {...point} marker={40} headingPt={17} detailPt={13} /></div>}
                  <ItemControls onAdd={onAddItem} onRemove={onRemoveItem} canAdd={n < 6} index={i} count={n} />
                </div>
              );
            })}
          </div>
        );
      }}
    </ContentSlide>
  );
}

export function ChecklistSlide({ content, onField, onItem, onAddItem, onRemoveItem }) {
  const items = content.items || [];
  const n = items.length;
  return (
    <ContentSlide content={content} layout="checklist" onField={onField}>
      {(width, panel) => {
        const cols = n > 5 && !panel ? 2 : 1;
        const rows = Math.ceil(n / cols) || 1;
        return (
          // Filled down the first column, then the second, like the download.
          <ol className="list-none m-0 p-0 grid" style={{
            gridAutoFlow: 'column', gridTemplateRows: `repeat(${rows}, auto)`, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            columnGap: 36, rowGap: n > 5 ? 12 : 20,
          }}>
            {items.map((it, i) => (
              <li key={i} className="group/item relative flex items-start gap-[18px]">
                <IconCircle Icon={Check} size={32} />
                <div className="flex-1 min-w-0">
                  <AutoTextarea value={it.step} onChange={(v) => onItem(i, 'step', v)} placeholder="Step"
                    className={`${inputBase} font-heading text-[18px] leading-[1.2] font-bold text-navy`} />
                  <AutoTextarea value={it.detail} onChange={(v) => onItem(i, 'detail', v)} placeholder="Detail"
                    className={`${inputBase} mt-1 text-[14px] leading-[1.3] text-slate`} />
                </div>
                <ItemControls onAdd={onAddItem} onRemove={onRemoveItem} canAdd={n < 8} index={i} count={n} addTitle="Add a step after this" />
              </li>
            ))}
          </ol>
        );
      }}
    </ContentSlide>
  );
}

export function ProcessFlowSlide({ content, onField, onStep, onAddStep, onRemoveStep }) {
  const steps = content.steps || [];
  const n = steps.length;
  const small = n > 5;
  return (
    <ContentSlide content={content} layout="process_flow" onField={onField} placeholder="Process title">
      {() => (
        <div className="relative flex" style={{ minHeight: 245 }}>
          {/* The line runs through the circles, from the first to the last. */}
          {n > 1 && <div className="absolute bg-border" style={{ top: 24, height: 3, left: `${50 / n}%`, right: `${50 / n}%` }} />}
          {steps.map((s, i) => (
            <div key={i} className="group/item relative flex-1 min-w-0 flex flex-col items-center px-[7px]">
              <div className="relative w-[52px] h-[52px] rounded-full bg-cobalt text-white font-heading font-bold text-[20px] flex items-center justify-center shrink-0">{i + 1}</div>
              <AutoTextarea value={s.label} onChange={(v) => onStep(i, 'label', v)} placeholder="Step"
                className={`${inputBase} mt-[22px] font-heading font-bold text-navy text-center leading-[1.15]`} style={{ fontSize: small ? 16 : 18 }} />
              <AutoTextarea value={s.detail} onChange={(v) => onStep(i, 'detail', v)} placeholder="Detail"
                className={`${inputBase} mt-1.5 text-slate text-center leading-[1.3]`} style={{ fontSize: small ? 13 : 14 }} />
              <ItemControls onAdd={onAddStep} onRemove={onRemoveStep} canAdd={n < 7} index={i} count={n} addTitle="Add a step after this" />
            </div>
          ))}
        </div>
      )}
    </ContentSlide>
  );
}

export function TimelineSlide({ content, onField, onEvent, onAddEvent, onRemoveEvent }) {
  const events = content.events || [];
  const n = events.length;
  return (
    <ContentSlide content={content} layout="timeline" onField={onField} placeholder="Timeline title">
      {() => (
        <div className="relative flex" style={{ minHeight: 252 }}>
          <div className="absolute left-0 right-0 bg-border" style={{ top: 71, height: 3 }} />
          {events.map((e, i) => (
            <div key={i} className="group/item relative flex-1 min-w-0 flex flex-col items-center px-[7px]">
              <div className="h-[52px] w-full flex items-end">
                <input type="text" value={e.date || ''} onChange={(ev) => onEvent(i, 'date', ev.target.value)} placeholder="Date"
                  className={`${inputBase} font-heading text-[17px] font-bold text-cobalt text-center`} />
              </div>
              <div className="relative mt-[10px] w-5 h-5 rounded-full bg-cobalt shrink-0" />
              <AutoTextarea value={e.label} onChange={(v) => onEvent(i, 'label', v)} placeholder="Label"
                className={`${inputBase} mt-[14px] font-heading text-[17px] leading-[1.15] font-bold text-navy text-center`} />
              <AutoTextarea value={e.detail} onChange={(v) => onEvent(i, 'detail', v)} placeholder="Detail"
                className={`${inputBase} mt-1.5 text-[13px] leading-[1.3] text-slate text-center`} />
              <ItemControls onAdd={onAddEvent} onRemove={onRemoveEvent} canAdd={n < 7} index={i} count={n} addTitle="Add an event after this" />
            </div>
          ))}
        </div>
      )}
    </ContentSlide>
  );
}

export function KeyStatsSlide({ content, onField, onStat, onAddStat, onRemoveStat }) {
  const stats = content.stats || [];
  const n = stats.length;
  return (
    <ContentSlide content={content} layout="key_stats" onField={onField}>
      {(width, panel) => {
        const cols = cardColumns(n, panel);
        const rows = Math.ceil(n / cols) || 1;
        return (
          <div className="grid" style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: '1fr', gap: GAP,
            height: rows === 1 ? 245 : BODY_H,
          }}>
            {stats.map((s, i) => (
              <div key={i} className="group/item relative rounded-[6px] bg-canvas p-[25px] flex flex-col min-w-0">
                <input type="text" value={s.value || ''} onChange={(e) => onStat(i, 'value', e.target.value)} placeholder="0"
                  className={`${inputBase} font-heading font-bold text-cobalt leading-none`} style={{ fontSize: rows === 1 ? 44 : 34 }} />
                <AutoTextarea value={s.label} onChange={(v) => onStat(i, 'label', v)} placeholder="Label"
                  className={`${inputBase} mt-3 font-heading text-[16px] leading-[1.2] font-bold text-navy`} />
                <AutoTextarea value={s.detail} onChange={(v) => onStat(i, 'detail', v)} placeholder="Why it matters"
                  className={`${inputBase} mt-1.5 text-[13px] leading-[1.3] text-slate`} />
                <ItemControls onAdd={onAddStat} onRemove={onRemoveStat} canAdd={n < 6} index={i} count={n} addTitle="Add a figure after this" />
              </div>
            ))}
          </div>
        );
      }}
    </ContentSlide>
  );
}

export function StatFocusSlide({ content, onField }) {
  return (
    <ContentSlide content={content} layout="stat_focus" onField={onField} centred={false}>
      {(width) => {
        // Long values shrink to stay on one line, as the download's text fitting does.
        const len = Math.max(String(content.stat_value || '').length, 1);
        const size = Math.max(60, Math.min(110, width / (len * 0.6)));
        return (
          <>
            <input type="text" value={content.stat_value || ''} onChange={(e) => onField('stat_value', e.target.value)} placeholder="0"
              className={`${inputBase} font-heading font-bold text-cobalt leading-[1.05] -ml-[3px]`} style={{ fontSize: size }} />
            <AutoTextarea value={content.stat_label} onChange={(v) => onField('stat_label', v)} placeholder="What the number is"
              className={`${inputBase} mt-4 font-heading text-[24px] leading-[1.2] font-bold text-navy`} />
            <AutoTextarea value={content.context} onChange={(v) => onField('context', v)} placeholder="Why it matters"
              className={`${inputBase} mt-3 text-[18px] leading-[1.35] text-slate`} style={{ maxWidth: 612 }} />
          </>
        );
      }}
    </ContentSlide>
  );
}

export function BigIdeaSlide({ content, onField }) {
  const panel = hasPanel(content, 'big_idea');
  const width = panel ? PANEL_TEXT_W : FULL_W;
  return (
    <div className="relative w-full h-full bg-white">
      {panel && <Panel />}
      <div className="absolute bg-cobalt" style={{ left: M, top: 137, width: 7, height: 187 }} />
      <div className="absolute flex items-center" style={{ left: M + 29, top: 126, width: width - 29, height: 216 }}>
        <AutoTextarea value={content.statement} onChange={(v) => onField('statement', v)} placeholder="One bold statement"
          className={`${inputBase} font-heading font-bold text-navy leading-[1.1]`} style={{ fontSize: panel ? 34 : 40 }} />
      </div>
      <div className="absolute" style={{ left: M + 29, top: 364, width: Math.min(width - 29, 648) }}>
        <AutoTextarea value={content.supporting} onChange={(v) => onField('supporting', v)} placeholder="Supporting context"
          className={`${inputBase} text-[19px] leading-[1.35] text-slate`} />
      </div>
    </div>
  );
}

export function QuoteHighlightSlide({ content, onField }) {
  return (
    <ContentSlide content={content} layout="quote_highlight" onField={onField} centred={false}>
      {() => (
        <div className="relative pl-[11px] pt-[40px]">
          <span aria-hidden className="absolute pointer-events-none select-none font-bold leading-none"
            style={{ left: -7, top: -30, fontSize: 120, fontFamily: 'Georgia, serif', color: 'color-mix(in srgb, var(--color-cobalt) 45%, white)' }}>&ldquo;</span>
          <AutoTextarea value={content.quote_text} onChange={(v) => onField('quote_text', v)} placeholder="The quote"
            className={`${inputBase} relative font-heading text-[26px] leading-[1.35] italic text-navy`} />
          <div className="mt-[18px] flex items-baseline gap-1.5 text-[16px] font-bold text-cobalt">
            <span>—</span>
            <input type="text" value={content.attribution || ''} onChange={(e) => onField('attribution', e.target.value)} placeholder="Who said it"
              className={`${inputBase} font-bold text-cobalt`} />
          </div>
          <AutoTextarea value={content.commentary} onChange={(v) => onField('commentary', v)} placeholder="Why it matters"
            className={`${inputBase} mt-2.5 text-[15px] leading-[1.35] text-slate`} style={{ maxWidth: 648 }} />
        </div>
      )}
    </ContentSlide>
  );
}

export function TwoColumnSlide({ content, onField, onColumnBullet, onAddColumnBullet, onRemoveColumnBullet }) {
  const verdict = content.verdict || '';
  const column = (side) => {
    const bKey = `column_${side}_bullets`;
    const bullets = content[bKey] || [];
    return (
      <div className="rounded-[6px] bg-canvas px-[25px] py-[22px] flex flex-col min-w-0">
        <AutoTextarea value={content[`column_${side}_heading`]} onChange={(v) => onField(`column_${side}_heading`, v)}
          placeholder={side === 'a' ? 'First side' : 'Second side'}
          className={`${inputBase} font-heading text-[21px] leading-[1.2] font-bold text-navy`} />
        <div className="mt-2.5 ml-[4px] w-8 h-1 bg-cobalt" />
        <ul className="list-none m-0 mt-[18px] p-0 flex flex-col gap-2.5">
          {bullets.map((t, i) => (
            <li key={i} className="group/item relative flex items-start gap-[16px]">
              <span className="mt-[9px] ml-[4px] w-[7px] h-[7px] rounded-full bg-cobalt shrink-0" />
              <AutoTextarea value={t} onChange={(v) => onColumnBullet(bKey, i, v)} placeholder="Point"
                className={`${inputBase} flex-1 text-[16px] leading-[1.35] text-slate`} />
              <ItemControls onAdd={(k) => onAddColumnBullet(bKey, k)} onRemove={(k) => onRemoveColumnBullet(bKey, k)}
                canAdd={bullets.length < 5} index={i} count={bullets.length} />
            </li>
          ))}
        </ul>
      </div>
    );
  };
  return (
    <ContentSlide content={content} layout="two_column" onField={onField} centred={false}>
      {() => (
        <>
          <div className="flex-1 min-h-0 grid grid-cols-2" style={{ gap: 29 }}>
            {column('a')}
            {column('b')}
          </div>
          <div className={`mt-[18px] h-[54px] shrink-0 rounded-[6px] px-[22px] flex items-center ${verdict ? '' : 'border border-dashed border-border'}`}
            style={verdict ? { background: 'color-mix(in srgb, var(--color-cobalt) 12%, white)' } : undefined}>
            <input type="text" value={verdict} onChange={(e) => onField('verdict', e.target.value)} placeholder="One-line conclusion (optional)"
              className={`${inputBase} text-[16px] font-bold text-navy`} />
          </div>
        </>
      )}
    </ContentSlide>
  );
}

// A real table in the download: a dark header row, thin rules between rows, the first column in bold.
export function ComparisonTableSlide({ content, onField, onCell, onColumnHeader, onAddRow, onRemoveRow }) {
  const columns = content.columns || [];
  const rows = content.rows || [];
  const rowH = Math.min(52, BODY_H / (rows.length + 1));
  const size = columns.length <= 3 ? 17 : 15;
  return (
    <ContentSlide content={content} layout="comparison_table" onField={onField} placeholder="Table title">
      {() => (
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              {columns.map((col, ci) => (
                <th key={ci} className="bg-navy px-[11px] text-left" style={{ height: rowH }}>
                  <input type="text" value={col} onChange={(e) => onColumnHeader(ci, e.target.value)} placeholder="Header"
                    className={`${darkInput} font-heading font-bold text-white`} style={{ fontSize: size - 1 }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="group/item">
                {columns.map((_, ci) => (
                  <td key={ci} className="relative px-[11px] border-b border-border" style={{ height: rowH }}>
                    <input type="text" value={row[ci] || ''} onChange={(e) => onCell(ri, ci, e.target.value)} placeholder="-"
                      className={`${inputBase} ${ci === 0 ? 'font-heading font-bold text-navy' : 'text-slate'}`} style={{ fontSize: size }} />
                    {ci === columns.length - 1 && (
                      <ItemControls onAdd={onAddRow} onRemove={onRemoveRow} canAdd={rows.length < 8} index={ri} count={rows.length} addTitle="Add a row below" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ContentSlide>
  );
}

export function DiagramSlide({ content, genId, templateId, onField }) {
  const top = BODY_TOP - 7;
  const boxH = BODY_BOTTOM - top - (content.caption ? 36 : 0);
  return (
    // flow-root: the image box below is placed by its margins (not positioned), so the picture's free-move layer
    // measures against the whole slide, as the download does.
    <div className="relative flow-root w-full h-full bg-white">
      <TitleBlock value={content.title} onChange={(v) => onField('title', v)} width={FULL_W} />
      <div style={{ marginTop: top, marginLeft: M, width: FULL_W, height: boxH }}>
        {content.diagram_file
          ? <AdjustableImage mode="free" src={generations.diagramUrl(genId, content.diagram_file, templateId)} alt={content.caption || content.title}
              value={content.image} onChange={(v) => onField('image', v)} />
          : <p className="hint h-full flex items-center justify-center">Diagram not rendered yet.</p>}
      </div>
      <div className="absolute" style={{ left: M, top: top + boxH + 4, width: FULL_W }}>
        <input type="text" value={content.caption || ''} onChange={(e) => onField('caption', e.target.value)} placeholder="Caption (optional)"
          className={`${inputBase} text-[13px] text-slate text-center`} />
      </div>
    </div>
  );
}

export function FigureSlide({ content, onField }) {
  // Title over a soft band; the figure and its caption are the slide's first picture (drawn by <Pictures>).
  return (
    <div className="relative w-full h-full bg-white">
      <div className="absolute left-0 right-0 bottom-0 bg-canvas" style={{ top: BODY_TOP - 22 }} />
      <TitleBlock value={content.title} onChange={(v) => onField('title', v)} width={FULL_W} />
    </div>
  );
}
