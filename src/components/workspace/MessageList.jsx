import { AlertTriangle, CheckCircle2, FileSliders, FileText, Image, Loader2, PencilLine } from 'lucide-react';
import AnswerFigures from '../AnswerFigures';
import AnswerText from './AnswerText';
import GenerationCard from './GenerationCard';
import AgentPlanCard from './AgentPlanCard';
import ImageCard from './ImageCard';

const PHASES = {
  rewriting: 'Understanding the question…',
  searching: 'Searching your documents…',
  generating: 'Writing the answer…',
  editing: 'Rewriting…',
  writing: 'Writing the new one…',
  planning: 'Planning the changes…',
  skill: 'Reading the conversation…',
  imaging: 'Planning the image…',
};
const SKILL_TAGS = {
  deck: [FileSliders, 'Slide deck'],
  doc: [FileText, 'Training document'],
  image: [Image, 'Image'],
};
const NOUN = { deck: 'slide', doc: 'section' };

/** What a message sent while editing was aimed at, e.g. "Slide 3" or "Whole deck". */
function targetLabel(target, types) {
  const type = types.get(target.generation_id) || 'deck';
  const noun = NOUN[type];
  if (target.after !== undefined && target.after !== null) return `New ${noun} after ${target.after + 1}`;
  if (target.index !== undefined && target.index !== null) return `${noun[0].toUpperCase() + noun.slice(1)} ${target.index + 1}`;
  return type === 'deck' ? 'Whole deck' : 'Whole document';
}

/**
 * The conversation: questions and answers, the decks/documents made here (plans, then results), changes made to
 * them, and deck-wide proposals. pending: { content, phase } while a reply is on its way.
 */
export default function MessageList({
  conversationId, messages, pending, openGenerationId, addLabel, onAddPicture,
  onOpenGeneration, onShowItem, onMessageUpdated, onDeckChanged,
}) {
  // Which generation is a deck and which a document, for labels on edits.
  const types = new Map(messages.filter((m) => m.kind === 'generation').map((m) => [m.data.generation_id, m.data.type]));

  return (
    <div className="flex flex-col gap-4">
      {messages.map((m) => {
        if (m.role === 'user') {
          const target = m.data?.target;
          const skill = m.data?.skill;
          return (
            <div key={m.id} className="flex flex-col items-end gap-1">
              {(target || skill) && (
                <span className="text-[11px] text-slate flex items-center gap-1">
                  {skill && SKILL_TAGS[skill]
                    ? (() => { const [Icon, label] = SKILL_TAGS[skill]; return <><Icon size={11} />{label}</>; })()
                    : <><PencilLine size={11} />{targetLabel(target, types)}</>}
                </span>
              )}
              <div className="max-w-[85%] rounded-xl rounded-br-sm px-4 py-2.5 bg-navy text-white text-[14px] leading-relaxed whitespace-pre-wrap">
                {m.content}
              </div>
            </div>
          );
        }
        if (m.kind === 'generation') {
          return (
            <GenerationCard key={m.id} generationId={m.data.generation_id} type={m.data.type}
              open={openGenerationId === m.data.generation_id}
              onOpen={() => onOpenGeneration(m.data.generation_id)} />
          );
        }
        if (m.kind === 'image') {
          return (
            <ImageCard key={m.id} data={m.data} addLabel={addLabel} onAdd={onAddPicture}
              onPlaced={onDeckChanged} onShowItem={onShowItem} />
          );
        }
        if (m.kind === 'agent_plan') {
          return (
            <AgentPlanCard key={m.id} conversationId={conversationId} message={m}
              onUpdated={onMessageUpdated} onDeckChanged={onDeckChanged} />
          );
        }
        if (m.kind === 'edit') {
          return (
            <div key={m.id} className="flex items-center gap-2 text-[13px] text-[#047857]">
              <CheckCircle2 size={14} />{m.content}
              {m.data?.index !== undefined && (
                <button type="button" onClick={() => onShowItem(m.data.generation_id, m.data.index)}
                  className="text-cobalt bg-transparent border-0 p-0 cursor-pointer hover:underline">Show</button>
              )}
            </div>
          );
        }
        if (m.kind === 'error') {
          return (
            <div key={m.id} className="max-w-[85%] rounded-xl px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 text-[14px] flex gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />{m.content}
            </div>
          );
        }
        return (
          <div key={m.id} className="max-w-[92%] rounded-xl rounded-bl-sm px-4 py-3 bg-white border border-border text-[14px] leading-relaxed">
            <AnswerText text={m.content} />
            <AnswerFigures figures={m.data?.figures} addLabel={addLabel} onAdd={onAddPicture} />
            {m.data?.grounded === false && (
              <p className="mt-2 mb-0 text-[12px] text-amber-700 flex items-center gap-1">
                <AlertTriangle size={12} />Not found in the selected documents; this may rely on general knowledge.
              </p>
            )}
          </div>
        );
      })}

      {pending && (
        <>
          {pending.content && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-xl rounded-br-sm px-4 py-2.5 bg-navy/80 text-white text-[14px] leading-relaxed whitespace-pre-wrap">
                {pending.content}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate text-[14px]">
            <Loader2 size={16} className="animate-spin" />{PHASES[pending.phase] || 'Thinking…'}
          </div>
        </>
      )}
    </div>
  );
}
