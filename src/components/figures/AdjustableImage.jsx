import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlignLeft, AlignCenter, AlignRight, Crop, RotateCcw, Check, X, Replace, Trash2 } from 'lucide-react';

const NO_CROP = { l: 0, t: 0, r: 0, b: 0 };
const MIN_VISIBLE = 0.05; // a crop keeps at least 5% of each dimension
const MIN_SIZE = 24;      // smallest frame width, layout px
const SNAP = 6;           // screen px within which the picture snaps to a centre line
const CORNERS = ['tl', 'tr', 'bl', 'br'];
const CROP_HANDLES = ['tl', 't', 'tr', 'l', 'r', 'bl', 'b', 'br'];
const CURSOR = {
  tl: 'nwse-resize', br: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize',
  t: 'ns-resize', b: 'ns-resize', l: 'ew-resize', r: 'ew-resize',
};

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const round = (v) => Math.round(v * 10000) / 10000;

function cleanCrop(c = {}) {
  const e = (k) => clamp(Number(c[k]) || 0, 0, 1 - MIN_VISIBLE);
  const crop = { l: e('l'), t: e('t'), r: e('r'), b: e('b') };
  if (crop.l + crop.r > 1 - MIN_VISIBLE) { crop.l = 0; crop.r = 0; }
  if (crop.t + crop.b > 1 - MIN_VISIBLE) { crop.t = 0; crop.b = 0; }
  return crop;
}

function fit(w, h, maxW, maxH) {
  if (!w || !h || maxW <= 0 || maxH <= 0) return { w: 0, h: 0 };
  const s = Math.min(maxW / w, maxH / h);
  return { w: w * s, h: h * s };
}

/** Where a corner/edge handle sits on a rect, as [left, top]. */
function handlePoint(h, r) {
  const x = h.includes('l') ? r.x : h.includes('r') ? r.x + r.w : r.x + r.w / 2;
  const y = h.includes('t') ? r.y : h.includes('b') ? r.y + r.h : r.y + r.h / 2;
  return [x, y];
}

/**
 * A picture edited the way PowerPoint does it. Click to select; drag to move (slides); drag a corner to resize
 * (aspect ratio kept); Crop (or double-click) shows black crop marks with the cut-off parts faded, and dragging
 * inside then moves the picture under the crop.
 *
 * mode 'free' (slides): placed anywhere on the slide; saved as fractions of the slide { x, y, w, crop }, which
 *   the PowerPoint renderer uses directly. It must sit inside the slide with no positioned ancestor in between,
 *   so its layer covers the whole slide. Unplaced, it fits defaultBox ([x, y, w, h] fractions of the slide) or,
 *   without one, the area its in-flow placeholder takes in the layout.
 * mode 'inline' (documents): sits in the text column; saved as { w (fraction of the column), align, crop }.
 *
 * With onCaption, the caption is attached under the picture and moves and resizes with it.
 * Each finished drag, crop or caption edit is one onChange (one undo step).
 */
export default function AdjustableImage({
  src, alt, value, onChange, mode = 'inline', maxHeight = 520, fallback = null, defaultBox = null,
  caption, onCaption, onReplace, onDelete,
}) {
  const free = mode === 'free';
  const placeholderRef = useRef(null);
  const layerRef = useRef(null);
  const [natural, setNatural] = useState(null);
  const [failed, setFailed] = useState(false);
  const [dims, setDims] = useState(null); // layout px: { W, H, area: {x, y, w, h} }
  const [selected, setSelected] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [draft, setDraft] = useState(null); // geometry while dragging or cropping
  const [guides, setGuides] = useState({ v: null, h: null });

  useEffect(() => {
    let live = true;
    const im = new Image();
    im.onload = () => live && setNatural({ w: im.naturalWidth, h: im.naturalHeight });
    im.onerror = () => live && setFailed(true);
    im.src = src;
    return () => { live = false; };
  }, [src]);

  // Layer size (the slide, or the column) and the default area, in unscaled layout px.
  useLayoutEffect(() => {
    const layer = layerRef.current;
    const ph = placeholderRef.current;
    if (!layer) return undefined;
    const measure = () => {
      const lr = layer.getBoundingClientRect();
      const pr = ph ? ph.getBoundingClientRect() : lr;
      const k = lr.width / (layer.clientWidth || 1) || 1;
      setDims({
        W: layer.clientWidth, H: layer.clientHeight,
        area: { x: (pr.left - lr.left) / k, y: (pr.top - lr.top) / k, w: pr.width / k, h: pr.height / k },
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(layer);
    if (ph) observer.observe(ph);
    return () => observer.disconnect();
  }, [natural]);

  // Deselect on a click elsewhere (a crop in progress is kept as shown); Escape backs out; Enter finishes a crop.
  useEffect(() => {
    if (!selected) return undefined;
    function onDown(e) {
      if (layerRef.current?.contains(e.target)) return;
      if (cropping && draft) commit(draft);
      setCropping(false);
      setDraft(null);
      setSelected(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        if (cropping) { setCropping(false); setDraft(null); } else setSelected(false);
      }
      if (e.key === 'Enter' && cropping) { e.preventDefault(); finishCrop(); }
      const typing = ['INPUT', 'TEXTAREA'].includes(e.target?.tagName) || e.target?.isContentEditable;
      if ((e.key === 'Delete' || e.key === 'Backspace') && !cropping && !typing && onDelete) { e.preventDefault(); onDelete(); }
    }
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  });

  function scaleK() {
    const layer = layerRef.current;
    return layer ? layer.getBoundingClientRect().width / (layer.clientWidth || 1) || 1 : 1;
  }

  const v = value || {};
  const align = ['left', 'center', 'right'].includes(v.align) ? v.align : 'center';
  const ready = Boolean(natural && dims && dims.W > 0);
  const area = ready && defaultBox
    ? { x: defaultBox[0] * dims.W, y: defaultBox[1] * dims.H, w: defaultBox[2] * dims.W, h: defaultBox[3] * dims.H }
    : dims?.area;
  const visAspect = (c) => (natural.h * (1 - c.t - c.b)) / (natural.w * (1 - c.l - c.r));

  // The saved picture as layout-px geometry { x, y, w, crop }; unset means "fit the default area".
  function savedGeometry() {
    const crop = cleanCrop(v.crop);
    const vis = { w: natural.w * (1 - crop.l - crop.r), h: natural.h * (1 - crop.t - crop.b) };
    if (free) {
      if (v.w != null && v.x != null && v.y != null) {
        return { x: Number(v.x) * dims.W, y: Number(v.y) * dims.H, w: Number(v.w) * dims.W, crop };
      }
      const f = fit(vis.w, vis.h, area.w, area.h);
      return { x: area.x + (area.w - f.w) / 2, y: area.y + (area.h - f.h) / 2, w: f.w, crop };
    }
    const w = v.w != null ? Number(v.w) * dims.W : fit(vis.w, vis.h, dims.W, maxHeight).w;
    return { x: 0, y: 0, w: clamp(w, MIN_SIZE, dims.W), crop };
  }

  const g = ready ? (draft || savedGeometry()) : null;
  let frame = null;
  let full = null;
  if (g) {
    frame = { x: g.x, y: g.y, w: g.w, h: g.w * visAspect(g.crop) };
    if (!free) frame.x = { left: 0, right: dims.W - frame.w }[align] ?? (dims.W - frame.w) / 2;
    // The whole picture, including the cropped-off parts.
    const W = frame.w / (1 - g.crop.l - g.crop.r);
    const H = W * (natural.h / natural.w);
    full = { x: frame.x - g.crop.l * W, y: frame.y - g.crop.t * H, w: W, h: H };
  }

  function commit(geo) {
    const crop = Object.fromEntries(Object.entries(geo.crop).map(([key, c]) => [key, round(c)]));
    if (free) onChange({ x: round(geo.x / dims.W), y: round(geo.y / dims.H), w: round(geo.w / dims.W), crop });
    else onChange({ w: round(geo.w / dims.W), align, crop });
  }

  function startCrop() {
    setSelected(true);
    setCropping(true);
    setDraft(g);
  }

  function finishCrop() {
    if (draft) commit(draft);
    setCropping(false);
    setDraft(null);
  }

  function resetCrop() {
    // Back to the whole picture, staying where it is.
    setDraft({ x: free ? full.x : g.x, y: full.y, w: full.w, crop: { ...NO_CROP } });
  }

  function nextGeometry(kind, start, dx, dy, k) {
    const { g: sg, frame: sf, full: sfull } = start;
    if (cropping) {
      const c = { ...sg.crop };
      if (kind === 'pan') {
        // Move the picture under a fixed crop frame.
        const dl = clamp(-dx / sfull.w, -c.l, c.r);
        const dt = clamp(-dy / sfull.h, -c.t, c.b);
        return { ...sg, crop: { l: c.l + dl, r: c.r - dl, t: c.t + dt, b: c.b - dt } };
      }
      if (kind.includes('l')) c.l = clamp(c.l + dx / sfull.w, 0, 1 - c.r - MIN_VISIBLE);
      if (kind.includes('r')) c.r = clamp(c.r - dx / sfull.w, 0, 1 - c.l - MIN_VISIBLE);
      if (kind.includes('t')) c.t = clamp(c.t + dy / sfull.h, 0, 1 - c.b - MIN_VISIBLE);
      if (kind.includes('b')) c.b = clamp(c.b - dy / sfull.h, 0, 1 - c.t - MIN_VISIBLE);
      // The picture stays put; the frame follows the crop.
      return { x: sfull.x + c.l * sfull.w, y: sfull.y + c.t * sfull.h, w: sfull.w * (1 - c.l - c.r), crop: c };
    }
    if (kind === 'move') {
      let x = clamp(sf.x + dx, Math.min(0, dims.W - sf.w), Math.max(0, dims.W - sf.w));
      let y = clamp(sf.y + dy, Math.min(0, dims.H - sf.h), Math.max(0, dims.H - sf.h));
      const snap = SNAP / k;
      const guide = { v: null, h: null };
      if (Math.abs(x + sf.w / 2 - dims.W / 2) < snap) { x = dims.W / 2 - sf.w / 2; guide.v = dims.W / 2; }
      for (const cy of [area.y + area.h / 2, dims.H / 2]) {
        if (Math.abs(y + sf.h / 2 - cy) < snap) { y = cy - sf.h / 2; guide.h = cy; break; }
      }
      setGuides(guide);
      return { ...sg, x, y };
    }
    // Corner resize: aspect ratio kept, opposite corner fixed (documents grow around their alignment).
    const ratio = sf.h / sf.w;
    const sx = kind.includes('r') ? 1 : -1;
    const sy = kind.includes('b') ? 1 : -1;
    const grow = !free && align === 'center' ? 2 : 1;
    const w = clamp(Math.max(sf.w + sx * dx * grow, (sf.h + sy * dy * grow) / ratio), MIN_SIZE, free ? dims.W * 1.5 : dims.W);
    const h = w * ratio;
    return { ...sg, w, x: sx < 0 ? sf.x + sf.w - w : sf.x, y: sy < 0 ? sf.y + sf.h - h : sf.y };
  }

  function startDrag(kind, e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setSelected(true);
    if (kind === null) return; // a document picture only moves with its alignment
    const k = scaleK();
    const start = { px: e.clientX, py: e.clientY, g: { ...g, crop: { ...g.crop } }, frame: { ...frame }, full: { ...full } };
    let latest = null;
    const move = (ev) => {
      latest = nextGeometry(kind, start, (ev.clientX - start.px) / k, (ev.clientY - start.py) / k, k);
      setDraft(latest);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setGuides({ v: null, h: null });
      if (cropping) return; // a crop is saved with Done
      if (latest) commit(latest);
      setDraft(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  if (failed) return fallback;

  const k = ready ? scaleK() : 1;
  const sp = (n) => n / k; // screen px → layout px, so handles keep their size on a scaled slide

  const layer = (
    <div ref={layerRef}
      className={free ? 'absolute inset-0 z-10 pointer-events-none' : 'relative w-full'}
      style={free ? undefined : { height: frame ? frame.h : 160 }}>
      {ready && (
        <>
          {guides.v != null && <div className="absolute top-0 bottom-0 border-l border-dashed border-cobalt" style={{ left: guides.v }} />}
          {guides.h != null && <div className="absolute left-0 right-0 border-t border-dashed border-cobalt" style={{ top: guides.h }} />}

          {cropping && (
            <img src={src} alt="" draggable={false} className="absolute max-w-none opacity-35 select-none pointer-events-none"
              style={{ left: full.x, top: full.y, width: full.w, height: full.h }} />
          )}

          <div
            onPointerDown={(e) => startDrag(cropping ? 'pan' : free ? 'move' : null, e)}
            onDoubleClick={startCrop}
            className={`absolute overflow-hidden pointer-events-auto ${cropping || free ? 'cursor-move' : 'cursor-pointer'} ${
              selected ? '' : 'hover:outline hover:outline-1 hover:outline-cobalt/60'}`}
            style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }}
            title={selected ? undefined : 'Click to move, resize or crop'}
          >
            <img src={src} alt={alt} draggable={false} className="absolute max-w-none select-none"
              style={{ left: full.x - frame.x, top: full.y - frame.y, width: full.w, height: full.h }} />
          </div>

          {selected && !cropping && (
            <div className="absolute pointer-events-none border-solid border-cobalt"
              style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h, borderWidth: sp(1.5) }} />
          )}

          {selected && !cropping && CORNERS.map((h) => {
            const [x, y] = handlePoint(h, frame);
            const s = sp(12);
            return (
              <span key={h} onPointerDown={(e) => startDrag(h, e)}
                className="absolute bg-white border-solid border-cobalt rounded-full pointer-events-auto shadow-sm"
                style={{ left: x - s / 2, top: y - s / 2, width: s, height: s, borderWidth: sp(1.5), cursor: CURSOR[h] }} />
            );
          })}

          {selected && cropping && CROP_HANDLES.map((h) => {
            const [x, y] = handlePoint(h, frame);
            const len = sp(18);
            const thick = sp(4);
            const corner = h.length === 2;
            const horizontal = h === 't' || h === 'b';
            const w = corner || horizontal ? len : thick;
            const hh = corner || !horizontal ? len : thick;
            // Black crop marks just inside the frame, like PowerPoint's.
            const left = h.includes('l') ? x : h.includes('r') ? x - w : x - w / 2;
            const top = h.includes('t') ? y : h.includes('b') ? y - hh : y - hh / 2;
            const marks = corner ? {
              borderStyle: 'solid', borderColor: '#000',
              borderLeftWidth: h.includes('l') ? thick : 0, borderRightWidth: h.includes('r') ? thick : 0,
              borderTopWidth: h.includes('t') ? thick : 0, borderBottomWidth: h.includes('b') ? thick : 0,
            } : { background: '#000' };
            return (
              <span key={h} onPointerDown={(e) => startDrag(h, e)} className="absolute pointer-events-auto"
                style={{ left, top, width: w, height: hh, cursor: CURSOR[h], ...marks }} />
            );
          })}

          {free && onCaption && (
            // Attached caption: same width as the picture, just under it, 12pt as on the PowerPoint slide.
            <div className="absolute pointer-events-auto" style={{ left: frame.x, top: frame.y + frame.h + dims.W * 0.0045, width: frame.w }}>
              <CaptionField value={caption} onCommit={onCaption} align="center" fontSize={dims.W / 80} />
            </div>
          )}

          {selected && (
            <Toolbar
              left={frame.x + frame.w / 2}
              top={free && frame.y < sp(56) ? frame.y + frame.h : frame.y}
              below={free && frame.y < sp(56)}
              k={k} free={free} cropping={cropping} align={align} customised={value != null}
              onReplace={onReplace} onDelete={onDelete}
              onCrop={startCrop} onDone={finishCrop} onResetCrop={resetCrop}
              onCancel={() => { setCropping(false); setDraft(null); }}
              onAlign={(a) => onChange({ ...(v.w != null ? { w: v.w } : {}), crop: cleanCrop(v.crop), align: a })}
              onReset={() => { onChange(undefined); setCropping(false); setDraft(null); setSelected(false); }}
            />
          )}
        </>
      )}
    </div>
  );

  if (free) {
    return defaultBox ? layer : (
      <>
        <div ref={placeholderRef} className="w-full h-full" />
        {layer}
      </>
    );
  }
  return (
    <div className="w-full">
      {layer}
      {onCaption && (
        <div className="mt-2">
          <CaptionField value={caption} onCommit={onCaption} align={align} fontSize={13} />
        </div>
      )}
    </div>
  );
}

/** An editable caption; saved when the user leaves the field (one undo step), not on every key. */
function CaptionField({ value, onCommit, align, fontSize }) {
  const ref = useRef(null);
  const [draft, setDraft] = useState(null);
  const text = draft ?? value ?? '';
  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = '0';
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [text, fontSize]);
  return (
    <textarea ref={ref} rows={1} value={text} placeholder="Add a caption"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== null && draft !== value) onCommit(draft); setDraft(null); }}
      onPointerDown={(e) => e.stopPropagation()}
      className="block w-full resize-none overflow-hidden bg-transparent border-0 outline-none rounded-sm italic text-slate leading-snug p-0 focus:bg-[#F0F4F8]"
      style={{ fontSize, textAlign: align }} />
  );
}

function Toolbar({ left, top, below, k, free, cropping, align, customised, onReplace, onDelete, onCrop, onDone, onCancel, onResetCrop, onAlign, onReset }) {
  const btn = 'icon-btn w-7 h-7';
  return (
    // Anchored at the frame's top (or bottom) centre and counter-scaled so it stays readable on a small slide.
    <div className="absolute pointer-events-auto z-20" style={{ left, top, transform: `scale(${1 / k})`, transformOrigin: '0 0' }}
      onPointerDown={(e) => e.stopPropagation()}>
      <div className={`absolute left-0 -translate-x-1/2 ${below ? 'top-2' : 'bottom-2'} flex items-center gap-1 bg-white border border-border rounded-lg shadow-md px-1.5 py-1 text-[12px] text-ink whitespace-nowrap`}>
        {cropping ? (
          <>
            <span className="text-slate px-1">Drag the black marks to crop, or the picture to move it</span>
            <button type="button" className={btn} title="Undo the crop" aria-label="Undo the crop" onClick={onResetCrop}><RotateCcw size={14} /></button>
            <button type="button" className={btn} title="Cancel (Esc)" aria-label="Cancel crop" onClick={onCancel}><X size={14} /></button>
            <button type="button" className="btn-primary text-[12px] py-0.5 px-2" onClick={onDone}><Check size={13} />Done</button>
          </>
        ) : (
          <>
            {!free && [['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([a, Icon]) => (
              <button key={a} type="button" title={`Align ${a}`} aria-label={`Align ${a}`} aria-pressed={align === a}
                onClick={() => onAlign(a)} className={`${btn} ${align === a ? 'bg-[#EAF0F8] text-navy' : ''}`}>
                <Icon size={14} />
              </button>
            ))}
            {!free && <span className="w-px h-4 bg-border" />}
            <button type="button" className="icon-btn h-7 w-auto gap-1 px-1.5" title="Crop (or double-click the picture)" onClick={onCrop}>
              <Crop size={14} /><span>Crop</span>
            </button>
            {customised && (
              <button type="button" className="icon-btn h-7 w-auto gap-1 px-1.5" title="Back to the original size, position and crop" onClick={onReset}>
                <RotateCcw size={14} /><span>Reset</span>
              </button>
            )}
            {onReplace && (
              <button type="button" className="icon-btn h-7 w-auto gap-1 px-1.5" title="Swap for another figure" onClick={onReplace}>
                <Replace size={14} /><span>Replace</span>
              </button>
            )}
            {onDelete && (
              <button type="button" className={`${btn} hover:text-red-700`} title="Remove picture (Delete)" aria-label="Remove picture" onClick={onDelete}>
                <Trash2 size={14} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
