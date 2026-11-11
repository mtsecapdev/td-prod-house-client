import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, BookmarkPlus, Check, RefreshCw, MessageSquare, Send, Loader2 } from 'lucide-react';
import { generations, assets } from '../services/api';

const formatLabels = {
  diagram: 'Diagram',
  process: 'Process flow',
  comparison: 'Comparison',
  key_stats: 'Key statistics',
  timeline: 'Timeline',
};

export default function InfographicReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gen, setGen] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [imgKey, setImgKey] = useState(Date.now());
  const chatEndRef = useRef(null);

  useEffect(() => {
    generations.get(id).then(({ generation }) => setGen(generation));
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  if (!gen) return <main className="flex items-center justify-center h-[60vh]"><p className="hint">Loading...</p></main>;

  const outline = gen.outline || {};
  const topic = gen.brief?.topic || 'Infographic';
  const format = outline.format || gen.brief?.format || 'diagram';
  const content = outline.content;
  const imageUrl = `${generations.infographicUrl(id)}?t=${imgKey}`;

  async function handleSave() {
    setSaving(true);
    try {
      await assets.save(gen.id, topic);
      setSaved(true);
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      navigate(`/create/infographic/${id}/progress`, { replace: true });
    } catch (err) {
      console.error(err);
      setRegenerating(false);
    }
  }

  async function handleChatSubmit(e) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const instruction = chatInput;
    setChatInput('');
    setChatHistory((h) => [...h, { role: 'user', content: instruction }]);
    setChatLoading(true);
    try {
      await generations.editInfographic(id, instruction, chatHistory);
      setChatHistory((h) => [...h, { role: 'assistant', content: 'Updated.' }]);
      const refreshed = await generations.get(id);
      setGen(refreshed.generation);
      setImgKey(Date.now());
    } catch (err) {
      setChatHistory((h) => [...h, { role: 'assistant', content: `Error: ${err.message}` }]);
    }
    setChatLoading(false);
  }

  return (
    <main className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-border bg-white px-4 py-2 flex items-center gap-3">
        <Link to="/" className="btn-ghost text-[14px]"><ArrowLeft size={16} />Home</Link>
        <div className="flex-1" />
        <span className="text-[14px] font-medium text-ink truncate max-w-[300px]">{topic}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button onClick={handleRegenerate} disabled={regenerating}
            className="btn-outline text-[14px] gap-1.5">
            <RefreshCw size={16} />
            <span className="hidden sm:inline">Regenerate</span>
          </button>
          <button onClick={handleSave} disabled={saving || saved}
            className="btn-outline text-[14px] gap-1.5">
            {saved ? <Check size={16} /> : <BookmarkPlus size={16} />}
            <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
          </button>
          <a href={generations.infographicUrl(id)} download className="btn-primary text-[14px] gap-1.5 no-underline">
            <Download size={16} />
            <span className="hidden sm:inline">PNG</span>
          </a>
          <button onClick={() => setChatOpen((o) => !o)}
            className={`btn-outline text-[14px] gap-1.5 ${chatOpen ? 'bg-canvas' : ''}`}>
            <MessageSquare size={15} />
            <span className="hidden sm:inline">Edit</span>
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Image preview */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-auto bg-[#E8ECF0]">
          <img
            src={imageUrl}
            alt={topic}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          />
        </div>

        {/* Sidebar: details or chat */}
        <div className="w-[300px] shrink-0 border-l border-border bg-white flex flex-col overflow-hidden">
          {chatOpen ? (
            /* Edit chat panel */
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-[14px] font-semibold">Edit chat</span>
                <button onClick={() => setChatOpen(false)} className="text-slate hover:text-ink text-[13px]">Close</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {chatHistory.length === 0 && <p className="hint text-[13px]">Tell me what to change.</p>}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`text-[14px] leading-relaxed px-3 py-2 rounded-lg max-w-[90%] ${
                    msg.role === 'user'
                      ? 'bg-navy text-white self-end'
                      : 'bg-canvas text-ink self-start'
                  }`}>
                    {msg.content}
                  </div>
                ))}
                {chatLoading && (
                  <div className="self-start flex items-center gap-2 text-[13px] text-slate">
                    <Loader2 size={14} className="animate-spin" /> Updating...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleChatSubmit} className="p-3 border-t border-border flex gap-2">
                <input
                  className="field flex-1 text-[14px]"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="e.g. Make the title shorter"
                  disabled={chatLoading}
                />
                <button type="submit" disabled={chatLoading || !chatInput.trim()}
                  className="btn-primary px-3">
                  <Send size={16} />
                </button>
              </form>
            </div>
          ) : (
            /* Details sidebar */
            <div className="overflow-y-auto p-5 flex flex-col gap-5">
              <div>
                <h3 className="text-[13px] font-semibold text-slate mb-1">Format</h3>
                <p className="text-[14px]">{formatLabels[format] || format}</p>
              </div>

              <div>
                <h3 className="text-[13px] font-semibold text-slate mb-1">Topic</h3>
                <p className="text-[14px]">{gen.brief?.topic}</p>
              </div>

              {gen.brief?.audience && (
                <div>
                  <h3 className="text-[13px] font-semibold text-slate mb-1">Audience</h3>
                  <p className="text-[14px]">{gen.brief.audience}</p>
                </div>
              )}

              {format === 'diagram' && content?.mermaid_code && (
                <div>
                  <h3 className="text-[13px] font-semibold text-slate mb-1">Mermaid code</h3>
                  <pre className="text-[12px] bg-canvas rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-slate leading-relaxed">
                    {content.mermaid_code}
                  </pre>
                </div>
              )}

              {format !== 'diagram' && content && (
                <div>
                  <h3 className="text-[13px] font-semibold text-slate mb-1">Content summary</h3>
                  <p className="text-[14px] text-slate">{content.title}</p>
                  {content.subtitle && <p className="text-[13px] text-slate mt-1">{content.subtitle}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
