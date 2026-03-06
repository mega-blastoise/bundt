export function Footer() {
  return (
    <footer className="border-t border-slate-800/50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center font-mono font-bold text-xs text-white">
              b
            </div>
            <span className="text-sm text-slate-400">
              bundt
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a
              href="https://docs.bundt-dev.io"
              className="hover:text-slate-300 transition-colors"
            >
              Docs
            </a>
            <a
              href="https://github.com/mega-blastoise/bundt"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/org/bundt"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              npm
            </a>
            <a
              href="https://bitcontextprotocol.com"
              className="hover:text-slate-300 transition-colors"
            >
              BCP
            </a>
          </div>

          <p className="text-xs text-slate-600">
            MIT License &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
