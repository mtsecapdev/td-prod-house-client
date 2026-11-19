import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, RefreshCw, Plus, BookmarkPlus, Check, AlertTriangle } from 'lucide-react';
import { assets, generations } from '../../services/api';

const POLL_MS = 3000;

/**
 * An image made in the chat. It is generated in the background: the card follows it, offers Retry if it
 * failed, and when done shows it with Download, Save to Library and (while a deck is open) Add to the slide.
 * message.data: { generation_id, target? } — with a target the image was placed on that slide when done.
 */
export default function ImageCard({ data, addLabel, onAdd, onPlaced, onShowItem }) {
  const id = data.generation_id;
  const [gen, setGen] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const wasRunning = useRef(false);

  const running = gen?.job?.state === 'running';
  // Poll until the image has settled (done or failed); a retry makes it run again.
  const settled = Boolean(gen) && !running;
  useEffect(() => {
    let live = true;
    const load = () => generations.get(id)
      .then(({ generation }) => { if (live) setGen(generation); })
      .catch((err) => { if (live) setError(err.message); });
    if (settled) return () => { live = false; };
    load();
    const t = setInterval(load, POLL_MS);
    return () => { live = false; clearInterval(t); };
  }, [id, settled]);

  // An image made for a slide is placed there by the server: refresh the open editor once it is done.
  useEffect(() => {
    if (running) wasRunning.current = true;
    else if (wasRunning.current && gen?.status === 'done') {
      wasRunning.current = false;
      if (data.target) onPlaced?.();
    }
  }, [running, gen?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function retry() {
    setError(null);
    try {
      setGen((await generations.retryImage(id)).generation);
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !gen) return <p className="text-[13px] text-slate m-0">This image was deleted.</p>;
  if (!gen) return <p className="hint text-[13px] m-0">Loading…</p>;

  const failed = gen.job?.state === 'failed' ? gen.job.error : null;
  const done = gen.status === 'done' && gen.outline?.file_path;
  const caption = gen.brief?.caption || gen.brief?.topic;
  return (
    <div className="flex flex-col gap-2 bg-white border border-border rounded-lg p-3 max-w-[520px]">
      {done ? (
        <img src={generations.imageUrl(id)} alt={caption || 'Generated image'} className="w-full rounded-md bg-canvas" />
      ) : failed ? (
        <div className="flex items-start gap-2 text-[13px] text-red-700">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span className="flex-1">{failed}</span>
          <button type="button" onClick={retry} className="btn-ghost text-[13px] text-red-700"><RefreshCw size={13} />Retry</button>
        </div>
      ) : (
        <div className="aspect-video rounded-md bg-canvas flex flex-col items-center justify-center gap-2 text-slate text-[13px]">
          <Loader2 size={20} className="animate-spin text-cobalt" />
          {gen.outline?.prompt ? 'Generating the image…' : 'Writing the image prompt…'}
        </div>
      )}
      {caption && <p className="m-0 text-[13px] text-slate italic">{caption}</p>}
      {done && (
        <div className="flex items-center gap-1 flex-wrap">
          {data.target ? (
            <span className="text-[13px] text-[#047857] flex items-center gap-1.5 mr-auto">
              <Check size={14} />Placed on {data.target.label || `slide ${data.target.index + 1}`}
              <button type="button" onClick={() => onShowItem(data.target.generation_id, data.target.index)}
                className="text-cobalt bg-transparent border-0 p-0 cursor-pointer hover:underline">Show</button>
            </span>
          ) : onAdd ? (
            <button type="button" onClick={() => onAdd({ image_id: id, caption: gen.brief?.caption || '', width: gen.outline.width, height: gen.outline.height })}
              className="btn-outline text-[13px] mr-auto"><Plus size={14} />{addLabel}</button>
          ) : <span className="mr-auto" />}
          <a href={generations.imageUrl(id)} download className="btn-ghost text-[13px] no-underline"><Download size={14} />Download</a>
          <button type="button" disabled={saved} className="btn-ghost text-[13px]"
            onClick={() => assets.save(id, caption).then(() => setSaved(true)).catch((err) => setError(err.message))}>
            {saved ? <><Check size={14} />Saved</> : <><BookmarkPlus size={14} />Save to Library</>}
          </button>
        </div>
      )}
      {error && gen && <p className="m-0 text-[13px] text-red-700">{error}</p>}
    </div>
  );
}
