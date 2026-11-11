import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { generations } from '../services/api';

export default function Layout() {
  const { pathname } = useLocation();
  const prevPath = useRef(pathname);

  useEffect(() => {
    const wasImage = prevPath.current.startsWith('/create/image/');
    const isImage = pathname.startsWith('/create/image/');
    prevPath.current = pathname;

    if (wasImage && !isImage) {
      generations.releaseGpu().catch(() => {});
    }
  }, [pathname]);
  return (
    <div className='min-h-screen bg-canvas font-body text-ink'>
      <header className='bg-white border-b border-border'>
        <div className='max-w-[1180px] w-[90%] mx-auto py-2.5 flex items-center gap-6 flex-wrap'>
          <Link
            to='/'
            className='font-heading text-[17px] font-bold text-navy no-underline'
          >
            TDPH
          </Link>
          <nav className='flex gap-1'>
            <NavLink to='/' end className={navClass}>
              Create
            </NavLink>
            <NavLink to='/library' className={navClass}>
              Library
            </NavLink>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

function navClass({ isActive }) {
  return `inline-flex items-center h-11 px-3.5 rounded font-semibold text-sm no-underline ${
    isActive
      ? 'bg-[#EAF0F8] text-navy'
      : 'text-slate hover:bg-canvas hover:text-navy'
  }`;
}
