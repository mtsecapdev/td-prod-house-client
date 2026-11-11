import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, RotateCcw } from 'lucide-react';
import { generations } from '../services/api';

export default function ImagePrompt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gen, setGen] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [negPrompt, setNegPrompt] = useState('');
  const [crafting, setCrafting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    generations.get(id).then(({ generation }) => {
      setGen(generation);

      if (generation.status === 'done') {
        navigate(`/create/image/${id}/review`, { replace: true });
        return;
      }
      if (generation.status === 'generating') {
        navigate(`/create/image/${id}/progress`, { replace: true });
        return;
      }

      if (generation.outline?.prompt) {
        setPrompt(generation.outline.prompt);
        setNegPrompt(generation.outline.negative_prompt || '');
      } else if (!started.current) {
        started.current = true;
        doCraft();
      }
    });
  }, [id]);

  async function doCraft() {
    setCrafting(true);
    setError(null);
    try {
      const { generation } = await generations.craftPrompt(id);
      setGen(generation);
      setPrompt(generation.outline?.prompt || '');
      setNegPrompt(generation.outline?.negative_prompt || '');
    } catch (err) {
      setError(err.message);
    }
    setCrafting(false);
  }

  async function handleGenerate() {
    setSubmitting(true);
    try {
      await generations.updatePrompt(id, prompt, negPrompt);
      navigate(`/create/image/${id}/progress`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-[960px] w-[90%] mx-auto py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/" className="btn-ghost"><ArrowLeft size={18} />Back</Link>
        <span className="hint"><strong className="text-ink">Step 2 of 3</strong> &middot; Review prompt, then generate</span>
      </div>

      <h1 className="font-heading text-[32px] leading-10 font-bold tracking-tight m-0">
        Image prompt
      </h1>
      <p className="text-slate text-[15px] -mt-3">
        Review and tweak the prompt before generating. The more specific, the better the result.
      </p>

      {crafting ? (
        <div className="card p-10 flex flex-col items-center gap-4 text-center">
          <Loader2 size={36} className="text-cobalt animate-spin" />
          <p className="font-medium">Crafting your image prompt...</p>
          <p className="hint text-[13px]">The LLM is writing a detailed prompt based on your brief.</p>
        </div>
      ) : error && !prompt ? (
        <div className="card p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-red-600 text-xl font-bold">!</span>
          </div>
          <p className="text-red-600">{error}</p>
          <button onClick={doCraft} className="btn-primary">Retry</button>
        </div>
      ) : (
        <div className="card p-7 flex flex-col gap-6">
          {gen?.brief?.topic && (
            <div>
              <p className="text-[13px] font-semibold text-slate mb-1">Topic</p>
              <p className="text-[15px]">{gen.brief.topic}</p>
            </div>
          )}

          {gen?.brief?.reference_image && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-canvas text-[13px] text-slate">
              <span className="w-2 h-2 rounded-full bg-cobalt shrink-0" />
              Reference image attached — generation will use img2img (strength {Math.round((gen.brief.strength ?? 0.65) * 100)}%)
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="prompt" className="label">Image prompt</label>
            <textarea
              id="prompt"
              className="field font-mono text-[14px]"
              rows={6}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="neg" className="label">
              Negative prompt <span className="font-normal text-slate text-[13px]">(what to avoid)</span>
            </label>
            <textarea
              id="neg"
              className="field font-mono text-[14px]"
              rows={2}
              value={negPrompt}
              onChange={(e) => setNegPrompt(e.target.value)}
            />
          </div>

          {error && <p className="text-red-600 text-[14px]">{error}</p>}

          <div className="flex items-center justify-between">
            <button onClick={doCraft} disabled={crafting} className="btn-ghost gap-1.5">
              <RotateCcw size={16} />Re-craft prompt
            </button>
            <button onClick={handleGenerate} disabled={submitting || !prompt.trim()} className="btn-primary">
              {submitting ? 'Starting...' : 'Generate image'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
