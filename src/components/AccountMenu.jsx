import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, LogOut, Users } from 'lucide-react';
import { useAuth, initialsOf } from '../contexts/auth';

/** The signed-in person at the foot of the sidebar: their name, and a menu to change password or sign out. */
export default function AccountMenu({ collapsed, onNavigate = () => {} }) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!user) return null;
  const name = user.display_name || user.username;
  const item = 'flex items-center gap-2.5 w-full px-3 h-9 rounded-md text-[14px] text-ink no-underline bg-transparent border-0 cursor-pointer text-left hover:bg-canvas';

  return (
    <div ref={box} className={`relative shrink-0 border-t border-white/10 ${collapsed ? 'py-2 flex justify-center' : 'p-2'}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
        title={collapsed ? name : 'Account'}
        className={`flex items-center gap-2.5 rounded-lg bg-transparent border-0 cursor-pointer text-left hover:bg-white/10 ${collapsed ? 'w-10 h-10 justify-center' : 'w-full px-2 h-12'}`}>
        <span className="w-8 h-8 rounded-full bg-cobalt text-white text-[12px] font-semibold flex items-center justify-center shrink-0">{initialsOf(user)}</span>
        {!collapsed && (
          <span className="flex-1 min-w-0">
            <span className="block truncate text-[14px] font-medium text-white">{name}</span>
            <span className="block truncate text-[12px] text-white/55">{user.role === 'admin' ? 'Admin' : user.username}</span>
          </span>
        )}
      </button>
      {open && (
        <div role="menu" className={`absolute z-30 bottom-full mb-1 w-[230px] bg-white rounded-lg shadow-xl border border-border p-1.5 ${collapsed ? 'left-2' : 'left-2 right-2 w-auto'}`}>
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="m-0 text-[14px] font-semibold text-ink truncate">{name}</p>
            <p className="m-0 text-[12px] text-slate truncate">{user.username}</p>
          </div>
          {user.role === 'admin' && (
            <Link role="menuitem" to="/admin/users" className={item} onClick={() => { setOpen(false); onNavigate(); }}>
              <Users size={16} className="text-slate" />Users
            </Link>
          )}
          <Link role="menuitem" to="/account/password" className={item} onClick={() => { setOpen(false); onNavigate(); }}>
            <KeyRound size={16} className="text-slate" />Change password
          </Link>
          <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); signOut(); }}>
            <LogOut size={16} className="text-slate" />Sign out
          </button>
        </div>
      )}
    </div>
  );
}
