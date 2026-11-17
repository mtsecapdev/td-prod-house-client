import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, ChevronUp, ChevronDown, Plus, X, Send } from 'lucide-react';
import { generations } from '../../services/api';
import { KIND } from '../../components/plan/kindConfig';
import PlanSteps, { JobCard } from '../../components/plan/PlanSteps';
import { usePlanGeneration, jobRunning, jobFailed } from '../../components/plan/usePlanGeneration';

const SAVE_DELAY_MS = 700;

export default function Storyline() {
  const { id } = useParams();
  const navigate = useNavigate();
  const kind = KIND[useLocation().pathname.includes('/doc/') ? 'doc' : 'deck'];
  const [story, setStory] = useState(null);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [edited, setEdited] = useState(false);
  const saveTimer = useRef(null);
  const pending = useRef(null);

  // Replace the local copy whenever a storyline job finishes (first build or a chat revision).
  const { gen, expectJob } = usePlanGeneration(id, {
    onJobDone: (g) => setStory(g.storyline || null),
    onLoad: (g) => { if (!jobRunning(g, 'storyline') && g.storyline) setStory((s) => s ?? g.storyline); },
  });
  const writing = jobRunning(gen, 'storyline');
  const failed = jobFailed(gen, 'storyline');

  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (pending.current) {
      const s = pending.current;
      pending.current = null;
      await generations.updateStoryline(id, s);
    }
  }, [id]);

  useEffect(() => () => { flush(); }, [flush]);

  function update(next) {
    setStory(next);
    setEdited(true);
    pending.current = next;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { flush().catch((err) => setError(err.message)); }, SAVE_DELAY_MS);
  }

  function updateMessage(i, text) {
    update({ ...story, messages: story.messages.map((m, j) => (j === i ? { ...m, text } : m)) });
  }
  function moveMessage(i, dir) {
    const t = i + dir;
    if (t < 0 || t >= story.messages.length) return;
    const a = [...story.messages]; [a[i], a[t]] = [a[t], a[i]];
    update({ ...story, messages: a });
  }
  function removeMessage(i) {
    update({ ...story, messages: story.messages.filter((_, j) => j !== i) });
  }
  function addMessage() {
    const used = new Set(story.messages.map((m) => m.id));
    let n = story.messages.length + 1;
    while (used.has(`m${n}`)) n++;
    update({ ...story, messages: [...story.messages, { id: `m${n}`, text: '', section_ids: [], sections: [] }] });
  }
  function removeOutOfScope(i) {
    update({ ...story, out_of_scope: story.out_of_scope.filter((_, j) => j !== i) });
  }

  async function handleRevise(e) {
    e.preventDefault();
    if (!instruction.trim()) return;
    setError(null);
    try {
      await flush();
      await generations.createStoryline(id, instruction.trim());
      setInstruction('');
      expectJob();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRetry() {
    setError(null);
    try {
      await generations.createStoryline(id);
      expectJob();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleContinue(rebuild) {
    setBusy(true);
    setError(null);
    try {
      await flush();
      if (rebuild) await generations.createOutline(id);
      navigate(`/create/${kind.type}/${id}/outline`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!gen) return <main className="max-w-[960px] w-[90%] mx-auto py-8"><p className="hint">Loading...</p></main>;

  const hasOutline = Boolean(gen.outline?.[kind.listKey]?.length && gen.outline[kind.listKey][0]?.point !== undefined);
  const outlineStale = hasOutline && (gen.outline.stale || edited);

  return (
    <main className="max-w-[960px] w-[90%] mx-auto py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to={`/create/${kind.type}/${id}/clarify`} className="btn-ghost"><ArrowLeft size={18} />Questions</Link>
      </div>
      <PlanSteps gen={gen} current="storyline" kind={kind} />

      <div>
        <h1 className="font-heading text-[32px] leading-10 font-bold tracking-tight m-0">Agree the storyline</h1>
        <p className="text-[15px] text-slate mt-1.5 mb-0">
          What the {kind.product} argues, in order. Edit anything, or ask for changes below. Nothing is written until the outline.
        </p>
      </div>

      {(writing || failed) && (
        <JobCard running={writing} error={failed}
          runningText="Drafting the storyline..."
          detail="Reading the summaries of every section of your documents. This takes 20-60 seconds."
          onRetry={handleRetry} />
      )}

      {!story && !writing && !failed && (
        <div className="card p-8 flex flex-col items-center gap-3 text-center">
          <p className="m-0 text-[15px]">No storyline yet.</p>
          <button type="button" onClick={handleRetry} className="btn-primary">Draft the storyline</button>
        </div>
      )}

      {story && !writing && (
        <>
          <section className="card p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="thesis" className="label">Thesis</label>
              <span className="hint -mt-1 text-[13px]">The one sentence the {kind.audienceWord} should leave with.</span>
              <textarea id="thesis" className="field min-h-[64px] text-[16px] font-medium" value={story.thesis}
                onChange={(e) => update({ ...story, thesis: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="arc" className="label">Shape</label>
              <input id="arc" className="field" value={story.arc}
                onChange={(e) => update({ ...story, arc: e.target.value })} />
            </div>
          </section>

          <section className="card">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <h2 className="font-heading text-lg font-semibold m-0">Key messages</h2>
              <button type="button" onClick={addMessage} className="btn-outline h-9 text-sm"><Plus size={15} />Add message</button>
            </div>
            <ol className="list-none m-0 p-0">
              {story.messages.map((m, i) => (
                <li key={m.id} className="border-t border-border px-5 py-3 flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-[#EAF0F8] text-navy text-[12px] font-semibold flex items-center justify-center shrink-0 mt-1.5">{i + 1}</span>
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <textarea className="field min-h-[44px] text-[15px]" value={m.text} rows={2}
                      onChange={(e) => updateMessage(i, e.target.value)} placeholder="A claim this part makes" />
                    {m.sections?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {m.sections.map((s) => (
                          <span key={s.id} className="chip-muted text-[12px]">{s.heading}{s.page != null ? ` · p. ${s.page}` : ''}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col shrink-0">
                    <button type="button" onClick={() => moveMessage(i, -1)} disabled={i === 0} className="icon-btn" aria-label="Move up"><ChevronUp size={16} /></button>
                    <button type="button" onClick={() => moveMessage(i, 1)} disabled={i === story.messages.length - 1} className="icon-btn" aria-label="Move down"><ChevronDown size={16} /></button>
                  </div>
                  <button type="button" onClick={() => removeMessage(i)} className="icon-btn shrink-0" aria-label="Remove message"><X size={16} /></button>
                </li>
              ))}
            </ol>
          </section>

          {story.out_of_scope?.length > 0 && (
            <section className="card p-5 flex flex-col gap-2">
              <h2 className="font-heading text-[16px] font-semibold m-0">Left out on purpose</h2>
              <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
                {story.out_of_scope.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 text-[14px]">
                    <span className="flex-1"><strong className="font-semibold">{o.section}</strong>{o.reason ? <span className="text-slate"> — {o.reason}</span> : null}</span>
                    <button type="button" onClick={() => removeOutOfScope(i)} className="icon-btn" title="Remove from this list"><X size={14} /></button>
                  </li>
                ))}
              </ul>
              <p className="hint text-[12px] m-0">To bring one back in, ask below, e.g. "include the financial results".</p>
            </section>
          )}

          <form onSubmit={handleRevise} className="card p-4 flex gap-2 items-center">
            <input className="field flex-1" value={instruction} onChange={(e) => setInstruction(e.target.value)}
              placeholder='Ask for changes, e.g. "less on finance, more on quality" or "end with what buyers should do"' />
            <button type="submit" disabled={!instruction.trim()} className="btn-primary px-3"><Send size={15} />Revise</button>
          </form>

          {error && <p className="text-red-700 text-[14px] m-0">{error}</p>}

          <div className="flex items-center justify-end gap-3 flex-wrap">
            {hasOutline && outlineStale && (
              <button type="button" onClick={() => handleContinue(false)} disabled={busy} className="btn-outline">Keep current outline</button>
            )}
            <button type="button" onClick={() => handleContinue(!hasOutline || outlineStale)}
              disabled={busy || !story.messages.some((m) => m.text.trim())} className="btn-primary">
              {busy ? 'Starting...' : !hasOutline ? 'Build the outline' : outlineStale ? 'Rebuild the outline' : 'Continue to outline'}
            </button>
          </div>
          {hasOutline && outlineStale && (
            <p className="hint text-[13px] text-right -mt-3 m-0">Rebuilding keeps {kind.nounPlural} you locked in the outline.</p>
          )}
        </>
      )}
    </main>
  );
}
