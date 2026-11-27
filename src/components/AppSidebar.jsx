import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import AccountMenu from './AccountMenu';
import {
  Plus, Search, Library, Images, PanelLeftClose, PanelLeftOpen, MessageSquare, Trash2, FileSliders, FileText, Layers,
} from 'lucide-react';

const MADE_ICONS = { deck: FileSliders, doc: FileText };

/**
 * The app's sidebar on every page: new chat, search, Library, Assets, and recent conversations. Collapses to an
 * icon rail; on phones it is shown as a drawer (onNavigate closes it).
 */
export default function AppSidebar({ collapsed, onToggle, conversations, activeId, onDelete, onSearch, onNavigate = () => {} }) {
  const [confirming, setConfirming] = useState(null);
  // Navy, so the frame stands apart from the light page beside it.
  const item = ({ isActive }) =>
    `flex items-center gap-2.5 rounded-lg no-underline text-[14px] ${collapsed ? 'justify-center w-10 h-10' : 'px-2.5 h-9'} ${
      isActive ? 'bg-white/15 text-white font-semibold' : 'text-white/80 hover:bg-white/10 hover:text-white'}`;

  return (
    <aside className={`h-full shrink-0 flex flex-col bg-navy text-white transition-[width] ${collapsed ? 'w-[60px] items-center' : 'w-[264px]'}`}>
      <div className={`flex items-center h-14 shrink-0 ${collapsed ? 'justify-center' : 'px-3 justify-between'}`}>
        {!collapsed && (
          <Link to="/" onClick={onNavigate} className="flex items-center gap-2 no-underline">
            <span className="w-7 h-7 rounded-lg bg-cobalt text-white flex items-center justify-center"><Layers size={15} /></span>
            <span className="font-heading text-[17px] font-bold text-white tracking-tight">TDPH</span>
          </Link>
        )}
        <button type="button" onClick={onToggle} className="icon-btn w-9 h-9 text-white/70 hover:text-white hover:bg-white/10" title={collapsed ? 'Open sidebar' : 'Close sidebar'}
          aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}>
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      <nav className={`flex flex-col gap-0.5 ${collapsed ? 'items-center' : 'px-2'}`} aria-label="Main">
        <NavLink to="/" end onClick={onNavigate} className={item} title="New chat">
          <span className="w-6 h-6 rounded-full bg-cobalt text-white flex items-center justify-center shrink-0"><Plus size={14} /></span>
          {!collapsed && <span className="font-medium">New chat</span>}
        </NavLink>
        <button type="button" onClick={onSearch} title="Search (Ctrl+K)"
          className={`${item({ isActive: false })} bg-transparent border-0 cursor-pointer text-left`}>
          <Search size={17} className="text-white/60 shrink-0" />
          {!collapsed && <><span className="flex-1">Search</span><kbd className="text-[11px] text-white/45 font-body">Ctrl K</kbd></>}
        </button>
        <NavLink to="/library" onClick={onNavigate} className={item} title="Library">
          <Library size={17} className="text-white/60 shrink-0" />{!collapsed && 'Library'}
        </NavLink>
        <NavLink to="/assets" onClick={onNavigate} className={item} title="Assets">
          <Images size={17} className="text-white/60 shrink-0" />{!collapsed && 'Assets'}
        </NavLink>
      </nav>

      {!collapsed && (
        <>
          <p className="mt-5 mb-1 px-5 text-[12px] font-semibold text-white/45 uppercase tracking-wide">Recents</p>
          <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3" aria-label="Recent conversations">
            {conversations.length === 0 && <p className="px-3 py-2 text-[13px] text-white/50 m-0">No conversations yet</p>}
            {conversations.map((c) => (
              <div key={c.id} className={`group flex items-center gap-1 rounded-lg ${c.id === activeId ? 'bg-white/15' : 'hover:bg-white/10'}`}>
                <Link to={`/c/${c.id}`} onClick={onNavigate} title={c.title}
                  className={`flex-1 min-w-0 flex items-center gap-2 px-2.5 h-9 no-underline text-[14px] ${c.id === activeId ? 'text-white font-medium' : 'text-white/80'}`}>
                  <span className="flex-1 truncate">{c.title}</span>
                  {(c.made || []).map((type) => {
                    const Icon = MADE_ICONS[type];
                    return Icon ? <Icon key={type} size={13} className="text-white/45 shrink-0" aria-label={type} /> : null;
                  })}
                </Link>
                {confirming === c.id ? (
                  <span className="flex items-center gap-1 pr-1">
                    <button type="button" onClick={() => { setConfirming(null); onDelete(c.id); }}
                      title={(c.made || []).length ? 'Deletes the chat and the decks/documents made in it (Library copies stay)' : 'Deletes the chat'}
                      className="text-[12px] text-white bg-red-600 rounded px-1.5 py-0.5 border-0 cursor-pointer">
                      {(c.made || []).length ? 'Delete with decks' : 'Delete'}
                    </button>
                    <button type="button" onClick={() => setConfirming(null)} className="text-[12px] text-white/70 bg-transparent border-0 cursor-pointer">Keep</button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirming(c.id)} title="Delete conversation" aria-label={`Delete ${c.title}`}
                    className="p-1.5 mr-1 rounded text-white/50 hover:text-red-300 bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {collapsed && <div className="flex-1" />}
      {collapsed && conversations.length > 0 && (
        <Link to={`/c/${conversations[0].id}`} title={`Last chat: ${conversations[0].title}`} className="icon-btn w-10 h-10 mb-3 text-white/70 hover:text-white hover:bg-white/10">
          <MessageSquare size={17} />
        </Link>
      )}
      <AccountMenu collapsed={collapsed} onNavigate={onNavigate} />
    </aside>
  );
}
