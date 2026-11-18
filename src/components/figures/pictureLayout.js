// Placement rules shared by the slide/section editors for pictures placed from the documents.

// Where a picture goes before the user moves it, as fractions of the slide [x, y, w, h]. render_pptx.py uses
// the same boxes, so an unmoved picture lands in the same place in the download.
const FIGURE_BOX = [0.06, 0.2333, 0.88, 0.5867]; // a Figure slide's own figure: the space under the title
const SIDE_BOX = [0.55, 0.25, 0.39, 0.55];       // a picture added to any other slide
const SLIDE_ASPECT = 9 / 16;

export const boxFor = (layout, index) => (layout === 'figure' && index === 0 ? FIGURE_BOX : SIDE_BOX);

/** The document's caption as shown under a picture ("FIGURE 2.1-1 ..." → "Figure 2.1-1 ..."). */
export function figureCaption(caption) {
  return String(caption || '').replace(/^FIGURE\b/, 'Figure').replace(/\s+/g, ' ').trim();
}

/**
 * A new picture for a slide/section from a picked figure. On slides it gets an explicit place (fitted into the
 * default box, nudged so several added pictures don't sit exactly on top of each other).
 */
export function newPicture(figure, { slide = false, layout, existing = 0 } = {}) {
  const picture = { figure_id: figure.id, caption: figureCaption(figure.caption) };
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
