import { figures } from '../../services/api';

// Placement rules shared by the slide/section editors for pictures (document figures).

/** Whether a placed picture shows this figure. */
export const samePicture = (p, figure) => p.figure_id === figure.id;

/** Where a picture's file is served from. */
export const pictureUrl = (p) => figures.imageUrl(p.figure_id);

const SLIDE_ASPECT = 9 / 16;

/** The document's caption as shown under a picture ("FIGURE 2.1-1 ..." → "Figure 2.1-1 ..."). */
export function figureCaption(caption) {
  return String(caption || '').replace(/^FIGURE\b/, 'Figure').replace(/\s+/g, ' ').trim();
}

/**
 * A new picture for a slide/section from a document figure (a figure row). On a slide (box: where the layout engine puts it, [x, y, w, h] fractions) it gets
 * an explicit place, fitted into the box and nudged so several added pictures don't sit exactly on top of
 * each other.
 */
export function newPicture(figure, { box, existing = 0 } = {}) {
  const picture = { figure_id: figure.id, caption: figureCaption(figure.caption) };
  if (!box || !figure.width || !figure.height) return picture;
  const [bx, by, bw, bh] = box;
  const aspect = figure.height / figure.width;            // picture height / width
  const w = Math.min(bw, (bh * SLIDE_ASPECT) / aspect);   // as a fraction of slide width
  const h = (w * aspect) / SLIDE_ASPECT;                  // as a fraction of slide height
  const nudge = existing * 0.03;
  return {
    ...picture,
    x: Math.min(bx + (bw - w) / 2 + nudge, 1 - w),
    y: Math.min(by + (bh - h) / 2 + nudge, 1 - h),
    w,
  };
}
