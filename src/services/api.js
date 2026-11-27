// The API is served on the app's own origin under /api (Vite forwards it in development, the web server in
// production), so the session cookie goes with every request, images and downloads included.
const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/** Fired when a request finds the session gone or the password still temporary (AuthContext listens). */
export const AUTH_EVENT = 'tdph:auth';
const PUBLIC_PATHS = ['/auth/login', '/auth/me'];

function noticeAuth(res, path, json) {
  if (PUBLIC_PATHS.includes(path)) return;
  if (res.status === 401) window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: 'signed-out' }));
  if (res.status === 403 && /new password/i.test(errorMessage(json, 403))) {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: 'must-change-password' }));
  }
}

// The server's error responses carry the message in error.message (handled errors) or data.message (thrown ones).
function errorMessage(json, status) {
  return json?.error?.message || json?.data?.message || `Request failed: ${status}`;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    noticeAuth(res, path, json);
    throw new Error(errorMessage(json, res.status));
  }
  return json.data;
}

// Every stream ends with { phase: 'done' } or { phase: 'error' }, and the server sends a keep-alive every few
// seconds meanwhile. A stream that closes without its end, or goes silent, has lost the server (a restart once
// left a chat on "Rewriting..." for ten minutes): it fails instead of waiting forever.
const STREAM_SILENCE_MS = 30000;
const LOST = 'The connection to the server was lost before it finished. Please try again.';

/**
 * POSTs and reads a server-sent event stream, calling onEvent for each event. Resolves with the last event.
 * body: an object (sent as JSON) or FormData.
 */
async function stream(path, body, onEvent = () => {}, signal) {
  const isForm = body instanceof FormData;
  const watchdog = new AbortController();
  let silence = null;
  const listen = () => { clearTimeout(silence); silence = setTimeout(() => watchdog.abort(), STREAM_SILENCE_MS); };
  signal?.addEventListener('abort', () => watchdog.abort(), { once: true });
  listen();
  try {
    return await readStream(path, body, isForm, onEvent, watchdog.signal, listen);
  } catch (err) {
    if (watchdog.signal.aborted && !signal?.aborted) throw new Error(LOST, { cause: err });
    if (err instanceof TypeError) throw new Error(LOST, { cause: err }); // the network dropped
    throw err;
  } finally {
    clearTimeout(silence);
  }
}

async function readStream(path, body, isForm, onEvent, signal, listen) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    signal,
    ...(body === undefined ? {} : isForm ? { body } : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  if (!res.ok && !res.headers.get('content-type')?.includes('event-stream')) {
    const json = await res.json().catch(() => ({}));
    noticeAuth(res, path, json);
    throw new Error(errorMessage(json, res.status));
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let last = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      if (last?.phase !== 'done' && last?.phase !== 'error') throw new Error(LOST);
      return last;
    }
    listen();
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop();
    for (const event of events) {
      if (!event.startsWith('data: ')) continue;
      last = JSON.parse(event.slice(6));
      onEvent(last);
    }
  }
}

export const auth = {
  me: () => request('/auth/me'),
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
};

// Admin: accounts. create and resetPassword return { user, temporaryPassword } (shown once).
export const users = {
  list: () => request('/users'),
  create: ({ username, displayName, role }) => request('/users', { method: 'POST', body: JSON.stringify({ username, displayName, role }) }),
  update: (id, fields) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(fields) }),
  resetPassword: (id) => request(`/users/${id}/reset-password`, { method: 'POST' }),
};

export const documents = {
  list: () => request('/documents'),
  // Progress events while the document is converted, split, embedded and summarised.
  uploadStream: (file, onEvent) => {
    const form = new FormData();
    form.append('uploaded_file', file);
    return stream('/documents/upload-stream', form, onEvent);
  },
  downloadUrl: (id) => `${BASE}/documents/${id}/file`,
  // force: delete even when its figures are used in decks/documents (check usage() first).
  delete: (id, { force = false } = {}) => request(`/documents/${id}${force ? '?force=1' : ''}`, { method: 'DELETE' }),
  usage: (id) => request(`/documents/${id}/usage`),
};

// The workspace: conversations where questions are answered and decks/documents are made and changed.
export const conversations = {
  list: () => request('/conversations'),
  get: (id) => request(`/conversations/${id}`),
  // { title?, docIds?, generationId? } — generationId gives an older deck/document its own conversation.
  create: (body = {}) => request('/conversations', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, { title, docIds }) => request(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify({ title, docIds }) }),
  delete: (id) => request(`/conversations/${id}`, { method: 'DELETE' }),
  // A question, or with target { generationId, index? | after? } a change to that deck/document.
  // Streams { phase } events; resolves with { phase: 'done', messages: [user, assistant] }.
  // picked: a quick answer or checklist clicked in the planning interview (taken as given, not judged).
  send: (id, content, target, onEvent, picked) => stream(`/conversations/${id}/messages`, { content, target, picked }, onEvent),
  // The planning interview before a deck/document: each returns { messages } (the next question or summary, the plan card).
  interview: {
    skip: (id) => request(`/conversations/${id}/interview/skip`, { method: 'POST' }),
    change: (id, slot) => request(`/conversations/${id}/interview/change`, { method: 'POST', body: JSON.stringify({ slot }) }),
    cancel: (id) => request(`/conversations/${id}/interview/cancel`, { method: 'POST' }),
    plan: (id) => request(`/conversations/${id}/interview/plan`, { method: 'POST' }),
  },
  // Makes a deck ('deck'), training document ('doc') or image ('image') from the conversation; returns { messages }.
  skill: (id, type, request_) =>
    request(`/conversations/${id}/skills/${type}`, { method: 'POST', body: JSON.stringify({ request: request_ }) }),
  applyPlan: (id, messageId, steps) =>
    request(`/conversations/${id}/messages/${messageId}/apply`, { method: 'POST', body: JSON.stringify({ steps }) }),
  undoPlan: (id, messageId) => request(`/conversations/${id}/messages/${messageId}/undo`, { method: 'POST' }),
};

export const generations = {
  get: (id) => request(`/generations/${id}`),
  list: () => request('/generations'),
  // ── Planning (decks and documents) ──
  updateBrief: (id, brief) => request(`/generations/${id}/brief`, { method: 'PUT', body: JSON.stringify({ brief }) }),
  // The deck's/document's own name (not its title slide's title); '' goes back to following the title slide.
  rename: (id, name) => request(`/generations/${id}/name`, { method: 'PUT', body: JSON.stringify({ name }) }),
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
  // The best other layouts for an item, with reasons ({ type, reason }[]).
  suggestLayouts: (type, id, index) =>
    request(`/generations/${id}/${type === 'deck' ? 'slides' : 'sections'}/${index}/layouts`),
  // Adds a document figure as a new Figure slide/section, written around it; no index = before the closing.
  addFigure: (id, figureId, { index } = {}) =>
    request(`/generations/${id}/figures`, { method: 'POST', body: JSON.stringify({ figureId, index }) }),

  // Writes every slide/section that has no content yet, streaming events: start, slide|section (progress),
  // item_done {index, item}, done, error. If a write is already running, streams that one instead.
  write: (id, onEvent, signal) => stream(`/generations/${id}/write`, undefined, onEvent, signal),

  updateOutline: (id, outline) =>
    request(`/generations/${id}/outline`, { method: 'PUT', body: JSON.stringify({ outline }) }),

  downloadUrl: (id) => `${BASE}/generations/${id}/file`,
  openInDeckCraft: (id) => request(`/generations/${id}/open-deckcraft`, { method: 'POST' }),
  openInWordCraft: (id) => request(`/generations/${id}/open-wordcraft`, { method: 'POST' }),

  // A generated image (the image skill); retryImage generates it again after a failure.
  imageUrl: (id) => `${BASE}/generations/${id}/image`,
  retryImage: (id) => request(`/generations/${id}/image`, { method: 'POST' }),

  // Renders Mermaid typed by the user; returns { diagram_file }. Throws with Mermaid's message if invalid.
  renderDiagram: (id, mermaidCode) =>
    request(`/generations/${id}/diagram`, { method: 'POST', body: JSON.stringify({ mermaid_code: mermaidCode }) }),
  // `template` picks the diagram's colours; it is part of the URL so switching template refreshes the image.
  diagramUrl: (id, key, template = '') =>
    `${BASE}/generations/${id}/diagrams/${key}?template=${encodeURIComponent(template)}`,
  diagramDownloadUrl: (id, key, name = 'diagram', template = '') =>
    `${BASE}/generations/${id}/diagrams/${key}?download=1&name=${encodeURIComponent(name)}&template=${encodeURIComponent(template)}`,

  delete: (id) => request(`/generations/${id}`, { method: 'DELETE' }),
};

// Figures from ingested documents (the Assets page, figure pickers, chat answers).
export const figures = {
  list: ({ q = '', documentIds = [] } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (documentIds.length) params.set('documentIds', documentIds.join(','));
    return request(`/figures?${params}`);
  },
  imageUrl: (id) => `${BASE}/figures/${id}/image`,
  // Bulk actions take a list of figure ids (one id is fine).
  downloadUrl: (ids) => `${BASE}/figures/download?ids=${ids.join(',')}`,
  usage: (ids) => request('/figures/usage', { method: 'POST', body: JSON.stringify({ ids }) }),
  remove: (ids, { force = false } = {}) => request('/figures/delete', { method: 'POST', body: JSON.stringify({ ids, force }) }),
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
