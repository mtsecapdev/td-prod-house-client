import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Download, EyeOff, Eye, Trash2, Maximize2, Plus, FileSliders, FileText, X, Loader2 } from 'lucide-react';
import { figures as figuresApi, documents, generations } from '../services/api';
import FigureLightbox from '../components/figures/FigureLightbox';
import DeleteWithUsageDialog from '../components/figures/DeleteWithUsageDialog';

/** Figures saved from uploaded documents, grouped by document: view, download, use in a deck/doc, hide, delete. */
export default function Assets() {
  const [docs, setDocs] = useState([]);
  const [docFilter, setDocFilter] = useState('');
  const [q, setQ] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [usingIn, setUsingIn] = useState(null);
  const [deleting, setDeleting] = useState(null); // { figure, usage }

  useEffect(() => {
    documents.list().then((d) => setDocs(d.docs || d || [])).catch(() => {});
  }, []);

  function load() {
    return figuresApi.list({ q, documentIds: docFilter ? [Number(docFilter)] : [], includeHidden: showHidden })
      .then((d) => { setList(d.figures); setError(null); })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q, docFilter, showHidden]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    const byDoc = new Map();
    for (const f of list || []) {
      if (!byDoc.has(f.document_id)) byDoc.set(f.document_id, { name: f.document_name, figures: [] });
      byDoc.get(f.document_id).figures.push(f);
    }
    return [...byDoc.entries()];
  }, [list]);

  async function toggleHidden(f) {
    try {
      await figuresApi.setHidden(f.id, !f.hidden);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function startDelete(f) {
    try {
      const { usage } = await figuresApi.usage(f.id);
      setDeleting({ figure: f, usage });
    } catch (err) {
      setError(err.message);
    }
  }

  const withFigures = docs.filter((d) => d.status === 'ready');

  return (
    <main className="max-w-[1180px] w-[90%] mx-auto py-8 flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-[24px] font-bold text-navy m-0">Assets</h1>
        <p className="hint m-0 mt-1">Figures saved from your uploaded documents. Use them in slides and training documents.</p>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input className="field pl-8 w-full" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search captions and the text inside figures" aria-label="Search figures" />
        </div>
        <select className="field w-auto max-w-[320px]" value={docFilter} onChange={(e) => setDocFilter(e.target.value)} aria-label="Document">
          <option value="">All documents</option>
          {withFigures.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-[14px] text-slate cursor-pointer">
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} className="w-4 h-4 accent-navy" />
          Show hidden
        </label>
      </div>

      {error && <p className="text-red-700 text-[13px] m-0">{error}</p>}

      {list === null ? <p className="hint">Loading…</p> : groups.length === 0 ? (
        <p className="hint">
          {q || docFilter ? 'No figures match.' : 'No figures yet. Figures are saved when you upload a PDF; documents uploaded before this was added need re-uploading.'}
        </p>
      ) : groups.map(([docId, g]) => (
        <section key={docId} className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-navy m-0">
            {g.name} <span className="font-normal text-slate text-[13px]">· {g.figures.length} figure{g.figures.length === 1 ? '' : 's'}</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {g.figures.map((f) => (
              <FigureCard key={f.id} figure={f} onView={() => setViewing(f)} onUse={() => setUsingIn(f)}
                onToggleHidden={() => toggleHidden(f)} onDelete={() => startDelete(f)} />
            ))}
          </div>
        </section>
      ))}

      {viewing && <FigureLightbox figure={viewing} onClose={() => setViewing(null)} />}
      {usingIn && <UseInDialog figure={usingIn} onClose={() => setUsingIn(null)} />}
      {deleting && (
        <DeleteWithUsageDialog
          title="Delete figure"
          what="This figure"
          usage={deleting.usage}
          consequence="Those slides and sections will show “Figure removed”. Hiding it instead keeps them working and removes it from this page and the pickers."
          safeLabel="Hide instead"
          onSafe={async () => {
            await figuresApi.setHidden(deleting.figure.id, true);
            setDeleting(null);
            load();
          }}
          onDelete={async () => {
            await figuresApi.remove(deleting.figure.id, { force: deleting.usage.length > 0 });
            setDeleting(null);
            load();
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </main>
  );
}

function FigureCard({ figure: f, onView, onUse, onToggleHidden, onDelete }) {
  const url = figuresApi.imageUrl(f.id);
  return (
    <div className={`bg-white border border-border rounded-lg p-2 flex flex-col gap-1.5 ${f.hidden ? 'opacity-60' : ''}`}>
      <button type="button" onClick={onView} className="group relative h-[130px] flex items-center justify-center bg-canvas rounded border-0 cursor-zoom-in p-0"
        aria-label={`View ${f.caption || 'figure'}`}>
        <img src={url} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
        <Maximize2 size={14} className="absolute top-1.5 right-1.5 text-slate opacity-0 group-hover:opacity-100" />
      </button>
      <span className="text-[12px] leading-snug line-clamp-2 min-h-[2.5em]" title={f.caption || ''}>{f.caption || 'Untitled figure'}</span>
      <span className="text-[11px] text-slate">p. {f.page ?? '?'}{f.hidden ? ' · hidden' : ''}</span>
      <div className="flex items-center gap-0.5 -mx-1">
        <button type="button" onClick={onUse} className="btn-ghost text-[12px] px-2 py-1 mr-auto"><Plus size={13} /> Use in…</button>
        <a href={url} download={`figure-${f.id}.png`} className="icon-btn" aria-label="Download" title="Download"><Download size={14} /></a>
        <button type="button" onClick={onToggleHidden} className="icon-btn" aria-label={f.hidden ? 'Unhide' : 'Hide'} title={f.hidden ? 'Unhide' : 'Hide'}>
          {f.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
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
                <Link to={`/create/${done.g.type}/${done.g.id}/review`} className="btn-primary no-underline">Open it</Link>
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
