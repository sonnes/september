import { Link } from '@tanstack/react-router';

export function MarketingNav() {
  return (
    <nav className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="" width={32} height={32} loading="lazy" />
          <span className="text-base font-semibold text-zinc-900">september</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link
            to="/"
            className="text-zinc-600 transition-colors hover:text-zinc-900"
          >
            Home
          </Link>
          <Link
            to="/dashboard"
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-white transition-colors hover:bg-indigo-700"
          >
            Open app
          </Link>
        </div>
      </div>
    </nav>
  );
}
