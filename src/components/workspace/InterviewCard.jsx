import { useState } from 'react';
import { Check, FastForward, Pencil, Sparkles, X } from 'lucide-react';
import AnswerText from './AnswerText';

/**
 * One question of the planning interview (before a deck/document is planned). While it is the current question
 * it offers quick answers (or, for what to cover, a checklist), "Just make it" and Cancel; afterwards it shows
 * only what was asked.
 */
export function InterviewQuestion({ message, active, onAnswer, onAction }) {
  const { suggestions = [], options, multi, step, steps } = message.data || {};
  const [picked, setPicked] = useState([]);

  const toggle = (opt) => setPicked((p) => {
    if (opt === options[0]) return p.includes(opt) ? [] : [opt]; // "Everything" stands alone
    const rest = p.filter((x) => x !== options[0]);
    return rest.includes(opt) ? rest.filter((x) => x !== opt) : [...rest, opt];
  });

  return (
    <div className={`max-w-[92%] rounded-xl rounded-bl-sm px-4 py-3 bg-white border text-[14px] leading-relaxed ${active ? 'border-[#BFD3F5] shadow-sm' : 'border-border'}`}>
      {active && step && <p className="m-0 mb-1 text-[11px] font-semibold uppercase tracking-wide text-cobalt">Question {step} of {steps}</p>}
      <AnswerText text={message.content} />
      {active && multi && options?.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="max-h-[260px] overflow-y-auto flex flex-col gap-1 pr-1">
            {options.map((opt, i) => (
              <label key={opt} className={`flex items-start gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-canvas ${i === 0 ? 'font-semibold' : ''}`}>
                <input type="checkbox" className="mt-1 accent-[var(--color-cobalt)]" checked={picked.includes(opt)} onChange={() => toggle(opt)} />
                <span className="text-[14px] text-ink">{opt}</span>
              </label>
            ))}
          </div>
          <button type="button" className="btn-primary self-start h-9 text-[13px]" disabled={!picked.length}
            onClick={() => onAnswer(picked.join('; '), picked)}>
            <Check size={14} />Use {picked.length > 1 ? `these ${picked.length}` : 'this'}
          </button>
          <p className="m-0 text-[12px] text-slate">Or type the topics you want in the box below.</p>
        </div>
      )}
      {active && !multi && suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => onAnswer(s, s)}
              className="px-3 py-1.5 rounded-full border border-[#C7D3E3] bg-white text-[13px] text-ink cursor-pointer hover:border-cobalt hover:text-cobalt">
              {s}
            </button>
          ))}
        </div>
      )}
      {active && (
        <div className="mt-3 pt-2.5 border-t border-border flex items-center gap-4 text-[13px]">
          <button type="button" onClick={() => onAction('skip')} title="Skip the remaining questions; the summary still lets you check everything"
            className="flex items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer text-cobalt hover:underline">
            <FastForward size={14} />Just make it
          </button>
          <button type="button" onClick={() => onAction('cancel')}
            className="flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer text-slate hover:text-ink">
            <X size={14} />Cancel
          </button>
        </div>
      )}
    </div>
  );
}

/** The interview's summary: every answer with Change, then Make the plan. */
export function PlanSummary({ message, active, onAction }) {
  const rows = message.data?.rows || [];
  return (
    <div className={`max-w-[92%] w-full rounded-xl bg-white border overflow-hidden ${active ? 'border-[#BFD3F5] shadow-sm' : 'border-border'}`}>
      <div className="px-4 pt-3 pb-2 text-[14px] leading-relaxed"><AnswerText text={message.content} /></div>
      <dl className="m-0 px-4 pb-2 flex flex-col">
        {rows.map((r) => (
          <div key={r.slot} className="flex items-start gap-3 py-2 border-t border-border">
            <dt className="w-[64px] shrink-0 text-[12px] font-semibold uppercase tracking-wide text-slate pt-0.5">{r.label}</dt>
            <dd className="m-0 flex-1 min-w-0 text-[14px] text-ink">
              {r.value}
              {r.assumed && <span className="ml-2 text-[12px] text-amber-700">my best guess</span>}
            </dd>
            {active && (
              <button type="button" onClick={() => onAction('change', r.slot)} aria-label={`Change ${r.label}`}
                className="shrink-0 flex items-center gap-1 text-[12px] text-slate bg-transparent border-0 p-0 cursor-pointer hover:text-cobalt">
                <Pencil size={12} />Change
              </button>
            )}
          </div>
        ))}
      </dl>
      {active && (
        <div className="px-4 py-3 bg-canvas border-t border-border flex items-center gap-3">
          <button type="button" className="btn-primary h-10 bg-cobalt hover:bg-cobalt-hover" onClick={() => onAction('plan')}>
            <Sparkles size={15} />Make the plan
          </button>
          <button type="button" className="btn-ghost text-[13px]" onClick={() => onAction('cancel')}>Cancel</button>
        </div>
      )}
    </div>
  );
}
