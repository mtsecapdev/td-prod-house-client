import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSliders, FileText } from 'lucide-react';
import { generations } from '../../services/api';

const TYPES = {
  deck: { label: 'Slide deck', icon: FileSliders, tint: 'bg-[#E8EFFA] text-cobalt' },
  doc: { label: 'Training document', icon: FileText, tint: 'bg-[#E9F5EF] text-[#047857]' },
};
const SHOWN = 6;

function ago(date) {
  const mins = Math.round((Date.now() - new Date(date)) / 60000);
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : days < 30 ? `${days} days ago` : new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** The latest decks and documents made in conversations, to pick up where you left off. */
export default function RecentWork() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    generations.list()
      .then((d) => setItems((d.generations || [])
        .filter((g) => g.conversation_id && TYPES[g.type])
        .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
        .slice(0, SHOWN)))
      .catch(() => setItems([]));
  }, []);

  if (!items?.length) return null;
  return (
    <section className="w-full flex flex-col gap-3" aria-label="Recent work">
      <h2 className="m-0 text-[13px] font-semibold text-slate">Recent work</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((g) => {
          const t = TYPES[g.type];
          const to = `/c/${g.conversation_id}/g/${g.id}`;
          return (
            <Link key={g.id} to={to} className="group no-underline bg-white border border-border rounded-xl overflow-hidden hover:border-[#C7D3E3] hover:shadow-md transition-shadow">
              <div className={`h-[84px] flex items-center justify-center ${t.tint}`}>
                <t.icon size={26} strokeWidth={1.6} />
              </div>
              <div className="px-3 py-2.5">
                <p className="m-0 text-[13px] font-semibold text-ink truncate" title={g.name}>{g.name}</p>
                <p className="m-0 mt-0.5 text-[12px] text-slate">{t.label} · {ago(g.updated_at || g.created_at)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
