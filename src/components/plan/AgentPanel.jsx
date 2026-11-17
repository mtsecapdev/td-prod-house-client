import { useEffect, useState } from 'react';
import { Loader2, Sparkles, Undo2, Check } from 'lucide-react';
import { generations } from '../../services/api';
import { KIND } from './kindConfig';

const POLL_MS = 2500;
const ACTION_LABELS = { edit: 'Edit', layout: 'Change layout', add: 'Add', delete: 'Delete', move: 'Move' };

/**
 * Deck-wide agent (Gamma-style): ask for a change across the deck, review the proposed steps, apply them and
 * watch the items change, then undo the whole change if needed.
 */
export default function AgentPanel({ type, genId, gen, setGen }) {
  const kind = KIND[type];
  const [instruction, setInstruction] = useState('');
  const [plan, setPlan] = useState(null); // { summary, steps: [{ ...step, keep }] }
  const [phase, setPhase] = useState('idle'); // idle | planning | review | applying | done
  const [error, setError] = useState(null);

  const applying = gen?.job?.kind === 'agent' && gen.job.state === 'running';
  const progress = applying ? gen.job.progress : null;

  // While a change is being applied (also after a reload), refresh the deck so items change in place.
  useEffect(() => {
    if (!applying) return undefined;
    const t = setInterval(async () => {
      try {
        const { generation } = await generations.get(genId);
        setGen(generation);
        if (!generation.job) setPhase('done');
        else if (generation.job.state === 'failed') { setError(generation.job.error); setPhase('idle'); }
      } catch { /* next tick */ }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [applying, genId, setGen]);

  async function propose(e) {
    e.preventDefault();
    if (!instruction.trim()) return;
    setPhase('planning');
    setError(null);
    try {
      const result = await generations.agentPlan(genId, instruction.trim());
      setPlan({ ...result, steps: result.steps.map((s) => ({ ...s, keep: true })) });
      setPhase('review');
    } catch (err) {
      setError(err.message);
      setPhase('idle');
    }
  }

  async function apply() {
    setError(null);
    try {
      const { generation } = await generations.agentApply(genId, plan.steps.filter((s) => s.keep));
      setGen(generation);
      setPhase('applying');
    } catch (err) {
      setError(err.message);
    }
  }

  async function undo() {
    setError(null);
    try {
      const { generation } = await generations.agentUndo(genId);
      setGen(generation);
      setPhase('idle');
      setPlan(null);
    } catch (err) {
      setError(err.message);
    }
  }

  const kept = plan?.steps.filter((s) => s.keep).length || 0;

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
      <p className="hint text-[12px] m-0">
        Ask for a change across the whole {kind.product}. You will see the planned steps before anything changes.
      </p>
      <form onSubmit={propose} className="flex flex-col gap-2">
        <textarea className="field text-[13px] min-h-[64px]" value={instruction} onChange={(e) => setInstruction(e.target.value)}
          disabled={phase === 'planning' || applying}
          placeholder={`e.g. "make the tone friendlier", "add a ${kind.noun} on escalation after ${kind.noun} 4", "turn text-heavy ${kind.nounPlural} into visuals"`} />
        <button type="submit" disabled={!instruction.trim() || phase === 'planning' || applying} className="btn-primary text-[13px] py-1.5 self-start">
          {phase === 'planning' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {phase === 'planning' ? 'Planning…' : 'Plan changes'}
        </button>
      </form>

      {phase === 'review' && plan && (
        <div className="flex flex-col gap-2 border border-border rounded-lg p-2.5">
          <p className="text-[13px] m-0">{plan.summary}</p>
          {plan.steps.length === 0 && <p className="hint text-[12px] m-0">Nothing to change.</p>}
          <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
            {plan.steps.map((s, i) => (
              <li key={i}>
                <label className="flex gap-2 items-start text-[12px] cursor-pointer">
                  <input type="checkbox" className="mt-0.5 accent-navy" checked={s.keep}
                    onChange={() => setPlan({ ...plan, steps: plan.steps.map((x, j) => (j === i ? { ...x, keep: !x.keep } : x)) })} />
                  <span>
                    <span className="font-semibold text-navy">{ACTION_LABELS[s.action]}</span>
                    {s.action === 'add' ? ' after ' : ' '}{s.target}
                    {s.action === 'layout' && s.layout ? ` → ${kind.options.find((o) => o.key === s.layout)?.label || s.layout}` : ''}
                    {s.action === 'move' ? ` → position ${s.position}` : ''}
                    {s.instruction && <span className="block text-slate">{s.instruction}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button type="button" onClick={apply} disabled={!kept} className="btn-primary text-[12px] py-1">
              <Check size={13} />Apply {kept} step{kept === 1 ? '' : 's'}
            </button>
            <button type="button" onClick={() => { setPlan(null); setPhase('idle'); }} className="btn-ghost text-[12px] py-1">Cancel</button>
          </div>
        </div>
      )}

      {applying && (
        <p className="text-[12px] text-cobalt flex items-center gap-1.5 m-0">
          <Loader2 size={13} className="animate-spin" />
          {progress ? `Step ${progress.done + 1} of ${progress.total}: ${progress.title}` : 'Applying…'}
        </p>
      )}

      {!applying && gen?.settings?.agent_undo && (
        <div className="flex items-center gap-2">
          {phase === 'done' && <span className="text-[12px] text-[#047857]">Changes applied.</span>}
          <button type="button" onClick={undo} className="btn-outline text-[12px] py-1">
            <Undo2 size={13} />Undo the last deck-wide change
          </button>
        </div>
      )}
      {error && <p className="text-[12px] text-red-700 m-0">{error}</p>}
    </div>
  );
}
