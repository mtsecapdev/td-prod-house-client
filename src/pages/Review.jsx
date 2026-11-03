import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, ChevronRight } from 'lucide-react';
import { generations } from '../services/api';

export default function Review() {
  const { id } = useParams();
  const [gen, setGen] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    generations.get(id).then(({ generation }) => setGen(generation));
  }, [id]);

  if (!gen || !gen.outline?.slides) {
    return <main className="max-w-[1180px] mx-auto px-8 py-6"><p className="hint">Loading...</p></main>;
  }

  const slides = gen.outline.slides;
  const slide = slides[activeSlide];
  const content = slide?.content;

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const instruction = chatInput;
    setChatInput('');
    setChatHistory((h) => [...h, { role: 'user', content: instruction }]);
    setChatLoading(true);

    try {
      const { slide: updated } = await generations.editSlide(id, activeSlide, instruction, chatHistory);
      setChatHistory((h) => [...h, { role: 'assistant', content: 'Slide updated.' }]);
      const refreshed = await generations.get(id);
      setGen(refreshed.generation);
    } catch (err) {
      setChatHistory((h) => [...h, { role: 'assistant', content: `Error: ${err.message}` }]);
    }
    setChatLoading(false);
  }

  return (
    <main className="max-w-[1180px] mx-auto px-8 py-6 flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading text-[28px] leading-9 font-bold tracking-tight m-0">
              {gen.brief?.topic || 'Slide deck'}
            </h1>
            <span className="chip-muted">Draft</span>
          </div>
          <p className="hint mt-1">{slides.length} slides</p>
        </div>
        <span className="hint"><strong className="text-ink">Step 4 of 4</strong> &middot; Brief, outline, generate, review</span>
      </div>

      <div className="flex flex-wrap gap-6 items-start">
        {/* Slide nav */}
        <nav className="w-[220px] min-w-[180px] shrink-0">
          <ol className="list-none m-0 p-0 flex flex-col gap-0.5">
            {slides.map((s, i) => (
              <li key={i}>
                <button type="button" onClick={() => { setActiveSlide(i); setChatHistory([]); }}
                  className={`w-full flex gap-2 items-center min-h-[44px] px-2 py-1.5 rounded-md text-left text-[13px] font-medium cursor-pointer border-2 ${
                    i === activeSlide ? 'border-navy bg-[#F5F8FC]' : 'border-transparent hover:bg-[#E7EDF5]'
                  }`}>
                  <span className="w-[18px] text-slate font-semibold">{i + 1}</span>
                  <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Slide preview + edit chat */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Slide preview card */}
          <article className="card p-8 aspect-video flex flex-col gap-4 overflow-hidden">
            <h2 className="font-heading text-[26px] leading-8 font-bold tracking-tight m-0">
              {content?.title || slide.title}
            </h2>
            {content?.bullets && (
              <ol className="list-none m-0 p-0 flex flex-col gap-3 flex-1">
                {content.bullets.map((b, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-[26px] h-[26px] rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span>
                      <span className="block text-[15px] font-semibold">{b.heading}</span>
                      <span className="text-sm text-[#334155]">{b.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {!content && <p className="hint">No content generated for this slide.</p>}
          </article>

          {/* Speaker notes */}
          {content?.speaker_notes && (
            <details className="card">
              <summary className="px-5 py-3 cursor-pointer font-semibold text-sm text-slate">Speaker notes</summary>
              <p className="px-5 pb-4 text-sm text-slate leading-relaxed">{content.speaker_notes}</p>
            </details>
          )}

          {/* Edit Chat toggle + panel */}
          <div className="card overflow-hidden">
            <button type="button" onClick={() => setChatOpen(!chatOpen)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-navy hover:bg-canvas">
              Edit this slide with chat
              <ChevronRight size={16} className={`transition-transform ${chatOpen ? 'rotate-90' : ''}`} />
            </button>

            {chatOpen && (
              <div className="border-t border-border">
                <div className="max-h-[240px] overflow-y-auto px-5 py-3 flex flex-col gap-2">
                  {chatHistory.length === 0 && (
                    <p className="hint text-sm">Tell me what to change on this slide.</p>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`text-sm px-3 py-2 rounded-lg max-w-[80%] ${
                      msg.role === 'user' ? 'bg-navy text-white self-end' : 'bg-[#F1F5F9] self-start'
                    }`}>
                      {msg.content}
                    </div>
                  ))}
                  {chatLoading && <p className="hint text-sm animate-pulse">Thinking...</p>}
                </div>
                <form onSubmit={handleEditSubmit} className="flex gap-2 px-5 py-3 border-t border-border">
                  <input className="field flex-1" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    placeholder="e.g. Make the title shorter" disabled={chatLoading} />
                  <button type="submit" disabled={chatLoading || !chatInput.trim()} className="btn-primary px-3">
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
