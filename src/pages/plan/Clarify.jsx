import { useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { generations } from '../../services/api';
import { KIND } from '../../components/plan/kindConfig';
import PlanSteps, { JobCard } from '../../components/plan/PlanSteps';
import { usePlanGeneration, jobRunning, jobFailed } from '../../components/plan/usePlanGeneration';

export default function Clarify() {
  const { id } = useParams();
  const navigate = useNavigate();
  const kind = KIND[useLocation().pathname.includes('/doc/') ? 'doc' : 'deck'];
  // Take the questions once they exist; local edits win afterwards.
  const { gen, expectJob } = usePlanGeneration(id, {
    onLoad: (g) => { if (!jobRunning(g, 'questions')) setQuestions((q) => q ?? (g.brief?.questions || [])); },
  });
  const [questions, setQuestions] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const asking = jobRunning(gen, 'questions');
  const askFailed = jobFailed(gen, 'questions');

  function setAnswer(i, answer) {
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, answer } : q)));
  }

  async function handleContinue(skip = false) {
    setBusy(true);
    setError(null);
    try {
      const answered = skip ? questions.map((q) => ({ ...q, answer: '' })) : questions;
      const before = JSON.stringify((gen.brief?.questions || []).map((q) => q.answer));
      await generations.updateBrief(id, { questions: answered });
      const changed = before !== JSON.stringify(answered.map((q) => q.answer));
      // Rebuild the storyline only if there is none yet or the answers changed.
      if (!gen.storyline?.messages?.length || changed) await generations.createStoryline(id);
      navigate(`/create/${kind.type}/${id}/storyline`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleAskAgain() {
    setQuestions(null);
    await generations.regenerateQuestions(id);
    expectJob();
  }

  if (!gen) return <main className="max-w-[960px] w-[90%] mx-auto py-8"><p className="hint">Loading...</p></main>;

  return (
    <main className="max-w-[960px] w-[90%] mx-auto py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/" className="btn-ghost"><ArrowLeft size={18} />Home</Link>
      </div>
      <PlanSteps gen={gen} current="clarify" kind={kind} />

      <div>
        <h1 className="font-heading text-[32px] leading-10 font-bold tracking-tight m-0">A few questions first</h1>
        <p className="text-[15px] text-slate mt-1.5 mb-0">
          Answers shape what the {kind.product} focuses on. Pick a suggestion, write your own, or skip any of them.
        </p>
      </div>

      {(asking || askFailed) && (
        <JobCard running={asking} error={askFailed}
          runningText="Reading your documents..."
          detail="Looking for what the brief leaves open. This takes 10-30 seconds."
          onRetry={handleAskAgain} />
      )}

      {!asking && !askFailed && questions && (
        <>
          {questions.length === 0 ? (
            <div className="card p-6">
              <p className="m-0 text-[15px]">The brief is clear enough; no questions. Continue to the storyline.</p>
            </div>
          ) : (
            <ol className="list-none m-0 p-0 flex flex-col gap-4">
              {questions.map((q, i) => (
                <li key={i} className="card p-6 flex flex-col gap-3">
                  <div>
                    <p className="font-semibold text-[16px] m-0">{q.question}</p>
                    {q.why && <p className="hint text-[13px] mt-1 mb-0">{q.why}</p>}
                  </div>
                  {q.options?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((opt) => (
                        <button key={opt} type="button" onClick={() => setAnswer(i, q.answer === opt ? '' : opt)}
                          className={`text-left text-[14px] px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                            q.answer === opt
                              ? 'border-navy bg-[#EAF0F8] text-navy font-medium'
                              : 'border-border bg-white text-ink hover:border-[#CBD5E1] hover:bg-canvas'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                  <input className="field" value={q.options?.includes(q.answer) ? '' : q.answer}
                    onChange={(e) => setAnswer(i, e.target.value)}
                    placeholder={q.options?.length ? 'Or write your own answer' : 'Your answer'} />
                </li>
              ))}
            </ol>
          )}

          {error && <p className="text-red-700 text-[14px] m-0">{error}</p>}

          <div className="flex items-center justify-end gap-3 flex-wrap">
            <button type="button" onClick={handleAskAgain} disabled={busy} className="btn-ghost mr-auto">
              <RefreshCw size={15} />Ask different questions
            </button>
            {questions.length > 0 && (
              <button type="button" onClick={() => handleContinue(true)} disabled={busy} className="btn-outline">Skip</button>
            )}
            <button type="button" onClick={() => handleContinue(false)} disabled={busy} className="btn-primary">
              {busy ? 'Starting...' : 'Continue to storyline'}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
