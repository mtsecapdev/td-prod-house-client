import { useState, useEffect, useRef } from 'react';
import { Search, Download, Trash2, FileSliders, FileText, Image, LayoutGrid } from 'lucide-react';
import { assets } from '../services/api';

const kindOptions = [
  { value: '', label: 'All types' },
  { value: 'deck', label: 'Slide decks', icon: FileSliders },
  { value: 'doc', label: 'Documents', icon: FileText },
  { value: 'image', label: 'Images', icon: Image },
  { value: 'infographic', label: 'Infographics', icon: LayoutGrid },
];

function KindIcon({ kind, size = 18 }) {
  const icons = { deck: FileSliders, doc: FileText, image: Image, infographic: LayoutGrid };
  const Icon = icons[kind] || FileSliders;
  return <Icon size={size} />;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Library() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);

  function loadAssets(q, k) {
    setLoading(true);
    assets.list({ q: q || undefined, kind: k || undefined })
      .then(({ assets: list }) => setItems(list || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAssets(search, kind);
  }, [kind]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadAssets(search, kind), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  async function handleDelete(id) {
    try {
      await assets.delete(id);
      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  return (
    <main className="max-w-[960px] w-[90%] mx-auto py-8 flex flex-col gap-6">
      <h1 className="font-heading text-[32px] leading-10 font-bold tracking-tight m-0">Library</h1>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[360px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate pointer-events-none" />
          <input className="field pl-9 w-full" placeholder="Search saved assets..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="field w-auto min-w-[160px]" value={kind}
          onChange={(e) => setKind(e.target.value)}>
          {kindOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="hint">Loading...</p>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate text-[15px]">
            {search || kind ? 'No matching assets found.' : 'Nothing saved yet. Generate a slide deck and save it to see it here.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.id} className="card px-5 py-4 flex items-center gap-4 hover:shadow-raised transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-canvas flex items-center justify-center text-navy shrink-0">
                <KindIcon kind={item.kind} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] truncate">{item.title || 'Untitled'}</p>
                <p className="text-[13px] text-slate mt-0.5">
                  {kindOptions.find((o) => o.value === item.kind)?.label?.replace(/s$/, '') || item.kind}
                  {' · '}Saved {formatDate(item.saved_at)}
                </p>
              </div>
              <a href={assets.downloadUrl(item.id)} download
                className="p-2 rounded-md text-cobalt hover:bg-canvas hover:text-navy transition-colors"
                title="Download">
                <Download size={18} />
              </a>
              <button type="button" onClick={() => handleDelete(item.id)}
                className="p-2 rounded-md text-slate hover:text-red-600 hover:bg-canvas cursor-pointer bg-transparent border-0 transition-colors"
                title="Delete">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
