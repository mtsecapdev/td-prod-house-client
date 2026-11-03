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
};
