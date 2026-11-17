import { Link } from 'react-router-dom';
import { Check, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';

const STEPS = [
  { key: 'brief', label: 'Brief' },
  { key: 'clarify', label: 'Questions' },
  { key: 'storyline', label: 'Storyline' },
  { key: 'outline', label: 'Outline' },
  { key: 'progress', label: 'Write' },
  { key: 'review', label: 'Review' },
];

function reachable(gen, key, listKey) {
  if (!gen) return false;
  switch (key) {
    case 'clarify': return true;
    case 'storyline': return Boolean(gen.storyline?.messages?.length);
    case 'outline': return Boolean(gen.outline?.[listKey]?.length);
    case 'progress': return ['writing', 'generating'].includes(gen.status);
    case 'review': return gen.status === 'done';
    default: return false;
  }
}

/** The six stages of planning and writing, with links to the ones already reached. */
export default function PlanSteps({ gen, current, kind }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <nav aria-label="Progress" className="w-full overflow-x-auto">
      <ol className="list-none m-0 p-0 flex items-center gap-1 min-w-max">
        {STEPS.map((s, i) => {
          const isCurrent = s.key === current;
          const done = i < currentIdx;
          const canGo = !isCurrent && reachable(gen, s.key, kind.listKey);
          const body = (
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] ${
              isCurrent ? 'bg-navy text-white font-semibold' : done ? 'text-navy' : 'text-slate'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                isCurrent ? 'bg-white/20' : done ? 'bg-[#E0E9F5]' : 'bg-[#EEF1F5]'}`}>
                {done ? <Check size={12} /> : i + 1}
              </span>
              {s.label}
            </span>
          );
          return (
            <li key={s.key} className="flex items-center gap-1">
              {canGo
                ? <Link to={`/create/${kind.type}/${gen.id}/${s.key}`} className="no-underline hover:opacity-80">{body}</Link>
                : body}
              {i < STEPS.length - 1 && <span className="w-4 h-px bg-border" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** A full-width card shown while a planning job runs, or after it failed. */
export function JobCard({ running, error, runningText, detail, onRetry }) {
  if (running) {
    return (
      <div className="card p-10 flex flex-col items-center gap-3 text-center">
        <Loader2 size={32} className="text-cobalt animate-spin" />
        <p className="font-medium text-[16px] m-0">{runningText}</p>
        {detail && <p className="hint text-[13px] m-0 max-w-md">{detail}</p>}
      </div>
    );
  }
  if (error) {
    return (
      <div className="card p-8 flex flex-col items-center gap-3 text-center">
        <AlertTriangle size={28} className="text-red-600" />
        <p className="text-red-700 m-0 max-w-lg">{error}</p>
        {onRetry && <button type="button" onClick={onRetry} className="btn-primary"><RotateCcw size={15} />Try again</button>}
      </div>
    );
  }
  return null;
}
