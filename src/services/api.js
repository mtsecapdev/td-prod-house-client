const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || `Request failed: ${res.status}`);
  return json.data;
}

export const documents = {
  list: () => request('/documents'),
  upload: (file) => {
    const form = new FormData();
    form.append('uploaded_file', file);
    return request('/documents/upload', { method: 'POST', body: form, headers: {} });
  },
  uploadStream: (file, onMessage) => {
    const form = new FormData();
    form.append('uploaded_file', file);
    return new Promise((resolve, reject) => {
      fetch(`${BASE}/documents/upload-stream`, { method: 'POST', body: form })
        .then((res) => {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          function read() {
            reader.read().then(({ done, value }) => {
              if (done) return resolve();
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n\n');
              buffer = lines.pop();
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try { onMessage(JSON.parse(line.slice(6))); } catch {}
                }
              }
              read();
            }).catch(reject);
          }
          read();
        })
        .catch(reject);
    });
  },
  query: (query, history, docIdsToReference, onMessage) => {
    return new Promise((resolve, reject) => {
      fetch(`${BASE}/documents/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, history, docIdsToReference }),
      })
        .then((res) => {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let result = null;
          function read() {
            reader.read().then(({ done, value }) => {
              if (done) return resolve(result);
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n\n');
              buffer = lines.pop();
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const evt = JSON.parse(line.slice(6));
                    if (evt.phase === 'done') result = evt;
                    if (evt.phase === 'error') reject(new Error(evt.message));
                    if (onMessage) onMessage(evt);
                  } catch {}
                }
              }
              read();
            }).catch(reject);
          }
          read();
        })
        .catch(reject);
    });
  },
  downloadUrl: (id) => `${BASE}/documents/${id}/file`,
  // force: delete even when its figures are used in decks/documents (check usage() first).
  delete: (id, { force = false } = {}) => request(`/documents/${id}${force ? '?force=1' : ''}`, { method: 'DELETE' }),
  usage: (id) => request(`/documents/${id}/usage`),
};

export const generations = {
  create: (body) => request('/generations', { method: 'POST', body: JSON.stringify(body) }),
  get: (id) => request(`/generations/${id}`),
  list: () => request('/generations'),
  // ── Planning (decks and documents) ──
  updateBrief: (id, brief) => request(`/generations/${id}/brief`, { method: 'PUT', body: JSON.stringify({ brief }) }),
  templates: () => request('/generations/templates'),
  // A company .pptx: its theme colours and fonts become a template; decks build on its slide masters.
  uploadTemplate: (file, name) => {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    return request('/generations/templates', { method: 'POST', body: form, headers: {} });
  },
  deleteTemplate: (templateId) => request(`/generations/templates/${templateId}`, { method: 'DELETE' }),

  // Re-plans the outline (optionally saving brief changes first). Runs as a job; poll the generation.
  createOutline: (id, brief) =>
    request(`/generations/${id}/outline`, { method: 'POST', body: JSON.stringify({ brief }) }),
  refreshItemSources: (id, index, item) =>
    request(`/generations/${id}/outline/${index}/sources`, { method: 'POST', body: JSON.stringify({ item }) }),
  findSources: (id, q) => request(`/generations/${id}/sources?q=${encodeURIComponent(q)}`),
  // Rewrites one slide/section; `type` switches its layout ("try a different layout").
  regenerateItem: (type, id, index, { note, type: itemType } = {}) =>
    request(`/generations/${id}/${type === 'deck' ? 'slides' : 'sections'}/${index}/regenerate`, {
      method: 'POST', body: JSON.stringify({ note, type: itemType }),
    }),
  // Remix: the best other layouts for an item, with reasons ({ type, reason }[]). visual: only visual layouts.
  suggestLayouts: (type, id, index, visual = false) =>
    request(`/generations/${id}/${type === 'deck' ? 'slides' : 'sections'}/${index}/layouts${visual ? '?visual=1' : ''}`),
  // Deck-wide agent: plan (nothing changes), apply the kept steps (background job), undo the last change.
  agentPlan: (id, instruction) =>
    request(`/generations/${id}/agent/plan`, { method: 'POST', body: JSON.stringify({ instruction }) }),
  agentApply: (id, steps) =>
    request(`/generations/${id}/agent/apply`, { method: 'POST', body: JSON.stringify({ steps }) }),
  agentUndo: (id) => request(`/generations/${id}/agent/undo`, { method: 'POST' }),
  // Adds a document figure as a new Figure slide/section, written around it; no index = before the closing.
  addFigure: (id, figureId, { index } = {}) =>
    request(`/generations/${id}/figures`, { method: 'POST', body: JSON.stringify({ figureId, index }) }),
  // "Add with AI": plans and writes a new slide/section after index `after`.
  addItem: (type, id, after, description) =>
    request(`/generations/${id}/${type === 'deck' ? 'slides' : 'sections'}`, {
      method: 'POST', body: JSON.stringify({ after, description }),
    }),

  // Writes every slide/section that has no content yet, streaming events: start, slide|section (progress),
  // item_done {index, item}, done, error. If a write is already running, streams that one instead.
  write: async (id, onMessage, signal) => {
    const res = await fetch(`${BASE}/generations/${id}/write`, { method: 'POST', signal });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop();
      for (const event of events) {
        if (event.startsWith('data: ')) onMessage(JSON.parse(event.slice(6)));
      }
    }
  },

  updateOutline: (id, outline) =>
    request(`/generations/${id}/outline`, { method: 'PUT', body: JSON.stringify({ outline }) }),

  editSlide: (id, slideIndex, instruction, history = []) =>
    request(`/generations/${id}/slides/${slideIndex}/chat`, {
      method: 'POST',
      body: JSON.stringify({ instruction, history }),
    }),

  editSection: (id, sectionIndex, instruction, history = []) =>
    request(`/generations/${id}/sections/${sectionIndex}/chat`, {
      method: 'POST',
      body: JSON.stringify({ instruction, history }),
    }),

  downloadUrl: (id) => `${BASE}/generations/${id}/file`,

  openInDeckCraft: (id) =>
    request(`/generations/${id}/open-deckcraft`, { method: 'POST' }),

  openInWordCraft: (id) =>
    request(`/generations/${id}/open-wordcraft`, { method: 'POST' }),

  uploadReferenceImage: (id, file) => {
    const form = new FormData();
    form.append('image', file);
    return request(`/generations/${id}/reference-image`, { method: 'POST', body: form, headers: {} });
  },

  craftPrompt: (id) =>
    request(`/generations/${id}/craft-prompt`, { method: 'POST' }),

  updatePrompt: (id, prompt, negative_prompt) =>
    request(`/generations/${id}/prompt`, {
      method: 'PUT',
      body: JSON.stringify({ prompt, negative_prompt }),
    }),

  generateImage: (id, onMessage) => {
    return new Promise((resolve, reject) => {
      fetch(`${BASE}/generations/${id}/generate-image`, { method: 'POST' })
        .then((res) => {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          function read() {
            reader.read().then(({ done, value }) => {
              if (done) return resolve();
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n\n');
              buffer = lines.pop();
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    onMessage(JSON.parse(line.slice(6)));
                  } catch {}
                }
              }
              read();
            }).catch(reject);
          }
          read();
        })
        .catch(reject);
    });
  },

  imageUrl: (id) => `${BASE}/generations/${id}/image`,

  // Renders Mermaid typed by the user; returns { diagram_file }. Throws with Mermaid's message if invalid.
  renderDiagram: (id, mermaidCode) =>
    request(`/generations/${id}/diagram`, {
      method: 'POST',
      body: JSON.stringify({ mermaid_code: mermaidCode }),
    }),

  // `template` picks the diagram's colours; it is part of the URL so switching template refreshes the image.
  diagramUrl: (id, key, template = '') =>
    `${BASE}/generations/${id}/diagrams/${key}?template=${encodeURIComponent(template)}`,
  diagramDownloadUrl: (id, key, name = 'diagram', template = '') =>
    `${BASE}/generations/${id}/diagrams/${key}?download=1&name=${encodeURIComponent(name)}&template=${encodeURIComponent(template)}`,

  releaseGpu: () => request('/generations/release-gpu', { method: 'POST' }),

  delete: (id) => request(`/generations/${id}`, { method: 'DELETE' }),
};

// Figures from ingested documents (the Assets page, figure pickers, chat answers).
export const figures = {
  list: ({ q = '', documentIds = [], includeHidden = false } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (documentIds.length) params.set('documentIds', documentIds.join(','));
    if (includeHidden) params.set('includeHidden', '1');
    return request(`/figures?${params}`);
  },
  imageUrl: (id) => `${BASE}/figures/${id}/image`,
  // Bulk actions take a list of figure ids (one id is fine).
  downloadUrl: (ids) => `${BASE}/figures/download?ids=${ids.join(',')}`,
  usage: (ids) => request('/figures/usage', { method: 'POST', body: JSON.stringify({ ids }) }),
  setHidden: (ids, hidden) => request('/figures/hide', { method: 'POST', body: JSON.stringify({ ids, hidden }) }),
  remove: (ids, { force = false } = {}) => request('/figures/delete', { method: 'POST', body: JSON.stringify({ ids, force }) }),
};

export const conversations = {
  list: () => request('/conversations'),
  get: (id) => request(`/conversations/${id}`),
  create: (title, docIds) => request('/conversations', { method: 'POST', body: JSON.stringify({ title, docIds }) }),
  update: (id, data) => request(`/conversations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/conversations/${id}`, { method: 'DELETE' }),
};

export const assets = {
  list: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.kind) qs.set('kind', params.kind);
    const suffix = qs.toString() ? `?${qs}` : '';
    return request(`/assets${suffix}`);
  },
  save: (generationId, title) =>
    request('/assets', { method: 'POST', body: JSON.stringify({ generationId, title }) }),
  downloadUrl: (id) => `${BASE}/assets/${id}/file`,
  delete: (id) => request(`/assets/${id}`, { method: 'DELETE' }),
};
