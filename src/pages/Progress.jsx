import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Check, Circle } from 'lucide-react';
import { generations } from '../services/api';

const LAYOUT_LABELS = {
  title: 'Title', bullets: 'Bullets', two_column: 'Two Column',
  stat_focus: 'Key Stat', quote_highlight: 'Quote', checklist: 'Checklist',
  section_divider: 'Section', big_idea: 'Big Idea', timeline: 'Timeline',
  process_flow: 'Process', icon_grid: 'Icon Grid', comparison_table: 'Table',
  closing: 'Closing',
};

export default function Progress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [slides, setSlides] = useState([]);
  const [phase, setPhase] = useState('starting');
  const [error, setError] = useState(null);

  useEffect(() => {
    generations.generateSlides(id, (msg) => {
      if (msg.phase === 'start') {
        setTotal(msg.total);
        setSlides(msg.slides || []);
        setPhase('generating');
      } else if (msg.phase === 'slide') {
        setCurrent(msg.slide);
      } else if (msg.phase === 'done') {
        setPhase('done');
        setTimeout(() => navigate(`/create/deck/${id}/review`, { replace: true }), 600);
      } else if (msg.phase === 'error') {
        setPhase('error');
        setError(msg.message);
      }
    }).catch((err) => {
      setPhase('error');
      setError(err.message);
    });
  }, [id, navigate]);

  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <main className="max-w-[960px] w-[90%] mx-auto py-8 flex flex-col gap-6">
      <div className="text-center">
        <span className="hint"><strong className="text-ink">Step 3 of 4</strong> &middot; Brief, outline, generate, review</span>
      </div>

      <div className="card p-8 flex flex-col items-center gap-6">
        {phase === 'error' ? (
          <div className="text-center">
            <h1 className="font-heading text-2xl font-bold text-[#BA1A1A] m-0">Generation failed</h1>
            <p className="text-[15px] text-slate max-w-md mt-2">{error}</p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="font-heading text-2xl font-bold m-0">
                {phase === 'starting' ? 'Preparing your deck...' : phase === 'done' ? 'Deck complete!' : 'Generating slides'}
              </h1>
              <p className="text-sm text-slate mt-1">
                {phase === 'starting' ? 'Setting up the pipeline' : phase === 'done' ? 'Redirecting to review...' : `Writing slide ${current} of ${total}`}
              </p>
            </div>

            <div className="w-full max-w-md">
              <div className="h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ease-out ${phase === 'done' ? 'bg-[#10B981]' : 'bg-gradient-to-r from-navy to-cobalt'}`}
                  style={{ width: `${phase === 'done' ? 100 : pct}%` }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-slate">{phase === 'done' ? 'Complete' : `${pct}%`}</span>
                <span className="text-xs text-slate">{total} slides</span>
              </div>
            </div>

            {slides.length > 0 && (
              <ol className="list-none m-0 p-0 w-full max-w-md flex flex-col gap-0.5">
                {slides.map((s, i) => {
                  const done = i + 1 < current || phase === 'done';
                  const active = i + 1 === current && phase === 'generating';
                  return (
                    <li key={i} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${active ? 'bg-[#EFF6FF]' : ''}`}>
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        {done ? (
                          <Check size={16} className="text-[#10B981]" />
                        ) : active ? (
                          <Loader2 size={16} className="text-cobalt animate-spin" />
                        ) : (
                          <Circle size={14} className="text-[#CBD5E1]" />
                        )}
                      </div>
                      <span className={`flex-1 text-[14px] truncate ${done ? 'text-slate' : active ? 'text-ink font-medium' : 'text-[#94A3B8]'}`}>
                        {s.title}
                      </span>
                      <span className={`text-[11px] uppercase tracking-wider ${done ? 'text-[#CBD5E1]' : active ? 'text-cobalt' : 'text-[#CBD5E1]'}`}>
                        {LAYOUT_LABELS[s.layout] || s.layout}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            {phase === 'generating' && (
              <p className="text-xs text-slate text-center">You can leave this page. Your deck will be ready when you come back.</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
