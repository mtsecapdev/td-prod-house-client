import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Download, Trash2, Maximize2, Plus, FileSliders, FileText, X, Loader2, Check, CheckSquare } from 'lucide-react';
import { figures as figuresApi, documents, generations } from '../services/api';
import FigureLightbox from '../components/figures/FigureLightbox';
import DeleteWithUsageDialog from '../components/figures/DeleteWithUsageDialog';

/**
 * Figures saved from uploaded documents, grouped by document: view (with what each picture shows, as described by
 * the model; captions and descriptions can be corrected), download, use in a deck/doc, delete.
 * Several can be selected (tick on hover, or the Select button; shift-click for a range) to download as a zip,
 * or delete together.
 */
export default function Assets() {
  const [docs, setDocs] = useState([]);
  const [docFilter, setDocFilter] = useState('');
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [viewing, setViewing] = useState(null); // figure id
  const [canDescribe, setCanDescribe] = useState(false);
  const [usingIn, setUsingIn] = useState(null);
  const [deleting, setDeleting] = useState(null); // { ids, usage }
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [anchor, setAnchor] = useState(null); // last clicked id, for shift-click ranges
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    documents.list().then((d) => setDocs(d.docs || d || [])).catch(() => {});
  }, []);

  function load() {
    return figuresApi.list({ q, documentIds: docFilter ? [Number(docFilter)] : [] })
      .then((d) => {
        setList(d.figures);
        setCanDescribe(Boolean(d.canDescribe));
        setError(null);
        // Keep only selections that are still shown.
        const shown = new Set(d.figures.map((f) => f.id));
        setSelected((sel) => new Set([...sel].filter((id) => shown.has(id))));
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q, docFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  function saved(updated) {
    setList((all) => all.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)));
  }

  const viewingFigure = viewing != null ? (list || []).find((f) => f.id === viewing) : null;

  const groups = useMemo(() => {
    const byDoc = new Map();
    for (const f of list || []) {
      if (!byDoc.has(f.document_id)) byDoc.set(f.document_id, { name: f.document_name, figures: [] });
      byDoc.get(f.document_id).figures.push(f);
    }
    return [...byDoc.entries()];
  }, [list]);

  const selecting = selectMode || selected.size > 0;

  function endSelecting() {
    setSelected(new Set());
    setSelectMode(false);
    setAnchor(null);
  }

  useEffect(() => {
    if (!selecting) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !deleting && !viewing && !usingIn) endSelecting(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function toggle(f, shiftKey) {
    const flat = list || [];
    setSelected((sel) => {
      const next = new Set(sel);
      if (shiftKey && anchor != null) {
        // Range from the last clicked figure to this one, in the order shown; all set to this one's new state.
        const a = flat.findIndex((x) => x.id === anchor);
        const b = flat.findIndex((x) => x.id === f.id);
        const on = !sel.has(f.id);
        for (const x of flat.slice(Math.min(a, b), Math.max(a, b) + 1)) (on ? next.add(x.id) : next.delete(x.id));
      } else if (next.has(f.id)) next.delete(f.id);
      else next.add(f.id);
      return next;
    });
    setAnchor(f.id);
  }

  function setGroup(figures, on) {
    setSelected((sel) => {
      const next = new Set(sel);
      for (const f of figures) (on ? next.add(f.id) : next.delete(f.id));
      return next;
    });
  }

  async function run(action) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  const startDelete = (ids) => run(async () => {
    const { usage } = await figuresApi.usage(ids);
    setDeleting({ ids, usage });
  });

  const withFigures = docs.filter((d) => d.status === 'ready');
  const ids = [...selected];

  return (
    <main className={`max-w-[1180px] w-[90%] mx-auto pt-8 flex flex-col gap-5 ${selecting ? 'pb-24' : 'pb-8'}`}>
      <div>
        <h1 className="font-heading text-[24px] font-bold text-navy m-0">Assets</h1>
        <p className="hint m-0 mt-1">Figures saved from your uploaded documents.</p>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input className="field pl-8 w-full" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search captions, descriptions and the text inside figures" aria-label="Search figures" />
        </div>
        <select className="field w-auto max-w-[320px]" value={docFilter} onChange={(e) => setDocFilter(e.target.value)} aria-label="Document">
          <option value="">All documents</option>
          {withFigures.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button type="button" onClick={() => (selecting ? endSelecting() : setSelectMode(true))}
          className={selecting ? 'btn-primary' : 'btn-outline'} aria-pressed={selecting}>
          <CheckSquare size={15} />{selecting ? 'Done' : 'Select'}
        </button>
      </div>

      {error && <p className="text-red-700 text-[13px] m-0">{error}</p>}

      {list === null ? <p className="hint">Loading…</p> : groups.length === 0 ? (
        <p className="hint">
          {q || docFilter ? 'No figures match.' : 'No figures yet.'}
        </p>
      ) : groups.map(([docId, g]) => {
        const allInGroup = g.figures.every((f) => selected.has(f.id));
        return (
          <section key={docId} className="flex flex-col gap-3">
            <h2 className="text-[15px] font-semibold text-navy m-0 flex items-center gap-3 flex-wrap">
              <span>{g.name} <span className="font-normal text-slate text-[13px]">· {g.figures.length} figure{g.figures.length === 1 ? '' : 's'}</span></span>
              {selecting && (
                <button type="button" onClick={() => setGroup(g.figures, !allInGroup)}
                  className="text-[13px] font-normal text-cobalt bg-transparent border-0 p-0 cursor-pointer hover:underline">
                  {allInGroup ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {g.figures.map((f) => (
                <FigureCard key={f.id} figure={f} selecting={selecting} selected={selected.has(f.id)}
                  onToggle={(shift) => toggle(f, shift)}
                  onView={() => setViewing(f.id)} onUse={() => setUsingIn(f)}
                  onDelete={() => startDelete([f.id])} />
              ))}
            </div>
          </section>
        );
      })}

      {selecting && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border shadow-[0_-4px_16px_rgba(15,23,42,0.08)]">
          <div className="max-w-[1180px] w-[90%] mx-auto py-3 flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-navy mr-1">{selected.size} selected</span>
            {list?.length > 0 && selected.size < list.length && (
              <button type="button" onClick={() => setGroup(list, true)} className="btn-ghost text-[13px]">Select all {list.length}</button>
            )}
            {selected.size > 0 && (
              <button type="button" onClick={() => setSelected(new Set())} className="btn-ghost text-[13px]">Clear</button>
            )}
            <span className="flex-1" />
            {selected.size > 0 ? (
              <>
                <a href={ids.length === 1 ? figuresApi.imageUrl(ids[0]) : figuresApi.downloadUrl(ids)}
                  download={ids.length === 1 ? `figure-${ids[0]}.png` : true} className="btn-outline no-underline">
                  <Download size={15} />Download{selected.size > 1 ? ' (.zip)' : ''}
                </a>
                <button type="button" disabled={busy} onClick={() => startDelete(ids)} className="btn-outline text-red-700 hover:border-red-400">
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}Delete
                </button>
              </>
            ) : <span className="hint text-[13px]">Click figures to select them; shift-click selects a range.</span>}
            <button type="button" onClick={endSelecting} className="icon-btn w-9 h-9" aria-label="Stop selecting" title="Stop selecting (Esc)"><X size={16} /></button>
          </div>
        </div>
      )}

      {viewingFigure && (
        <FigureLightbox figure={viewingFigure} canDescribe={canDescribe} onSaved={saved} onClose={() => setViewing(null)} />
      )}
      {usingIn && <UseInDialog figure={usingIn} onClose={() => setUsingIn(null)} />}
      {deleting && (
        <DeleteWithUsageDialog
          title={deleting.ids.length === 1 ? 'Delete figure' : `Delete ${deleting.ids.length} figures`}
          what={deleting.ids.length === 1 ? 'This figure' : `These ${deleting.ids.length} figures`}
          plural={deleting.ids.length > 1}
          usage={deleting.usage}
          consequence="Those slides and sections will show “Figure removed”."
          onDelete={async () => {
            await figuresApi.remove(deleting.ids, { force: deleting.usage.length > 0 });
            setSelected((sel) => new Set([...sel].filter((id) => !deleting.ids.includes(id))));
            setDeleting(null);
            await load();
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </main>
  );
}

function FigureCard({ figure: f, selecting, selected, onToggle, onView, onUse, onDelete }) {
  const url = figuresApi.imageUrl(f.id);
  return (
    <div className={`group relative bg-white border rounded-lg p-2 flex flex-col gap-1.5 ${
      selected ? 'border-cobalt ring-2 ring-cobalt/40' : 'border-border'}`}>
      <button type="button"
        onClick={(e) => (selecting ? onToggle(e.shiftKey) : onView())}
        className={`relative h-[130px] flex items-center justify-center bg-canvas rounded border-0 p-0 ${selecting ? 'cursor-pointer' : 'cursor-zoom-in'}`}
        aria-label={selecting ? `${selected ? 'Deselect' : 'Select'} ${f.caption || 'figure'}` : `View ${f.caption || 'figure'}`}>
        <img src={url} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
        {!selecting && <Maximize2 size={14} className="absolute top-1.5 right-1.5 text-slate opacity-0 group-hover:opacity-100" />}
      </button>
      {/* Tick box: always shown while selecting, on hover otherwise (ticking one starts selecting). */}
      <span role="checkbox" aria-checked={selected} tabIndex={0} aria-label={`Select ${f.caption || 'figure'}`}
        onClick={(e) => { e.stopPropagation(); onToggle(e.shiftKey); }}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(e.shiftKey); } }}
        className={`absolute top-3 left-3 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer shadow-sm ${
          selected ? 'bg-cobalt border-cobalt text-white' : 'bg-white/95 border-slate/60'} ${
          selecting || selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`}>
        {selected && <Check size={13} strokeWidth={3} />}
      </span>
      <span className="text-[12px] leading-snug line-clamp-2 min-h-[2.5em]" title={f.caption || ''}>{f.caption || 'Untitled figure'}</span>
      <span className="text-[11px] text-slate">p. {f.page ?? '?'}</span>
      <div className={`flex items-center gap-0.5 -mx-1 ${selecting ? 'invisible' : ''}`}>
        <button type="button" onClick={onUse} className="btn-ghost text-[12px] px-2 py-1 mr-auto"><Plus size={13} /> Use in…</button>
        <a href={url} download={`figure-${f.id}.png`} className="icon-btn" aria-label="Download" title="Download"><Download size={14} /></a>
        <button type="button" onClick={onDelete} className="icon-btn hover:text-red-700" aria-label="Delete" title="Delete"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

const TYPE = { deck: { label: 'Slide deck', icon: FileSliders }, doc: { label: 'Training document', icon: FileText } };

/** Pick a written deck or document; the figure goes in before its closing slide/summary. */
function UseInDialog({ figure, onClose }) {
  const [gens, setGens] = useState(null);
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    generations.list().then((d) => {
      const all = d.generations || d || [];
      setGens(all.filter((g) => (g.type === 'deck' || g.type === 'doc') && g.status === 'done'));
    }).catch((err) => setError(err.message));
  }, []);

  async function use(g) {
    setBusy(g.id);
    setError(null);
    try {
      const r = await generations.addFigure(g.id, figure.id);
      setDone({ g, index: r.index });
    } catch (err) {
      setError(err.message);
    }
    setBusy(null);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={busy ? undefined : onClose}>
      <div className="bg-white rounded-lg w-[520px] max-w-[95vw] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Use figure in">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <h2 className="font-heading text-[18px] font-semibold m-0">Use in…</h2>
          <button type="button" onClick={onClose} disabled={Boolean(busy)} className="icon-btn" aria-label="Close"><X size={16} /></button>
        </div>
        <div className="p-5 overflow-y-auto flex flex-col gap-2">
          {error && <p className="text-red-700 text-[13px] m-0">{error}</p>}
          {done ? (
            <>
              <p className="m-0 text-[14px]">Added to <strong>{done.g.name}</strong>
                {done.index != null && <> as {done.g.type === 'deck' ? 'slide' : 'section'} {done.index + 1}</>}.</p>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={onClose} className="btn-ghost">Close</button>
                <Link to={`/g/${done.g.id}`} className="btn-primary no-underline">Open it</Link>
              </div>
            </>
          ) : gens === null ? <p className="hint m-0">Loading…</p> : gens.length === 0 ? (
            <p className="hint m-0">No finished slide decks or training documents yet. Create one first, then add figures from here or from the editor.</p>
          ) : (
            <>
              <p className="hint m-0">It goes in before the closing slide or summary; you can move it in the editor.</p>
              {gens.map((g) => {
                const T = TYPE[g.type];
                return (
                  <button key={g.id} type="button" onClick={() => use(g)} disabled={Boolean(busy)}
                    className="flex items-center gap-3 text-left bg-white border border-border rounded-md px-3 py-2.5 cursor-pointer hover:border-navy disabled:opacity-60">
                    {busy === g.id ? <Loader2 size={16} className="animate-spin text-cobalt shrink-0" /> : <T.icon size={16} className="text-slate shrink-0" />}
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-medium truncate">{g.name}</span>
                      <span className="block text-[12px] text-slate">{T.label}</span>
                    </span>
                  </button>
                );
              })}
              {busy && <p className="hint text-[12px] m-0">Writing the {gens.find((g) => g.id === busy)?.type === 'deck' ? 'slide' : 'section'} around this figure… about 30 seconds.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
