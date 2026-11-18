import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlignLeft, AlignCenter, AlignRight, Crop, RotateCcw, Check, X } from 'lucide-react';

const NO_CROP = { l: 0, t: 0, r: 0, b: 0 };
const MIN_VISIBLE = 0.1; // a crop always keeps at least 10% of each dimension

/** content.image as saved: { scale 0.2-1, align, crop: {l,t,r,b} fractions }, with defaults filled in. */
function normalizeImage(v = {}) {
  const crop = { ...NO_CROP, ...(v.crop || {}) };
  return {
    scale: Math.min(1, Math.max(0.2, Number(v.scale) || 1)),
    align: ['left', 'center', 'right'].includes(v.align) ? v.align : 'center',
    crop,
  };
}

const isDefault = (v) => v.scale === 1 && v.align === 'center' && !Object.values(v.crop).some(Boolean);

/** Largest w×h with the given aspect that fits in maxW×maxH. */
function fit(w, h, maxW, maxH) {
  if (!w || !h || maxW <= 0 || maxH <= 0) return { w: 0, h: 0 };
  const s = Math.min(maxW / w, maxH / h);
  return { w: w * s, h: h * s };
}

/** Moves the crop edges a handle controls by (dx, dy) fractions of the full image, keeping it valid. */
function dragCrop(start, handle, dx, dy) {
  let { l, t, r, b } = start;
  if (handle === 'move') {
    const mx = Math.min(Math.max(dx, -l), r);
    const my = Math.min(Math.max(dy, -t), b);
    return { l: l + mx, r: r - mx, t: t + my, b: b - my };
  }
  if (handle.includes('l')) l = Math.min(Math.max(0, l + dx), 1 - r - MIN_VISIBLE);
  if (handle.includes('r')) r = Math.min(Math.max(0, r - dx), 1 - l - MIN_VISIBLE);
  if (handle.includes('t')) t = Math.min(Math.max(0, t + dy), 1 - b - MIN_VISIBLE);
  if (handle.includes('b')) b = Math.min(Math.max(0, b - dy), 1 - t - MIN_VISIBLE);
  return { l, t, r, b };
}

const HANDLES = [
  ['tl', 'left-0 top-0 cursor-nwse-resize'], ['t', 'left-1/2 top-0 cursor-ns-resize'], ['tr', 'left-full top-0 cursor-nesw-resize'],
  ['l', 'left-0 top-1/2 cursor-ew-resize'], ['r', 'left-full top-1/2 cursor-ew-resize'],
  ['bl', 'left-0 top-full cursor-nesw-resize'], ['b', 'left-1/2 top-full cursor-ns-resize'], ['br', 'left-full top-full cursor-nwse-resize'],
];

/**
 * An image the user can resize, align and crop in place. Click it for the toolbar; crop by dragging the edges.
 * fill: the image fits the parent's height (slides); otherwise it is sized by width up to maxHeight (documents).
 * Changes are reported once per finished action (one undo step), never on every pointer move.
 */
export default function AdjustableImage({ src, alt, value, onChange, fill = false, maxHeight = 520, fallback = null }) {
  const saved = normalizeImage(value);
  const rootRef = useRef(null);
  const boxRef = useRef(null);
  const fullRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState(false);
  const [draftScale, setDraftScale] = useState(null);
  const [cropDraft, setCropDraft] = useState(null); // non-null while cropping

  const scale = draftScale ?? saved.scale;
  const crop = cropDraft ?? saved.crop;
  const cropping = cropDraft !== null;

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function commit(patch) {
    onChange({ ...saved, ...patch });
  }

  // A click anywhere else ends editing (and keeps a crop in progress, as shown).
  useEffect(() => {
    if (!selected) return undefined;
    function onDown(e) {
      if (rootRef.current?.contains(e.target)) return;
      if (cropDraft) commit({ crop: cropDraft });
      setCropDraft(null);
      setSelected(false);
    }
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  });

  if (failed && fallback) return fallback;

  const availW = box.w;
  const availH = fill ? box.h : maxHeight;
  const visW = natural ? natural.w * (1 - crop.l - crop.r) : 0;
  const visH = natural ? natural.h * (1 - crop.t - crop.b) : 0;
  // While cropping, the whole image is shown at full size so every edge can be reached.
  const shown = cropping
    ? fit(natural?.w, natural?.h, availW, availH)
    : fit(visW, visH, availW * scale, availH * scale);
  const imgW = cropping ? shown.w : shown.w / (1 - crop.l - crop.r);
  const imgH = cropping ? shown.h : shown.h / (1 - crop.t - crop.b);
  const justify = { left: 'justify-start', right: 'justify-end' }[saved.align] || 'justify-center';

  function startDrag(handle, e) {
    e.preventDefault();
    e.stopPropagation();
    const rect = fullRef.current.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, crop: cropDraft };
    const move = (ev) => setCropDraft(dragCrop(start.crop, handle, (ev.clientX - start.x) / rect.width, (ev.clientY - start.y) / rect.height));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function commitScale() {
    if (draftScale === null) return;
    commit({ scale: draftScale });
    setDraftScale(null);
  }

  return (
    <div ref={rootRef} className={`relative w-full ${fill ? 'h-full' : ''}`}>
      <div ref={boxRef} className={`w-full flex items-center ${cropping ? 'justify-center' : justify} ${fill ? 'h-full' : ''}`}
        style={fill ? undefined : { height: shown.h || 'auto', minHeight: natural ? undefined : 120 }}>
        <div
          ref={fullRef}
          onClick={() => setSelected(true)}
          className={`relative shrink-0 ${cropping ? '' : 'overflow-hidden'} ${selected ? 'outline outline-2 outline-cobalt outline-offset-2' : 'cursor-pointer hover:outline hover:outline-1 hover:outline-cobalt/50 hover:outline-offset-2'}`}
          style={{ width: shown.w || undefined, height: shown.h || undefined }}
          title={selected ? undefined : 'Click to resize, align or crop'}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            onError={() => setFailed(true)}
            className="absolute max-w-none select-none"
            style={natural ? {
              width: imgW, height: imgH,
              left: cropping ? 0 : -crop.l * imgW, top: cropping ? 0 : -crop.t * imgH,
            } : { position: 'static', maxWidth: '100%', maxHeight: fill ? '100%' : maxHeight }}
          />
          {cropping && natural && (
            <div className="absolute inset-0 overflow-hidden">
              <div
                onPointerDown={(e) => startDrag('move', e)}
                className="absolute border-2 border-white cursor-move"
                style={{
                  left: `${crop.l * 100}%`, top: `${crop.t * 100}%`,
                  width: `${(1 - crop.l - crop.r) * 100}%`, height: `${(1 - crop.t - crop.b) * 100}%`,
                  boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)',
                }}
              >
                {HANDLES.map(([h, pos]) => (
                  <span key={h} onPointerDown={(e) => startDrag(h, e)}
                    className={`absolute w-3 h-3 -ml-1.5 -mt-1.5 bg-white border border-navy rounded-sm ${pos}`} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && natural && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1 z-20 flex items-center gap-1 bg-white border border-border rounded-lg shadow-md px-2 py-1 text-[12px] text-ink whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}>
          {cropping ? (
            <>
              <span className="text-slate px-1">Drag the edges to crop</span>
              <button type="button" className="icon-btn w-7 h-7" title="Remove crop" aria-label="Remove crop" onClick={() => setCropDraft(NO_CROP)}><RotateCcw size={14} /></button>
              <button type="button" className="icon-btn w-7 h-7" title="Cancel" aria-label="Cancel crop" onClick={() => setCropDraft(null)}><X size={14} /></button>
              <button type="button" className="btn-primary text-[12px] py-0.5 px-2" onClick={() => { commit({ crop: cropDraft }); setCropDraft(null); }}>
                <Check size={13} />Done
              </button>
            </>
          ) : (
            <>
              <label className="flex items-center gap-1.5 px-1 text-slate">
                Size
                <input type="range" min="20" max="100" step="5" value={Math.round(scale * 100)} aria-label="Image size"
                  onChange={(e) => setDraftScale(Number(e.target.value) / 100)}
                  onPointerUp={commitScale} onKeyUp={commitScale} onBlur={commitScale}
                  className="w-[90px] accent-navy" />
                <span className="w-8 text-ink">{Math.round(scale * 100)}%</span>
              </label>
              <span className="w-px h-4 bg-border" />
              {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([a, Icon]) => (
                <button key={a} type="button" title={`Align ${a}`} aria-label={`Align ${a}`} aria-pressed={saved.align === a}
                  onClick={() => commit({ align: a })}
                  className={`icon-btn w-7 h-7 ${saved.align === a ? 'bg-[#EAF0F8] text-navy' : ''}`}>
                  <Icon size={14} />
                </button>
              ))}
              <span className="w-px h-4 bg-border" />
              <button type="button" className="icon-btn h-7 w-auto gap-1 px-1.5" title="Crop" onClick={() => setCropDraft(saved.crop)}>
                <Crop size={14} /><span>Crop</span>
              </button>
              {!isDefault(saved) && (
                <button type="button" className="icon-btn w-7 h-7" title="Reset size, alignment and crop" aria-label="Reset image"
                  onClick={() => onChange(undefined)}>
                  <RotateCcw size={14} />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
