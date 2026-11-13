import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  FileText,
  Loader2,
  ChevronDown,
  AlertTriangle,
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { documents, conversations } from '../services/api';

export default function Chat() {
  const [docs, setDocs] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(null);
  const [docsOpen, setDocsOpen] = useState(false);

  const [convList, setConvList] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEnd = useRef(null);
  const inputRef = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => {
    documents
      .list()
      .then((d) => {
        const list = (d.docs || d || []).filter((doc) => doc.status === 'ready');
        setDocs(list);
      })
      .catch(() => {});
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    try {
      const data = await conversations.list();
      setConvList(data.conversations || []);
    } catch {}
  }

  function createNewChat() {
    setMessages([]);
    setHistory([]);
    setActiveConvId(null);
    inputRef.current?.focus();
  }

  async function openConversation(id) {
    if (id === activeConvId) return;
    try {
      const data = await conversations.get(id);
      const conv = data.conversation || data;
      setActiveConvId(conv.id);
      setMessages(conv.messages || []);
      setHistory(
        (conv.messages || [])
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content })),
      );
      if (conv.doc_ids?.length) setSelectedIds(conv.doc_ids);
    } catch {}
  }

  async function deleteConversation(e, id) {
    e.stopPropagation();
    try {
      await conversations.delete(id);
      setConvList((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
        setHistory([]);
      }
    } catch {}
  }

  const saveMessages = useCallback(
    async (convId, msgs, docIds, firstUserMsg) => {
      if (savingRef.current) return convId;
      savingRef.current = true;
      try {
        if (convId) {
          await conversations.update(convId, { messages: msgs, docIds });
          return convId;
        }
        const title =
          firstUserMsg && firstUserMsg.length > 60
            ? firstUserMsg.slice(0, 57) + '...'
            : firstUserMsg || 'New chat';
        const data = await conversations.create(title, docIds);
        const conv = data.conversation || data;
        await conversations.update(conv.id, { messages: msgs });
        setConvList((prev) => [conv, ...prev]);
        return conv.id;
      } catch {
        return convId;
      } finally {
        savingRef.current = false;
      }
    },
    [],
  );

  function toggleDoc(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSend(e) {
    e.preventDefault();
    const query = input.trim();
    if (!query || loading || selectedIds.length === 0) return;

    setInput('');
    const userMsg = { role: 'user', content: query };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);
    setPhase('rewriting');

    try {
      const data = await documents.query(query, history, selectedIds, (evt) => {
        setPhase(evt.phase);
      });
      const reply = data.modelResponse;
      const assistantMsg = {
        role: 'assistant',
        content: reply.content,
        confidence: data.avgConfidenceScore,
        chunks: data.chunks,
      };
      const allMessages = [...nextMessages, assistantMsg];
      setMessages(allMessages);
      setHistory(data.history);

      const isFirst = !activeConvId;
      const newId = await saveMessages(
        activeConvId,
        allMessages,
        selectedIds,
        isFirst ? query : undefined,
      );
      if (newId && newId !== activeConvId) setActiveConvId(newId);
      loadConversations();
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'error', content: err.message }]);
    }
    setLoading(false);
    setPhase(null);
    inputRef.current?.focus();
  }

  const selectedCount = selectedIds.length;
  const docLabel =
    selectedCount === docs.length
      ? 'All documents'
      : `${selectedCount} document${selectedCount !== 1 ? 's' : ''}`;

  return (
    <div className="flex" style={{ height: 'calc(100vh - 53px)' }}>
      {sidebarOpen && (
        <aside className="w-64 shrink-0 border-r border-border bg-canvas flex flex-col">
          <div className="p-3 flex items-center gap-2 border-b border-border">
            <button
              onClick={createNewChat}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-navy text-white text-[13px] font-medium hover:bg-navy/90 transition-colors"
            >
              <Plus size={15} />
              New chat
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-white text-slate transition-colors"
              title="Close sidebar"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {convList.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-slate text-center">
                No conversations yet
              </p>
            ) : (
              convList.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 group hover:bg-white transition-colors ${
                    c.id === activeConvId ? 'bg-white border-r-2 border-cobalt' : ''
                  }`}
                >
                  <MessageSquare
                    size={14}
                    className={`shrink-0 ${c.id === activeConvId ? 'text-cobalt' : 'text-slate'}`}
                  />
                  <span className="flex-1 truncate text-[13px]">{c.title}</span>
                  <button
                    onClick={(e) => deleteConversation(e, c.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-canvas text-slate hover:text-red-600 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </button>
              ))
            )}
          </div>
        </aside>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="max-w-[820px] w-[90%] mx-auto py-6 flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-canvas text-slate transition-colors"
                  title="Open sidebar"
                >
                  <PanelLeftOpen size={16} />
                </button>
              )}
              <h1 className="font-heading text-[22px] font-bold m-0">
                Chat with your documents
              </h1>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDocsOpen(!docsOpen)}
                className="btn-outline text-[13px] gap-1.5"
              >
                <FileText size={14} />
                {docLabel}
                <ChevronDown size={14} />
              </button>
              {docsOpen && (
                <div className="absolute right-0 top-full mt-1 w-72 card shadow-raised z-10 py-1 max-h-64 overflow-y-auto">
                  {docs.length === 0 ? (
                    <p className="px-4 py-3 text-[13px] text-slate">
                      No documents ingested yet.
                    </p>
                  ) : (
                    docs.map((d) => (
                      <label
                        key={d.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-canvas cursor-pointer text-[14px]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(d.id)}
                          onChange={() => toggleDoc(d.id)}
                          className="accent-cobalt w-4 h-4"
                        />
                        <span className="truncate">{d.name}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-border bg-white px-5 py-4 flex flex-col gap-4">
            {messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-slate text-[15px] text-center leading-relaxed max-w-sm">
                  Ask anything about your source documents. Select which documents
                  to reference using the dropdown above.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-[14px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-navy text-white rounded-br-sm'
                      : msg.role === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                        : 'bg-canvas text-ink rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'error' && (
                    <div className="flex items-center gap-1.5 mb-1 text-red-600 text-[12px] font-medium">
                      <AlertTriangle size={13} />
                      Error
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.confidence != null && msg.confidence < 0.4 && (
                    <p className="mt-2 text-[12px] text-amber-600 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Low confidence — documents may not cover this topic
                    </p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-canvas rounded-xl rounded-bl-sm px-4 py-3 flex items-center gap-2 text-slate text-[14px]">
                  <Loader2 size={16} className="animate-spin" />
                  {phase === 'loading'
                    ? 'Loading model...'
                    : phase === 'rewriting'
                      ? 'Understanding query...'
                      : phase === 'searching'
                        ? 'Searching documents...'
                        : phase === 'generating'
                          ? 'Generating answer...'
                          : 'Thinking...'}
                </div>
              </div>
            )}

            <div ref={messagesEnd} />
          </div>

          <form onSubmit={handleSend} className="mt-3 flex gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                selectedIds.length === 0
                  ? 'Select at least one document...'
                  : 'Ask about your documents...'
              }
              disabled={loading || selectedIds.length === 0}
              className="flex-1 px-4 py-3 rounded-lg border border-border bg-white text-[14px] placeholder:text-slate/50 focus:outline-none focus:border-cobalt disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || selectedIds.length === 0}
              className="px-4 py-3 rounded-lg bg-navy text-white font-medium text-[14px] hover:bg-navy/90 disabled:opacity-40 transition-colors flex items-center gap-2"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
