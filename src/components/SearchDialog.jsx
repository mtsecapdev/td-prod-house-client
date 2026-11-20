import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageSquare, FileSliders, FileText, Image, X } from 'lucide-react';
import { generations } from '../services/api';

const ICONS = { conversation: MessageSquare, deck: FileSliders, doc: FileText, image: Image };
const LABELS = { conversation: 'Chat', deck: 'Slide deck', doc: 'Training document', image: 'Image' };

/** Search chats and the decks, documents and images made in them (Ctrl+K). */
export default function SearchDialog({ conversations, onClose }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [made, setMade] = useState([]);
  const [picked, setPicked] = useState(0);

  useEffect(() => {
    generations.list().then((d) => setMade((d.generations || []).filter((g) => g.conversation_id))).catch(() => {});
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const all = [
      ...conversations.map((c) => ({ kind: 'conversation', id: `c${c.id}`, title: c.title, to: `/c/${c.id}`, at: c.updated_at })),
      ...made.map((g) => ({
        kind: g.type, id: `g${g.id}`, title: g.name, at: g.updated_at || g.created_at,
        to: g.type === 'image' ? `/c/${g.conversation_id}` : `/c/${g.conversation_id}/g/${g.id}`,
      })),
    ];
    return all.filter((r) => !term || (r.title || '').toLowerCase().includes(term))
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 12);
  }, [q, conversations, made]);

  function open(r) {
    if (!r) return;
    navigate(r.to);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-[12vh] px-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Search" onClick={(e) => e.stopPropagation()}
        className="w-[600px] max-w-full bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 border-b border-border">
          <Search size={17} className="text-slate" />
          <input autoFocus value={q} placeholder="Search chats, decks and documents"
            onChange={(e) => { setQ(e.target.value); setPicked(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setPicked((i) => Math.min(i + 1, results.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setPicked((i) => Math.max(i - 1, 0)); }
              if (e.key === 'Enter') open(results[picked]);
              if (e.key === 'Escape') onClose();
            }}
            className="flex-1 h-14 bg-transparent border-0 outline-none text-[15px]" />
          <button type="button" onClick={onClose} className="icon-btn w-8 h-8" aria-label="Close"><X size={16} /></button>
        </div>
        <ul className="list-none m-0 p-2 max-h-[50vh] overflow-y-auto">
          {results.length === 0 && <li className="px-3 py-6 text-center text-[14px] text-slate">Nothing found</li>}
          {results.map((r, i) => {
            const Icon = ICONS[r.kind] || MessageSquare;
            return (
              <li key={r.id}>
                <button type="button" onClick={() => open(r)} onMouseEnter={() => setPicked(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left border-0 cursor-pointer ${i === picked ? 'bg-[#EAF0F8]' : 'bg-transparent'}`}>
                  <Icon size={16} className="text-slate shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-[14px] text-ink">{r.title || 'Untitled'}</span>
                  <span className="text-[12px] text-slate shrink-0">{LABELS[r.kind]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
