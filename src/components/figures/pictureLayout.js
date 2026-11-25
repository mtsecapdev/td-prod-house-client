import { figures, generations } from '../../services/api';

const figureUrl = (id) => figures.imageUrl(id);
const imageUrl = (id) => generations.imageUrl(id);

// Placement rules shared by the slide/section editors for pictures: document figures and generated images.

/** Whether a placed picture shows this source (a figure row or { image_id }). */
export const samePicture = (p, source) => (source.image_id ? p.image_id === source.image_id : p.figure_id === source.id);

/** Where a picture's file is served from. */
export const pictureUrl = (p) => (p.image_id ? imageUrl(p.image_id) : figureUrl(p.figure_id));

// Where a picture goes before the user moves it, as fractions of the slide [x, y, w, h]. render_pptx.py uses
// the same boxes, so an unmoved picture lands in the same place in the download.
const FIGURE_BOX = [0.0563, 0.2667, 0.8875, 0.6];  // a Figure slide's own figure: the band under the title
const SIDE_BOX = [0.6, 0.06, 0.3662, 0.8067];      // any other slide: the panel on the right, caption under it
const SLIDE_ASPECT = 9 / 16;

export const boxFor = (layout, index) => (layout === 'figure' && index === 0 ? FIGURE_BOX : SIDE_BOX);

/** The document's caption as shown under a picture ("FIGURE 2.1-1 ..." → "Figure 2.1-1 ..."). */
export function figureCaption(caption) {
  return String(caption || '').replace(/^FIGURE\b/, 'Figure').replace(/\s+/g, ' ').trim();
}

/**
 * A new picture for a slide/section: a document figure (a figure row) or a generated image ({ image_id,
 * caption, width, height }). On slides it gets an explicit place (fitted into the default box, nudged so
 * several added pictures don't sit exactly on top of each other).
 */
export function newPicture(source, { slide = false, layout, existing = 0 } = {}) {
  const figure = source;
  const picture = source.image_id
    ? { image_id: source.image_id, caption: source.caption || '' }
    : { figure_id: source.id, caption: figureCaption(source.caption) };
  if (!slide || !figure.width || !figure.height) return picture;
  const [bx, by, bw, bh] = boxFor(layout, existing);
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
