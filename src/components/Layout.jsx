import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Layers } from 'lucide-react';
import { conversations as conversationsApi } from '../services/api';
import AppSidebar from './AppSidebar';
import SearchDialog from './SearchDialog';
import { useMediaQuery } from './workspace/useMediaQuery';

const COLLAPSED_KEY = 'tdph.sidebarCollapsed';

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch { return false; }
}

/**
 * The app frame: the sidebar (new chat, search, Library, Assets, recent conversations) and the page beside it.
 * Pages get reloadConversations through the outlet context, to refresh the list after they change a chat.
 */
export default function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const roomy = useMediaQuery('(min-width: 768px)');
  const [list, setList] = useState([]);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawer, setDrawer] = useState(false);
  const [searching, setSearching] = useState(false);
  const [compact, setCompactSidebar] = useState(false); // a page asked for the rail (a deck open beside the chat)

  const reloadConversations = useCallback(
    () => conversationsApi.list().then((d) => setList(d.conversations || [])).catch(() => {}),
    [],
  );
  useEffect(() => { reloadConversations(); }, [reloadConversations]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearching(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try { localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1'); } catch { /* per-browser convenience only */ }
      return !c;
    });
  }

  const activeId = Number(pathname.match(/^\/c\/(\d+)/)?.[1]) || null;

  async function deleteConversation(id) {
    try {
      await conversationsApi.delete(id);
      if (id === activeId) navigate('/');
      reloadConversations();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  const sidebar = (mobile) => (
    <AppSidebar collapsed={!mobile && (collapsed || compact)}
      onToggle={mobile ? () => setDrawer(false) : compact ? () => setCompactSidebar(false) : toggleCollapsed}
      conversations={list} activeId={activeId} onDelete={deleteConversation}
      onSearch={() => { setDrawer(false); setSearching(true); }}
      onNavigate={() => setDrawer(false)} />
  );

  return (
    <div className="h-screen flex bg-canvas font-body text-ink">
      {roomy && sidebar(false)}
      {!roomy && drawer && (
        <div className="fixed inset-0 z-40 flex" onClick={() => setDrawer(false)}>
          <div className="h-full shadow-xl" onClick={(e) => e.stopPropagation()}>{sidebar(true)}</div>
          <div className="flex-1 bg-black/30" />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        {!roomy && (
          <header className="shrink-0 h-12 flex items-center gap-2 px-2 bg-white border-b border-border">
            <button type="button" onClick={() => setDrawer(true)} className="icon-btn w-10 h-10" aria-label="Open menu"><Menu size={19} /></button>
            <Link to="/" className="flex items-center gap-2 no-underline">
              <span className="w-6 h-6 rounded-md bg-navy text-white flex items-center justify-center"><Layers size={13} /></span>
              <span className="font-heading text-[16px] font-bold text-navy">TDPH</span>
            </Link>
          </header>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Outlet context={{ reloadConversations, setCompactSidebar }} />
        </div>
      </div>
      {searching && <SearchDialog conversations={list} onClose={() => setSearching(false)} />}
    </div>
  );
}
