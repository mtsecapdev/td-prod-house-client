import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileSliders, FileText, Image, LayoutGrid, ArrowRight, Trash2 } from 'lucide-react';
import { generations } from '../services/api';

const types = [
  { type: 'deck', label: 'Slide deck', desc: 'Training presentations from your source material', icon: FileSliders, to: '/create/deck' },
  { type: 'doc', label: 'Training document', desc: 'Structured documents for print or digital', icon: FileText, to: '/create/doc' },
  { type: 'image', label: 'Image', desc: 'Photorealistic, illustration and conceptual images', icon: Image, to: '/create/image' },
  { type: 'infographic', label: 'Diagram & Infographic', desc: 'Process flows, comparisons, timelines and key stats', icon: LayoutGrid, to: '/create/infographic' },
];

const statusLabels = {
  pending: 'Ready',
  outline_ready: 'Outline ready',
  prompt_ready: 'Prompt ready',
  generating: 'Generating',
  done: 'Review',
  failed: 'Failed',
};

function getResumeUrl(g) {
  const base = `/create/${g.type}/${g.id}`;
  if (g.type === 'image') {
    if (g.status === 'done') return `${base}/review`;
    if (g.status === 'prompt_ready') return `${base}/prompt`;
    if (g.status === 'pending') return `${base}/prompt`;
    if (g.status === 'generating') return `${base}/progress`;
    return null;
  }
  if (g.type === 'infographic') {
    if (g.status === 'done') return `${base}/review`;
    if (g.status === 'pending') return `${base}/progress`;
    if (g.status === 'generating') return `${base}/progress`;
    return null;
  }
  if (g.status === 'done') return `${base}/review`;
  if (g.status === 'generating') return `${base}/progress`;
  if (g.status === 'outline_ready') return `${base}/outline`;
  return null;
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export default function Home() {
  const [recentWork, setRecentWork] = useState([]);
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    generations.list().then((data) => {
      const list = data.generations || data || [];
      const cutoff = Date.now() - SEVEN_DAYS;
      const resumable = list
        .filter((g) => ['pending', 'outline_ready', 'prompt_ready', 'generating', 'done'].includes(g.status)
          && new Date(g.updated_at || g.created_at).getTime() > cutoff)
        .slice(0, 3);
      setRecentWork(resumable);
    }).catch(() => {});
  }, []);

  function handleTrashClick(e, id) {
    e.preventDefault();
    e.stopPropagation();
    setConfirmId(id);
  }

  function handleCancelDelete(e) {
    e.preventDefault();
    e.stopPropagation();
    setConfirmId(null);
  }

  async function handleConfirmDelete(e, id) {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    setDeleting(id);
    try {
      await generations.delete(id);
      setRecentWork((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setDeleting(null);
    setConfirmId(null);
  }

  return (
    <main className="max-w-[960px] w-[90%] mx-auto py-[8vh] flex flex-col gap-8">
      {recentWork.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[14px] font-semibold text-slate tracking-wide uppercase m-0">Continue where you left off</h2>
          <div className="flex flex-col gap-2">
            {recentWork.map((g) => {
              const url = getResumeUrl(g);
              if (!url) return null;
              const Icon = g.type === 'deck' ? FileSliders : g.type === 'image' ? Image : g.type === 'infographic' ? LayoutGrid : FileText;
              return (
                <Link key={g.id} to={url} className="card px-5 py-4 flex items-center gap-4 no-underline text-ink hover:shadow-raised hover:border-[#CBD5E1] transition-all">
                  <Icon size={18} className="text-navy shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium truncate">{g.brief?.topic || 'Untitled'}</p>
                    <p className="text-[13px] text-slate mt-0.5">
                      {g.type === 'deck' ? 'Slide deck' : g.type === 'image' ? 'Image' : g.type === 'infographic' ? 'Infographic' : 'Training document'}
                      {' · '}
                      {new Date(g.updated_at || g.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`text-[13px] font-medium px-2.5 py-1 rounded-md ${
                    g.status === 'done' ? 'bg-emerald-50 text-emerald-700' :
                    g.status === 'generating' ? 'bg-amber-50 text-amber-700' :
                    'bg-canvas text-slate'
                  }`}>{statusLabels[g.status]}</span>
                  {confirmId === g.id ? (
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.preventDefault()}>
                      <span className="text-[13px] text-red-600">Delete draft?</span>
                      <button onClick={(e) => handleConfirmDelete(e, g.id)}
                        disabled={deleting === g.id}
                        className="px-2.5 py-1 rounded-md text-[13px] font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">
                        {deleting === g.id ? 'Deleting...' : 'Delete'}
                      </button>
                      <button onClick={handleCancelDelete}
                        className="px-2.5 py-1 rounded-md text-[13px] font-medium text-slate hover:bg-canvas transition-colors">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <ArrowRight size={16} className="text-slate shrink-0" />
                      <button onClick={(e) => handleTrashClick(e, g.id)}
                        className="p-1.5 rounded-md text-slate hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                        title="Delete draft">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-center">
        <h1 className="font-heading text-[36px] leading-[1.15] font-bold tracking-tight m-0">
          What would you like to create?
        </h1>
        <p className="text-[15px] text-slate mt-2">Choose a format to get started with your source material.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-rows-2 gap-5 max-w-[720px] mx-auto w-full">
        {types.map((t) => {
          const Icon = t.icon;
          if (t.disabled) {
            return (
              <div key={t.type} className="card p-7 flex gap-5 items-start opacity-45 cursor-not-allowed">
                <div className="w-11 h-11 rounded-lg bg-canvas flex items-center justify-center shrink-0">
                  <Icon size={22} className="text-slate" />
                </div>
                <div>
                  <p className="font-semibold text-[16px]">{t.label}</p>
                  <p className="text-[14px] text-slate mt-1 leading-relaxed">{t.desc}</p>
                  <p className="text-xs text-slate mt-2">Coming soon</p>
                </div>
              </div>
            );
          }
          return (
            <Link key={t.type} to={t.to} className="card p-7 flex gap-5 items-start no-underline text-ink hover:shadow-raised hover:border-[#CBD5E1] transition-all">
              <div className="w-11 h-11 rounded-lg bg-navy/5 flex items-center justify-center shrink-0">
                <Icon size={22} className="text-navy" />
              </div>
              <div>
                <p className="font-semibold text-[16px]">{t.label}</p>
                <p className="text-[14px] text-slate mt-1 leading-relaxed">{t.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
