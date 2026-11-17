import { useEffect, useState } from 'react';
import { generations } from '../../services/api';

let cache = null;
const listeners = new Set();

function load() {
  return generations.templates().then((d) => {
    cache = d;
    listeners.forEach((fn) => fn(d));
    return d;
  });
}

/** Re-reads the template list (after an upload or delete) for every component using it. */
export function reloadTemplates() {
  return load();
}

/** The visual templates (built-in + uploaded company templates), loaded once and shared. */
export function useTemplates() {
  const [data, setData] = useState(cache);
  useEffect(() => {
    listeners.add(setData);
    if (!cache) load().catch(() => {});
    return () => listeners.delete(setData);
  }, []);
  return data || { default: 'harbour', templates: [] };
}

export function findTemplate(data, id) {
  return data.templates.find((t) => t.id === id) || data.templates.find((t) => t.id === data.default) || null;
}

/** CSS variables that restyle the slide/document preview to a template (see index.css). */
export function templateStyle(template) {
  if (!template) return undefined;
  const c = template.colors;
  const f = template.fonts;
  return {
    '--color-navy': c.primary,
    '--t-primary-mid': c.primary_mid,
    '--t-primary-light': c.primary_light,
    '--color-cobalt': c.accent,
    '--t-accent-light': c.accent_light,
    '--color-slate': c.text,
    '--t-text-light': c.text_light,
    '--color-border': c.border,
    '--color-canvas': c.canvas,
    '--font-heading': `'${f.heading}', system-ui, sans-serif`,
    '--font-body': `'${f.body}', system-ui, sans-serif`,
  };
}
