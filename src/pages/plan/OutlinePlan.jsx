import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronUp, ChevronDown, Plus, Trash2, X, Search, RefreshCw, Loader2, Layout, FileText, Sparkles,
} from 'lucide-react';
import { generations } from '../../services/api';
import { KIND, TEXT_AMOUNTS, typeLabel } from '../../components/plan/kindConfig';
import FigureImage from '../../components/figures/FigureImage';
import JobCard from '../../components/plan/JobCard';
import { usePlanGeneration, jobRunning, jobFailed } from '../../components/plan/usePlanGeneration';

const SAVE_DELAY_MS = 700;

function newId(kind) {
  return (kind.type === 'deck' ? 's_' : 'x_') + Math.random().toString(16).slice(2, 10);
}

// Debounced saver: queue(value) saves after a pause; flush() saves now.
function useDebouncedSave(save) {
  const timer = useRef(null);
  const pending = useRef(null);
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (pending.current === null) return;
    const value = pending.current;
    pending.current = null;
    await save(value);
  }, [save]);
  const queue = useCallback((value, onError) => {
    pending.current = value;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { flush().catch(onError); }, SAVE_DELAY_MS);
  }, [flush]);
  useEffect(() => () => { flush(); }, [flush]);
  return { queue, flush };
}

function Sources({ kind, genId, index, item, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const sources = item.sources || [];

  async function search(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy('search');
    setError(null);
    try {
      const { sources: found } = await generations.findSources(genId, query.trim());
      const have = new Set(sources.map((s) => s.chunk_id));
      setResults(found.filter((s) => !have.has(s.chunk_id)));
    } catch (err) {
      setError(err.message);
    }
    setBusy(null);
  }

  async function findAgain() {
    setBusy('refresh');
    setError(null);
    try {
      const { sources: fresh } = await generations.refreshItemSources(genId, index, item);
      onChange({ sources: fresh });
    } catch (err) {
      setError(err.message);
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      {sources.length > 0 ? (
        <ul className="list-none m-0 p-0 bg-[#FAFBFC] border border-border rounded-lg px-3">
          {sources.map((s) => (
            <li key={s.chunk_id} className="flex gap-2 items-start py-2 border-t border-border first:border-t-0">
              <FileText size={13} className="text-slate shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-navy m-0">p. {s.page ?? '?'}{s.heading ? ` · ${s.heading}` : ''}</p>
                <p className="text-[12px] text-slate m-0 leading-snug line-clamp-2">{s.preview}</p>
              </div>
              <button type="button" onClick={() => onChange({ sources: sources.filter((x) => x.chunk_id !== s.chunk_id) })}
                className="icon-btn shrink-0" title="Remove source"><X size={13} /></button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint text-[12px] m-0">No sources: written from the outline and the {kind.nounPlural} around it.</p>
      )}
      <div className="flex gap-2 flex-wrap">
        <form onSubmit={search} className="flex gap-2 flex-1 min-w-[240px]">
          <input className="field flex-1 text-[13px] py-1.5" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the documents to add a source" />
          <button type="submit" disabled={busy !== null || !query.trim()} className="btn-outline text-[13px] py-1.5">
            {busy === 'search' ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}Search
          </button>
        </form>
        <button type="button" onClick={findAgain} disabled={busy !== null} className="btn-ghost text-[12px] py-1">
          {busy === 'refresh' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}Find again
        </button>
      </div>
      {results && (
        <ul className="list-none m-0 p-0 border border-border rounded-lg px-3 max-h-[220px] overflow-y-auto">
          {results.length === 0 && <li className="hint text-[12px] py-2">Nothing new found.</li>}
          {results.map((s) => (
            <li key={s.chunk_id} className="flex gap-2 items-start py-2 border-t border-border first:border-t-0">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-navy m-0">p. {s.page ?? '?'}{s.heading ? ` · ${s.heading}` : ''}</p>
                <p className="text-[12px] text-slate m-0 leading-snug line-clamp-2">{s.preview}</p>
              </div>
              <button type="button" className="btn-outline text-[12px] py-1 px-2 shrink-0"
                onClick={() => { onChange({ sources: [...sources, s] }); setResults(results.filter((r) => r.chunk_id !== s.chunk_id)); }}>
                <Plus size={12} />Add
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-red-700 text-[12px] m-0">{error}</p>}
    </div>
  );
}

function Card({ kind, genId, item, index, total, onChange, onMove, onRemove }) {
  const [picker, setPicker] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const bullets = (item.bullets || []).join('\n');

  return (
    <li className="card p-4 flex gap-3">
      <span className="w-7 h-7 rounded-md bg-[#EAF0F8] text-navy text-[13px] font-semibold flex items-center justify-center shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <input className="w-full bg-transparent border-0 outline-none text-[16px] font-semibold rounded-sm px-1 py-0.5 focus:bg-canvas"
          value={item.title} onChange={(e) => onChange({ title: e.target.value })} aria-label="Title" />
        <textarea className="w-full bg-transparent border-0 outline-none text-[14px] text-ink leading-relaxed rounded-sm px-1 py-0.5 focus:bg-canvas resize-none"
          rows={Math.max(2, (item.bullets || []).length)} value={bullets} aria-label="Bullets, one per line"
          onChange={(e) => onChange({ bullets: e.target.value.split('\n') })}
          placeholder="What it should cover, one point per line" />
        {item[kind.typeKey] === 'figure' && item.figure_id && (
          <div className="flex items-center gap-3 pt-1">
            <FigureImage figureId={item.figure_id} alt="" className="h-[72px] max-w-[140px] object-contain border border-border rounded bg-white" />
            {item.type_reason && <span className="text-[12px] text-slate">{item.type_reason}</span>}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <button type="button" onClick={() => setPicker(!picker)}
            className="chip-muted cursor-pointer hover:bg-[#E2E8F0] transition-colors text-[12px] flex items-center gap-1"
            title={item.type_reason || 'Change layout'}>
            <Layout size={12} />{typeLabel(kind, item[kind.typeKey])}
          </button>
          <button type="button" onClick={() => setShowSources(!showSources)}
            className="chip-muted cursor-pointer hover:bg-[#E2E8F0] transition-colors text-[12px] flex items-center gap-1">
            <FileText size={12} />{(item.sources || []).length} sources
          </button>
          {item.content && <span className="text-[11px] text-slate">Written</span>}
        </div>
        {picker && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
            {kind.options.map((opt) => (
              <button key={opt.key} type="button" onClick={() => { onChange({ [kind.typeKey]: opt.key }); setPicker(false); }}
                className={`option text-left ${item[kind.typeKey] === opt.key ? 'option-selected' : ''}`}>
                <div>
                  <span className="text-[13px] font-semibold text-ink block">{opt.label}</span>
                  <span className="text-[12px] text-slate block mt-0.5">{opt.description}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {showSources && <Sources kind={kind} genId={genId} index={index} item={item} onChange={onChange} />}
      </div>
      <div className="flex flex-col shrink-0">
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="icon-btn" aria-label="Move up"><ChevronUp size={16} /></button>
        <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="icon-btn" aria-label="Move down"><ChevronDown size={16} /></button>
        <button type="button" onClick={onRemove} className="icon-btn" aria-label={`Remove ${kind.noun}`}><Trash2 size={15} /></button>
      </div>
    </li>
  );
}

function Pills({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} title={o.desc}
          className={`px-2.5 py-1.5 rounded-md border text-[13px] cursor-pointer transition-colors ${
            value === o.value ? 'border-navy bg-[#EAF0F8] text-navy font-semibold' : 'border-border bg-white text-ink hover:bg-canvas'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function OutlinePlan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const kind = KIND[useLocation().pathname.includes('/doc/') ? 'doc' : 'deck'];
  const [items, setItems] = useState(null);
  const [brief, setBrief] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const { gen, setGen, expectJob } = usePlanGeneration(id, {
    onJobDone: (g) => { setItems(g.outline?.[kind.listKey] || []); setBrief(g.brief || {}); },
    onLoad: (g) => {
      if (jobRunning(g, 'outline')) return;
      if (g.outline?.[kind.listKey]) setItems((it) => it ?? g.outline[kind.listKey]);
      setBrief((b) => b ?? g.brief ?? {});
    },
  });
  const planning = jobRunning(gen, 'outline');
  const failed = jobFailed(gen, 'outline');

  const outlineSaver = useDebouncedSave(useCallback((outline) => generations.updateOutline(id, outline), [id]));
  const briefSaver = useDebouncedSave(useCallback((b) => generations.updateBrief(id, b), [id]));

  function saveItems(next) {
    setItems(next);
    const outline = { ...(gen.outline || {}), [kind.listKey]: next };
    setGen((g) => ({ ...g, outline }));
    outlineSaver.queue(outline, (err) => setError(err.message));
  }
  // Any change to what an item says or how it looks means it must be written again.
  function updateItem(i, patch) {
    saveItems(items.map((it, j) => (j === i ? { ...it, ...patch, content: null } : it)));
  }
  function move(i, dir) {
    const t = i + dir;
    if (t < 0 || t >= items.length) return;
    const a = [...items]; [a[i], a[t]] = [a[t], a[i]];
    saveItems(a);
  }
  function add() {
    const last = items[items.length - 1];
    const at = last && ['closing', 'summary'].includes(last[kind.typeKey]) ? items.length - 1 : items.length;
    const a = [...items];
    a.splice(at, 0, { id: newId(kind), title: `New ${kind.noun}`, bullets: [], [kind.typeKey]: kind.defaultType, sources: [], content: null });
    saveItems(a);
  }
  function setBriefField(field, value) {
    const next = { ...brief, [field]: value };
    setBrief(next);
    briefSaver.queue(next, (err) => setError(err.message));
  }

  async function regenerate() {
    setError(null);
    try {
      await briefSaver.flush();
      await generations.createOutline(id, brief);
      setItems(null);
      expectJob();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    try {
      await Promise.all([outlineSaver.flush(), briefSaver.flush()]);
      navigate(`/create/${kind.type}/${id}/review`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!gen) return <main className="max-w-[1180px] w-[92%] mx-auto py-8"><p className="hint">Loading...</p></main>;

  const toWrite = (items || []).filter((it) => !it.content).length;
  const countOptions = [];
  for (let n = kind.countRange[0]; n <= kind.countRange[1]; n++) countOptions.push(n);

  return (
    <main className="max-w-[1180px] w-[92%] mx-auto py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/" className="btn-ghost"><ArrowLeft size={18} />Home</Link>
      </div>

      <div>
        <h1 className="font-heading text-[32px] leading-10 font-bold tracking-tight m-0">Outline</h1>
        <p className="text-[15px] text-slate mt-1.5 mb-0">
          Edit titles and points, change layouts, reorder or add {kind.nounPlural}. Then generate.
        </p>
      </div>

      {brief && (
        <section className="card p-4 flex flex-col gap-3">
          <textarea className="field min-h-[60px] text-[15px]" value={brief.topic || ''} aria-label="Prompt"
            onChange={(e) => setBriefField('topic', e.target.value)} disabled={planning} />
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-[13px] text-slate">
              {kind.nounPlural[0].toUpperCase() + kind.nounPlural.slice(1)}
              <select className="field py-1 w-[84px]" value={brief.count || kind.defaultCount} disabled={planning}
                onChange={(e) => setBriefField('count', Number(e.target.value))}>
                {countOptions.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button type="button" onClick={regenerate} disabled={planning} className="btn-outline text-[13px] ml-auto">
              <RefreshCw size={14} />Regenerate outline
            </button>
          </div>
        </section>
      )}

      {(planning || failed) && (
        <JobCard running={planning} error={failed}
          runningText="Writing the outline..."
          detail="Reading your documents and planning each section. This takes 30-90 seconds."
          onRetry={regenerate} />
      )}

      {!planning && !failed && items && brief && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
          <div className="flex flex-col gap-3 min-w-0">
            <ol className="list-none m-0 p-0 flex flex-col gap-3">
              {items.map((it, i) => (
                <Card key={it.id || i} kind={kind} genId={id} item={it} index={i} total={items.length}
                  onChange={(patch) => updateItem(i, patch)} onMove={(dir) => move(i, dir)}
                  onRemove={() => saveItems(items.filter((_, j) => j !== i))} />
              ))}
            </ol>
            <button type="button" onClick={add} className="btn-outline self-start"><Plus size={15} />Add {kind.noun}</button>
          </div>

          <aside className="card p-5 flex flex-col gap-5 lg:sticky lg:top-4">
            <h2 className="font-heading text-[16px] font-semibold m-0">Settings</h2>
            <div className="flex flex-col gap-2">
              <span className="label">Text amount</span>
              <Pills options={TEXT_AMOUNTS} value={brief.text_amount || 'concise'} onChange={(v) => setBriefField('text_amount', v)} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="audience" className="label">Audience</label>
              <input id="audience" className="field text-[14px]" value={brief.audience || ''}
                onChange={(e) => setBriefField('audience', e.target.value)} placeholder="Who it is for" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="tone" className="label">Tone</label>
              <input id="tone" className="field text-[14px]" value={brief.tone || ''}
                onChange={(e) => setBriefField('tone', e.target.value)} placeholder="e.g. clear, practical, friendly" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="label">{kind.type === 'deck' ? 'Used as' : 'Kind of document'}</span>
              <Pills options={kind.formats} value={brief.format || kind.formats[0].value} onChange={(v) => setBriefField('format', v)} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="instructions" className="label">Extra instructions</label>
              <textarea id="instructions" className="field text-[14px] min-h-[72px]" value={brief.instructions || ''}
                onChange={(e) => setBriefField('instructions', e.target.value)}
                placeholder='e.g. "use the Keramika example", "avoid jargon"' />
            </div>
            {error && <p className="text-red-700 text-[13px] m-0">{error}</p>}
            <button type="button" onClick={handleGenerate} disabled={busy || !items.length} className="btn-primary">
              <Sparkles size={16} />
              {busy ? 'Opening...' : toWrite === 0 ? `Open the ${kind.product}` : toWrite === items.length ? 'Generate' : `Generate ${toWrite} changed`}
            </button>
            <p className="hint text-[12px] m-0 -mt-2">
              About 30 seconds per {kind.noun}. {kind.nounPlural[0].toUpperCase() + kind.nounPlural.slice(1)} appear as they are written.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
