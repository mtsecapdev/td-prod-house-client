import { useState } from 'react';
import AdjustableImage from './AdjustableImage';
import FigurePicker from './FigurePicker';
import { FigureRemoved } from './FigureImage';
import { figureCaption, pictureUrl } from './pictureLayout';

/**
 * The pictures placed on one slide (free: drag anywhere on the slide) or section (inline: in the text column).
 * Each can be moved/resized/cropped, has its caption attached, and can be swapped or removed. On a slide,
 * boxes[i] is where picture i sits until moved (from the layout engine).
 */
export default function Pictures({ pictures = [], onChange, slide = false, boxes = [], documentIds = [] }) {
  const [replacing, setReplacing] = useState(null);

  function update(index, patch) {
    onChange(pictures.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function setPlacement(index, placement) {
    // Keep the figure and its caption; replace only the placement (undefined = back to the default).
    const { figure_id: figureId, caption } = pictures[index];
    onChange(pictures.map((p, i) => (i === index ? { figure_id: figureId, caption, ...(placement || {}) } : p)));
  }

  const items = pictures.map((p, i) => (
    <AdjustableImage
      key={`${i}-${p.figure_id}`}
      mode={slide ? 'free' : 'inline'}
      defaultBox={slide ? boxes[i] : null}
      src={pictureUrl(p)}
      alt={p.caption || 'Figure'}
      value={p.x != null || p.w != null || p.crop || p.align ? { x: p.x, y: p.y, w: p.w, align: p.align, crop: p.crop } : undefined}
      onChange={(v) => setPlacement(i, v)}
      caption={p.caption}
      onCaption={(text) => update(i, { caption: text })}
      onReplace={documentIds.length ? () => setReplacing(i) : undefined}
      onDelete={() => onChange(pictures.filter((_, j) => j !== i))}
      fallback={slide ? <RemovedOnSlide picture={p} box={boxes[i]} onDelete={() => onChange(pictures.filter((_, j) => j !== i))} />
        : <div className="my-3"><FigureRemoved /></div>}
    />
  ));

  return (
    <>
      {slide ? items : <div className="flex flex-col gap-6 my-4">{items}</div>}
      {replacing !== null && (
        <FigurePicker documentIds={documentIds} title="Replace the figure"
          onPick={(f) => {
            // Same place and width; the new figure's own caption; crop starts fresh (it was for the old picture).
            update(replacing, { figure_id: f.id, caption: figureCaption(f.caption) || pictures[replacing].caption, crop: undefined });
            setReplacing(null);
          }}
          onClose={() => setReplacing(null)} />
      )}
    </>
  );
}

/** A deleted figure, shown where it was on the slide, with a way to remove the leftover. */
function RemovedOnSlide({ picture, box, onDelete }) {
  const [bx, by, bw, bh] = picture.w != null ? [picture.x, picture.y, picture.w, 0.3] : box;
  return (
    <div className="absolute pointer-events-auto z-10" style={{ left: `${bx * 100}%`, top: `${by * 100}%`, width: `${bw * 100}%`, height: `${bh * 100}%` }}>
      <div className="h-full flex flex-col items-center justify-center gap-1 bg-white/90">
        <FigureRemoved />
        <button type="button" onClick={onDelete} className="btn-ghost text-[12px] py-0.5 px-2">Remove</button>
      </div>
    </div>
  );
}
