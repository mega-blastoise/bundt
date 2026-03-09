import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const linkClass = (path: string) =>
    `text-sm transition-colors ${
      isActive(path) ? 'text-violet-400' : 'text-slate-400 hover:text-white'
    }`;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center font-mono font-bold text-sm text-white">
            b
          </div>
          <span className="font-semibold text-white tracking-tight">
            bundt
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/setup" className={linkClass('/setup')}>
            Setup
          </Link>
          <Link to="/cookbook" className={linkClass('/cookbook')}>
            Cookbook
          </Link>
          <a href="#packages" className="text-sm text-slate-400 hover:text-white transition-colors">
            Packages
          </a>
          <a
            href="https://docs.bundt-dev.io"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Docs
          </a>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/mega-blastoise/bundt"
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
          <a
            href="https://www.npmjs.com/org/bundt"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-1.5 text-sm font-medium rounded-lg bg-violet-500 hover:bg-violet-400 text-white transition-colors"
          >
            npm
          </a>
        </div>
      </div>
    </nav>
  );
}
