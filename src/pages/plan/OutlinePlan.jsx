import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronUp, ChevronDown, ChevronRight, Plus, Trash2, Lock, Unlock, Pin, PinOff, X, Search, Send,
  RefreshCw, Loader2, Layout, FileText,
} from 'lucide-react';
import { generations } from '../../services/api';
import { KIND, typeLabel } from '../../components/plan/kindConfig';
import PlanSteps, { JobCard } from '../../components/plan/PlanSteps';
import { usePlanGeneration, jobRunning, jobFailed } from '../../components/plan/usePlanGeneration';

const SAVE_DELAY_MS = 700;

function newId(kind) {
  return (kind.type === 'deck' ? 's_' : 'x_') + Math.random().toString(16).slice(2, 10);
}

function SourceRow({ source, onTogglePin, onRemove }) {
  return (
    <li className="flex gap-2 items-start py-2 border-t border-border first:border-t-0">
      <FileText size={14} className="text-slate shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-navy m-0">
          p. {source.page ?? '?'}{source.heading ? ` · ${source.heading}` : ''}
        </p>
        <p className="text-[12px] text-slate m-0 leading-snug line-clamp-2">{source.preview}</p>
      </div>
      {onTogglePin && (
        <button type="button" onClick={onTogglePin} className="icon-btn shrink-0"
          title={source.pinned ? 'Pinned: kept when sources are refreshed. Click to unpin.' : 'Pin: keep this source when refreshing'}>
          {source.pinned ? <Pin size={14} className="text-cobalt" /> : <PinOff size={14} />}
        </button>
      )}
      {onRemove && (
        <button type="button" onClick={onRemove} className="icon-btn shrink-0" title="Remove source"><X size={14} /></button>
      )}
    </li>
  );
}

function ItemDetail({ kind, genId, item, index, messages, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const sources = item.sources || [];

  async function search(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const { sources: found } = await generations.findSources(genId, query.trim());
      const have = new Set(sources.map((s) => s.chunk_id));
      setResults(found.filter((s) => !have.has(s.chunk_id)));
    } catch (err) {
      setError(err.message);
    }
    setSearching(false);
  }

  async function refreshSources() {
    setRefreshing(true);
    setError(null);
    try {
      const { sources: fresh } = await generations.refreshItemSources(genId, index, item);
      onChange({ sources: fresh });
    } catch (err) {
      setError(err.message);
    }
    setRefreshing(false);
  }

  return (
    <div className="px-5 pb-4 pt-1 flex flex-col gap-3 bg-[#FAFBFC] border-t border-border">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-slate uppercase tracking-wide" htmlFor={`point-${item.id}`}>Point</label>
          <textarea id={`point-${item.id}`} className="field min-h-[64px] text-[14px]" value={item.point || ''}
            onChange={(e) => onChange({ point: e.target.value, content: null })}
            placeholder={`The one claim this ${kind.noun} makes`} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-slate uppercase tracking-wide" htmlFor={`tp-${item.id}`}>Talking points <span className="normal-case font-normal">(one per line)</span></label>
          <textarea id={`tp-${item.id}`} className="field min-h-[64px] text-[14px]" value={(item.talking_points || []).join('\n')}
            onChange={(e) => onChange({ talking_points: e.target.value.split('\n'), content: null })} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {messages?.length > 0 && (
          <label className="flex items-center gap-2 text-[13px] text-slate">
            Supports
            <select className="field py-1 text-[13px] max-w-[360px]" value={item.message_id || ''}
              onChange={(e) => onChange({ message_id: e.target.value })}>
              <option value="">No message (opening / closing)</option>
              {messages.map((m, i) => <option key={m.id} value={m.id}>{i + 1}. {m.text.slice(0, 70)}</option>)}
            </select>
          </label>
        )}
        {item.type_reason && <span className="hint text-[12px]">{typeLabel(kind, item[kind.typeKey])}: {item.type_reason}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-slate uppercase tracking-wide">Sources ({sources.length})</span>
          <button type="button" onClick={refreshSources} disabled={refreshing} className="btn-ghost text-[12px] py-1">
            {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}Find again from the point
          </button>
        </div>
        {sources.length > 0 ? (
          <ul className="list-none m-0 p-0 bg-white border border-border rounded-lg px-3">
            {sources.map((s) => (
              <SourceRow key={s.chunk_id} source={s}
                onTogglePin={() => onChange({ sources: sources.map((x) => (x.chunk_id === s.chunk_id ? { ...x, pinned: !x.pinned } : x)) })}
                onRemove={() => onChange({ sources: sources.filter((x) => x.chunk_id !== s.chunk_id) })} />
            ))}
          </ul>
        ) : (
          <p className="hint text-[12px] m-0">No sources. The {kind.noun} is written from the plan and earlier {kind.nounPlural}.</p>
        )}
        <form onSubmit={search} className="flex gap-2">
          <input className="field flex-1 text-[13px] py-1.5" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the documents for another source" />
          <button type="submit" disabled={searching || !query.trim()} className="btn-outline text-[13px] py-1.5">
            {searching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}Search
          </button>
        </form>
        {results && (
          <ul className="list-none m-0 p-0 bg-white border border-border rounded-lg px-3 max-h-[240px] overflow-y-auto">
            {results.length === 0 && <li className="hint text-[12px] py-2">Nothing new found.</li>}
            {results.map((s) => (
              <li key={s.chunk_id} className="flex items-start gap-2">
                <div className="flex-1 min-w-0"><SourceRow source={s} /></div>
                <button type="button" className="btn-outline text-[12px] py-1 px-2 mt-2 shrink-0"
                  onClick={() => {
                    onChange({ sources: [...sources, { ...s, pinned: true }] });
                    setResults(results.filter((r) => r.chunk_id !== s.chunk_id));
                  }}>
                  <Plus size={12} />Add
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-red-700 text-[12px] m-0">{error}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-semibold text-slate uppercase tracking-wide" htmlFor={`note-${item.id}`}>Note for the writer</label>
        <textarea id={`note-${item.id}`} className="field min-h-[44px] text-[14px]" value={item.note || ''}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder='e.g. "use the Keramika Ostrava example", "keep it to the three main causes"' />
      </div>
    </div>
  );
}

export default function OutlinePlan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const kind = KIND[useLocation().pathname.includes('/doc/') ? 'doc' : 'deck'];
  const [items, setItems] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [picker, setPicker] = useState(null);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const saveTimer = useRef(null);
  const pending = useRef(null);

  const { gen, setGen, expectJob } = usePlanGeneration(id, {
    onJobDone: (g) => setItems(g.outline?.[kind.listKey] || []),
    onLoad: (g) => {
      if (!jobRunning(g, 'outline') && g.outline?.[kind.listKey]) setItems((it) => it ?? g.outline[kind.listKey]);
    },
  });
  const building = jobRunning(gen, 'outline');
  const failed = jobFailed(gen, 'outline');

  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current);
    if (pending.current) {
      const outline = pending.current;
      pending.current = null;
      await generations.updateOutline(id, outline);
    }
  }, [id]);

  useEffect(() => () => { flush(); }, [flush]);

  function save(nextItems, extra = {}) {
    setItems(nextItems);
    const outline = { ...(gen.outline || {}), ...extra, [kind.listKey]: nextItems };
    setGen((g) => ({ ...g, outline }));
    pending.current = outline;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { flush().catch((err) => setError(err.message)); }, SAVE_DELAY_MS);
  }

  function updateItem(i, patch) {
    save(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }
  function move(i, dir) {
    const t = i + dir;
    if (t < 0 || t >= items.length) return;
    const a = [...items]; [a[i], a[t]] = [a[t], a[i]];
    save(a);
  }
  function remove(i) {
    save(items.filter((_, j) => j !== i));
  }
  function add() {
    const last = items[items.length - 1];
    const lastIsBookend = last && ['closing', 'summary'].includes(last[kind.typeKey]);
    const prev = items[lastIsBookend ? items.length - 2 : items.length - 1];
    const item = {
      id: newId(kind), message_id: prev?.message_id || '', title: `New ${kind.noun}`, point: '', talking_points: [],
      [kind.typeKey]: kind.defaultType, type_reason: '', sources: [], note: '', locked: false, content: null,
    };
    const a = [...items];
    a.splice(lastIsBookend ? a.length - 1 : a.length, 0, item);
    save(a);
    setExpanded((s) => new Set(s).add(item.id));
  }
  function toggle(itemId) {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(itemId)) n.delete(itemId); else n.add(itemId);
      return n;
    });
  }

  async function handleReshape(e) {
    e.preventDefault();
    if (!instruction.trim()) return;
    setError(null);
    try {
      await flush();
      await generations.createOutline(id, instruction.trim());
      setInstruction('');
      expectJob();
    } catch (err) {
      setError(err.message);
    }
  }

  async function rebuild() {
    setError(null);
    try {
      await flush();
      await generations.createOutline(id);
      expectJob();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleWrite() {
    setBusy(true);
    setError(null);
    try {
      await flush();
      navigate(`/create/${kind.type}/${id}/progress`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!gen) return <main className="max-w-[1040px] w-[92%] mx-auto py-8"><p className="hint">Loading...</p></main>;

  const messages = gen.storyline?.messages || [];
  const messageIndex = Object.fromEntries(messages.map((m, i) => [m.id, i]));
  const lockedCount = (items || []).filter((it) => it.locked).length;

  return (
    <main className="max-w-[1040px] w-[92%] mx-auto py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to={`/create/${kind.type}/${id}/storyline`} className="btn-ghost"><ArrowLeft size={18} />Storyline</Link>
      </div>
      <PlanSteps gen={gen} current="outline" kind={kind} />

      <div>
        <h1 className="font-heading text-[32px] leading-10 font-bold tracking-tight m-0">Check the outline</h1>
        <p className="text-[15px] text-slate mt-1.5 mb-0">
          Each {kind.noun} shows the point it makes and the sources it will use. Open one to edit it, pin sources, or leave a note for the writer.
          Lock {kind.nounPlural} to keep them when the outline is rebuilt.
        </p>
      </div>

      {(building || failed) && (
        <JobCard running={building} error={failed}
          runningText="Building the outline..."
          detail={`Planning each ${kind.noun} from the storyline and finding its sources. This takes 30-90 seconds.`}
          onRetry={rebuild} />
      )}

      {!building && !failed && !items?.length && (
        <div className="card p-8 flex flex-col items-center gap-3 text-center">
          <p className="m-0 text-[15px]">No outline yet.</p>
          <button type="button" onClick={rebuild} className="btn-primary">Build the outline</button>
        </div>
      )}

      {!building && items?.length > 0 && (
        <>
          {gen.outline?.stale && (
            <div className="card p-4 flex items-center gap-3 flex-wrap border-[#F59E0B]/40 bg-[#FFFBEB]">
              <span className="flex-1 text-[14px]">The storyline changed after this outline was built.</span>
              <button type="button" onClick={() => save(items, { stale: false })} className="btn-outline text-[13px]">Keep this outline</button>
              <button type="button" onClick={rebuild} className="btn-primary text-[13px]">
                Rebuild{lockedCount ? ` (keeps ${lockedCount} locked)` : ''}
              </button>
            </div>
          )}

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <h2 className="font-heading text-lg font-semibold m-0">{items.length} {kind.nounPlural}</h2>
              <button type="button" onClick={add} className="btn-outline h-9 text-sm"><Plus size={15} />Add {kind.noun}</button>
            </div>
            <ol className="list-none m-0 p-0">
              {items.map((it, i) => {
                const prev = items[i - 1];
                const newGroup = i === 0 || prev.message_id !== it.message_id;
                const msgIdx = messageIndex[it.message_id];
                const open = expanded.has(it.id);
                return (
                  <li key={it.id || i}>
                    {newGroup && (
                      <div className="px-5 py-2 bg-[#F5F8FC] border-t border-border text-[12px] text-navy flex gap-2">
                        {msgIdx != null
                          ? <><span className="font-semibold shrink-0">Message {msgIdx + 1}</span><span className="text-slate">{messages[msgIdx].text}</span></>
                          : <span className="font-semibold">{i === 0 ? 'Opening' : 'Closing'}</span>}
                      </div>
                    )}
                    <div className="border-t border-border">
                      <div className="flex items-center gap-2 px-4 py-2">
                        <button type="button" onClick={() => toggle(it.id)} className="icon-btn" aria-label={open ? 'Collapse' : 'Expand'}>
                          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        <span className="w-5 text-sm font-semibold text-slate">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <input className="w-full bg-transparent border-0 outline-none text-[15px] font-semibold rounded-sm px-1 py-0.5 focus:bg-canvas"
                            value={it.title} onChange={(e) => updateItem(i, { title: e.target.value })} aria-label="Title" />
                          {!open && it.point && <p className="text-[13px] text-slate m-0 px-1 truncate">{it.point}</p>}
                        </div>
                        <button type="button" onClick={() => setPicker(picker === it.id ? null : it.id)}
                          className="chip-muted cursor-pointer hover:bg-[#E2E8F0] transition-colors text-[12px] flex items-center gap-1 shrink-0">
                          <Layout size={12} />{typeLabel(kind, it[kind.typeKey])}
                        </button>
                        <span className="chip-muted text-[12px] shrink-0 hidden sm:inline-flex" title="Sources">
                          <FileText size={12} />{(it.sources || []).length}
                        </span>
                        <button type="button" onClick={() => updateItem(i, { locked: !it.locked })} className="icon-btn shrink-0"
                          title={it.locked ? 'Locked: kept when the outline is rebuilt' : 'Lock to keep when rebuilding'}>
                          {it.locked ? <Lock size={15} className="text-cobalt" /> : <Unlock size={15} />}
                        </button>
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="icon-btn shrink-0" aria-label="Move up"><ChevronUp size={16} /></button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="icon-btn shrink-0" aria-label="Move down"><ChevronDown size={16} /></button>
                        <button type="button" onClick={() => remove(i)} className="icon-btn shrink-0" aria-label={`Remove ${kind.noun}`}><Trash2 size={15} /></button>
                      </div>

                      {picker === it.id && (
                        <div className="px-5 py-3 bg-canvas border-t border-border">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                            {kind.options.map((opt) => (
                              <button key={opt.key} type="button"
                                onClick={() => { updateItem(i, { [kind.typeKey]: opt.key, content: null }); setPicker(null); }}
                                className={`option text-left ${it[kind.typeKey] === opt.key ? 'option-selected' : ''}`}>
                                <div>
                                  <span className="text-[13px] font-semibold text-ink block">{opt.label}</span>
                                  <span className="text-[12px] text-slate block mt-0.5">{opt.description}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {open && (
                        <ItemDetail kind={kind} genId={id} item={it} index={i} messages={messages}
                          onChange={(patch) => updateItem(i, patch)} />
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <form onSubmit={handleReshape} className="card p-4 flex gap-2 items-center">
            <input className="field flex-1" value={instruction} onChange={(e) => setInstruction(e.target.value)}
              placeholder={`Reshape the outline, e.g. "merge 3 and 4", "add a ${kind.noun} on escalation", "use a diagram for the inspection flow"`} />
            <button type="submit" disabled={!instruction.trim()} className="btn-primary px-3"><Send size={15} />Revise</button>
          </form>

          {error && <p className="text-red-700 text-[14px] m-0">{error}</p>}

          <div className="flex items-center justify-end gap-3 flex-wrap">
            <span className="hint mr-auto">Writing takes about 30 seconds per {kind.noun}. You can leave the page while it runs.</span>
            <button type="button" onClick={handleWrite} disabled={busy || !items.length} className="btn-primary">
              {busy ? 'Starting...' : `Write the ${kind.nounPlural}`}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
