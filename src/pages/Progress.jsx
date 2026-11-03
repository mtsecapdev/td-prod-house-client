import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generations } from '../services/api';

export default function Progress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [phase, setPhase] = useState('starting');
  const [error, setError] = useState(null);

  useEffect(() => {
    generations.generateSlides(id, (msg) => {
      if (msg.phase === 'start') {
        setTotal(msg.total);
        setPhase('generating');
      } else if (msg.phase === 'slide') {
        setCurrent(msg.slide);
      } else if (msg.phase === 'done') {
        setPhase('done');
        navigate(`/create/deck/${id}/review`, { replace: true });
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
    <main className="max-w-[820px] mx-auto px-8 py-6 flex flex-col gap-6">
      <div className="text-center">
        <span className="hint"><strong className="text-ink">Step 3 of 4</strong> &middot; Brief, outline, generate, review</span>
      </div>

      <div className="card p-10 flex flex-col items-center gap-6 text-center">
        {phase === 'error' ? (
          <>
            <h1 className="font-heading text-2xl font-bold text-[#BA1A1A] m-0">Generation failed</h1>
            <p className="text-[15px] text-slate max-w-md">{error}</p>
          </>
        ) : (
          <>
            <h1 className="font-heading text-2xl font-bold m-0">
              {phase === 'starting' ? 'Preparing...' : `Generating slide ${current} of ${total}`}
            </h1>
            <div className="w-full max-w-md">
              <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div className="h-full bg-navy rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
              <p className="hint mt-2">{pct}% complete</p>
            </div>
            <p className="text-sm text-slate">You can leave this page. Your deck will be ready when you come back.</p>
          </>
        )}
      </div>
    </main>
  );
}
