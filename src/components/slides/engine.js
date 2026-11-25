import { useEffect, useState } from 'react';

// The slide design spec and layout engine live on the server (td-prod-house-server shared/slides), the single
// place slide design is decided: the PowerPoint download is drawn from the same boxes. The editor loads them
// once from the server rather than keeping a copy that could drift.
const BASE = import.meta.env.VITE_API_BASE_URL || '/api';
export const iconUrl = (name) => `${BASE}/shared/icons/${name}.png`;

let engine = null;
let loading = null;

export function loadSlideEngine() {
  loading ??= Promise.all([
    import(/* @vite-ignore */ `${BASE}/shared/slides/spec.js`),
    import(/* @vite-ignore */ `${BASE}/shared/slides/layout.js`),
  ]).then(([spec, layout]) => {
    engine = { ...spec, ...layout };
    return engine;
  }).catch((err) => {
    loading = null; // try again next time
    throw err;
  });
  return loading;
}

/** The spec and layout engine ({ KINDS, ICONS, layoutSlide, ... }), or null until loaded. */
export function useSlideEngine() {
  const [value, setValue] = useState(engine);
  useEffect(() => {
    if (engine) return undefined;
    let live = true;
    loadSlideEngine().then((e) => live && setValue(e)).catch((err) => console.error('Slide engine failed to load:', err));
    return () => { live = false; };
  }, []);
  return value;
}

/** The slide kinds a user can switch to, as menu options (Figure needs a figure, so it is not offered). */
export function slideKindOptions(e) {
  if (!e) return [];
  return Object.entries(e.KINDS).filter(([, k]) => !k.figure).map(([key, k]) => ({ key, label: k.label, description: k.description }));
}
