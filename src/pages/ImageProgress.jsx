import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { generations } from '../services/api';

const phaseLabels = {
  start: 'Starting...',
  switching: 'Preparing GPU for image generation...',
  generating: 'Generating image...',
  saving: 'Saving image...',
  done: 'Done!',
  error: 'Generation failed',
};

export default function ImageProgress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('start');
  const [message, setMessage] = useState('Starting...');
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    generations.get(id).then(({ generation }) => {
      if (generation.status === 'done') {
        navigate(`/create/image/${id}/review`, { replace: true });
        return;
      }

      generations.generateImage(id, (data) => {
        setPhase(data.phase);
        if (data.message) setMessage(data.message);

        if (data.phase === 'done') {
          setTimeout(() => navigate(`/create/image/${id}/review`, { replace: true }), 1000);
        }
        if (data.phase === 'error') {
          setError(data.message || 'Unknown error');
        }
      }).catch((err) => {
        setError(err.message);
        setPhase('error');
      });
    });
  }, [id, navigate]);

  return (
    <main className="max-w-[640px] w-[90%] mx-auto py-[12vh] flex flex-col items-center gap-8 text-center">
      <Link to="/" className="btn-ghost self-start"><ArrowLeft size={18} />Home</Link>

      {phase === 'error' ? (
        <>
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-red-600 text-2xl">!</span>
          </div>
          <h1 className="font-heading text-[28px] font-bold m-0">Generation failed</h1>
          <p className="text-slate">{error}</p>
          <Link to="/" className="btn-primary">Back to Home</Link>
        </>
      ) : (
        <>
          <Loader2 size={48} className="text-cobalt animate-spin" />
          <h1 className="font-heading text-[28px] font-bold m-0">
            {phaseLabels[phase] || message}
          </h1>
          <p className="text-slate text-[15px]">{message}</p>
          <p className="hint text-[13px]">This may take 30-60 seconds. You can leave and come back.</p>
        </>
      )}
    </main>
  );
}
