import { useEffect, useState } from 'react';
import { Check, Loader2, Undo2 } from 'lucide-react';
import { conversations, generations } from '../../services/api';

const ACTION_LABELS = { edit: 'Edit', layout: 'Change layout', add: 'Add', delete: 'Delete', move: 'Move' };
const POLL_MS = 2500;

/**
 * Deck-wide changes proposed from a chat message: tick the steps to keep and Apply; the deck changes in the panel
 * while it runs; Undo restores it. message.data: { generation_id, steps, applied?, undone? }.
 */
export default function AgentPlanCard({ conversationId, message, onUpdated, onDeckChanged }) {
  const { data } = message;
  const [keep, setKeep] = useState(() => (data.steps || []).map(() => true));
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // While applying, follow the job; the panel refreshes itself, this shows the step being done.
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(async () => {
      try {
        const { generation } = await generations.get(data.generation_id);
        if (generation.job?.state === 'running') setProgress(generation.job.progress);
        else {
          setRunning(false);
          if (generation.job?.state === 'failed') setError(generation.job.error);
          onDeckChanged();
        }
      } catch { /* next tick */ }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [running, data.generation_id, onDeckChanged]);

  async function act(action) {
    setBusy(true);
    setError(null);
    try {
      if (action === 'apply') {
        const steps = data.steps.filter((_, i) => keep[i]);
        const { message: updated } = await conversations.applyPlan(conversationId, message.id, steps);
        onUpdated(updated);
        setRunning(true);
      } else {
        const { message: updated } = await conversations.undoPlan(conversationId, message.id);
        onUpdated(updated);
        onDeckChanged();
      }
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  const steps = data.applied ? data.steps : (data.steps || []);
  const kept = keep.filter(Boolean).length;
  return (
    <div className="flex flex-col gap-2 bg-white border border-border rounded-lg p-3">
      {message.content && <p className="text-[14px] m-0">{message.content}</p>}
      {!steps.length && <p className="hint text-[13px] m-0">Nothing to change.</p>}
      <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
        {steps.map((s, i) => (
          <li key={i}>
            <label className={`flex gap-2 items-start text-[13px] ${data.applied ? '' : 'cursor-pointer'}`}>
              {!data.applied && (
                <input type="checkbox" className="mt-0.5 accent-navy" checked={keep[i]}
                  onChange={() => setKeep(keep.map((k, j) => (j === i ? !k : k)))} />
              )}
              <span>
                <span className="font-semibold text-navy">{ACTION_LABELS[s.action] || s.action}</span>
                {s.action === 'add' ? ' after ' : ' '}{s.target}
                {s.action === 'layout' && s.layout ? ` → ${s.layout.replace(/_/g, ' ')}` : ''}
                {s.action === 'move' ? ` → position ${s.position}` : ''}
                {s.instruction && <span className="block text-slate">{s.instruction}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {running && (
        <p className="text-[13px] text-cobalt flex items-center gap-1.5 m-0">
          <Loader2 size={13} className="animate-spin" />
          {progress ? `Step ${progress.done + 1} of ${progress.total}: ${progress.title}` : 'Applying…'}
        </p>
      )}
      {!running && !data.applied && steps.length > 0 && (
        <button type="button" onClick={() => act('apply')} disabled={busy || !kept} className="btn-primary text-[13px] self-start">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}Apply {kept} change{kept === 1 ? '' : 's'}
        </button>
      )}
      {!running && data.applied && !data.undone && (
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[#047857]">Applied.</span>
          <button type="button" onClick={() => act('undo')} disabled={busy} className="btn-ghost text-[13px]"><Undo2 size={14} />Undo</button>
        </div>
      )}
      {data.undone && <span className="text-[13px] text-slate">Undone.</span>}
      {error && <p className="text-[13px] text-red-700 m-0">{error}</p>}
    </div>
  );
}
