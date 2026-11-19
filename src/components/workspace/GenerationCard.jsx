import { useEffect } from 'react';
import { FileSliders, FileText, Download, PanelRightOpen, Loader2 } from 'lucide-react';
import { generations } from '../../services/api';
import { KIND } from '../plan/kindConfig';
import { usePlanGeneration, jobRunning } from '../plan/usePlanGeneration';
import PlanCard from './PlanCard';

/**
 * A deck/document made in this conversation. While it is being planned or the plan is open it shows the plan;
 * once written it is a compact card with Open (in the panel beside the chat) and Download.
 */
export default function GenerationCard({ generationId, type, open, onOpen }) {
  const kind = KIND[type];
  const { gen, error, refresh } = usePlanGeneration(generationId);
  // While it is open beside the chat and not finished, follow the writing (it runs from the panel).
  const following = open && gen && gen.status !== 'done';
  useEffect(() => {
    if (!following) return undefined;
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [following, refresh]);
  if (error) return <p className="text-[13px] text-slate m-0">This {kind.product} was deleted.</p>;
  if (!gen) return <p className="hint text-[13px] m-0">Loading…</p>;

  const planning = jobRunning(gen, 'outline') || gen.status === 'pending' || gen.status === 'outline_ready';
  if (planning) return <PlanCard id={generationId} type={type} onOpen={onOpen} />;

  const items = gen.outline?.[kind.listKey] || [];
  const written = items.filter((it) => it.content).length;
  const writing = written < items.length;
  const Icon = type === 'deck' ? FileSliders : FileText;
  return (
    <div className={`flex items-center gap-3 bg-white border rounded-lg px-3 py-2.5 ${open ? 'border-cobalt ring-1 ring-cobalt/30' : 'border-border'}`}>
      <span className="w-9 h-9 rounded-md bg-[#EAF0F8] text-navy flex items-center justify-center shrink-0"><Icon size={18} /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-semibold truncate">{gen.name}</span>
        <span className="block text-[12px] text-slate">
          {kind.product[0].toUpperCase() + kind.product.slice(1)} · {items.length} {kind.nounPlural}
          {writing && <> · {written} written{open && <Loader2 size={11} className="inline animate-spin ml-1 align-[-1px]" />}</>}
        </span>
      </span>
      {!open && <button type="button" onClick={onOpen} className="btn-outline text-[13px]"><PanelRightOpen size={14} />Open</button>}
      {!writing && (
        <a href={generations.downloadUrl(generationId)} download className="btn-ghost text-[13px] no-underline" title={`Download .${type === 'deck' ? 'pptx' : 'docx'}`}>
          <Download size={14} />{type === 'deck' ? 'PPTX' : 'DOCX'}
        </a>
      )}
    </div>
  );
}
