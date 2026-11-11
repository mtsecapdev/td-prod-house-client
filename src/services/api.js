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
  downloadUrl: (id) => `${BASE}/documents/${id}/file`,
  delete: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
};

export const generations = {
  create: (body) => request('/generations', { method: 'POST', body: JSON.stringify(body) }),
  get: (id) => request(`/generations/${id}`),
  list: () => request('/generations'),
  updateOutline: (id, outline) =>
    request(`/generations/${id}/outline`, { method: 'PUT', body: JSON.stringify({ outline }) }),

  generateSlides: (id, onMessage) => {
    return new Promise((resolve, reject) => {
      fetch(`${BASE}/generations/${id}/generate`, { method: 'POST' })
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

  editSlide: (id, slideIndex, instruction, history = []) =>
    request(`/generations/${id}/slides/${slideIndex}/chat`, {
      method: 'POST',
      body: JSON.stringify({ instruction, history }),
    }),

  generateSections: (id, onMessage) => {
    return new Promise((resolve, reject) => {
      fetch(`${BASE}/generations/${id}/generate-sections`, { method: 'POST' })
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

  generateInfographic: (id, onMessage) => {
    return new Promise((resolve, reject) => {
      fetch(`${BASE}/generations/${id}/generate-infographic`, { method: 'POST' })
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

  editInfographic: (id, instruction, history = []) =>
    request(`/generations/${id}/infographic/chat`, {
      method: 'POST',
      body: JSON.stringify({ instruction, history }),
    }),

  infographicUrl: (id) => `${BASE}/generations/${id}/infographic`,

  releaseGpu: () => request('/generations/release-gpu', { method: 'POST' }),

  delete: (id) => request(`/generations/${id}`, { method: 'DELETE' }),
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
