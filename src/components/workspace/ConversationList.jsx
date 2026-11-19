import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MessageSquare, Trash2, PanelLeftClose, FileSliders, FileText, Image } from 'lucide-react';

const MADE_ICONS = { deck: FileSliders, doc: FileText, image: Image };

/** Conversations, newest activity first; icons show what each one made. */
export default function ConversationList({ items, activeId, onNew, onDelete, onCollapse }) {
  const [confirming, setConfirming] = useState(null);
  return (
    <aside className="w-64 shrink-0 border-r border-border bg-canvas flex flex-col">
      <div className="p-3 flex items-center gap-2 border-b border-border">
        <button type="button" onClick={onNew} className="btn-primary flex-1 justify-center text-[13px] py-2"><Plus size={15} />New chat</button>
        <button type="button" onClick={onCollapse} className="icon-btn w-9 h-9" title="Hide conversations" aria-label="Hide conversations">
          <PanelLeftClose size={16} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2" aria-label="Conversations">
        {items.length === 0 && <p className="px-4 py-6 text-[13px] text-slate text-center m-0">No conversations yet</p>}
        {items.map((c) => (
          <div key={c.id} className={`group flex items-center gap-2 mx-2 px-2 py-2 rounded-md ${c.id === activeId ? 'bg-white shadow-sm' : 'hover:bg-white/70'}`}>
            <Link to={`/c/${c.id}`} className="flex-1 min-w-0 flex items-center gap-2 no-underline text-ink">
              <MessageSquare size={14} className={`shrink-0 ${c.id === activeId ? 'text-cobalt' : 'text-slate'}`} />
              <span className="flex-1 truncate text-[13px]">{c.title}</span>
              {(c.made || []).map((type) => {
                const Icon = MADE_ICONS[type];
                return Icon ? <Icon key={type} size={12} className="text-slate shrink-0" aria-label={type} /> : null;
              })}
            </Link>
            {confirming === c.id ? (
              <span className="flex items-center gap-1">
                <button type="button" onClick={() => { setConfirming(null); onDelete(c.id); }}
                  title={(c.made || []).length ? 'Deletes the chat and the decks/documents made in it (Library copies stay)' : 'Deletes the chat'}
                  className="text-[12px] text-white bg-red-600 rounded px-1.5 py-0.5 border-0 cursor-pointer">
                  {(c.made || []).length ? 'Delete with decks' : 'Delete'}
                </button>
                <button type="button" onClick={() => setConfirming(null)} className="text-[12px] text-slate bg-transparent border-0 cursor-pointer">Keep</button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirming(c.id)} title="Delete conversation"
                className="p-1 rounded text-slate hover:text-red-600 bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
