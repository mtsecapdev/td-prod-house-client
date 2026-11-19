import { Link, NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    // The header stays; each page fills the rest of the screen and scrolls itself (the workspace fills it exactly).
    <div className='h-screen flex flex-col bg-canvas font-body text-ink'>
      <header className='shrink-0 bg-white border-b border-border'>
        <div className='max-w-[1180px] w-[90%] mx-auto py-2.5 flex items-center gap-6 flex-wrap'>
          <Link
            to='/'
            className='font-heading text-[17px] font-bold text-navy no-underline'
          >
            TDPH
          </Link>
          <nav className='flex gap-1'>
            <NavLink to='/' className={workspaceClass}>
              Workspace
            </NavLink>
            <NavLink to='/library' className={navClass}>
              Library
            </NavLink>
            <NavLink to='/assets' className={navClass}>
              Assets
            </NavLink>
          </nav>
        </div>
      </header>
      <div className='flex-1 min-h-0 overflow-y-auto'>
        <Outlet />
      </div>
    </div>
  );
}

// The workspace covers / and every conversation (/c/...).
function workspaceClass({ isActive }) {
  const { pathname } = window.location;
  return navClass({ isActive: isActive && (pathname === '/' || pathname.startsWith('/c/') || pathname.startsWith('/g/')) });
}

function navClass({ isActive }) {
  return `inline-flex items-center h-11 px-3.5 rounded font-semibold text-sm no-underline ${
    isActive
      ? 'bg-[#EAF0F8] text-navy'
      : 'text-slate hover:bg-canvas hover:text-navy'
  }`;
}
