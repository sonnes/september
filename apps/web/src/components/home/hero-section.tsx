import { Link } from '@tanstack/react-router';

import { Button } from '@/packages/ui/components/button';

export function HeroSection() {
  return (
    <section className="bg-zinc-100 p-2 sm:p-3">
      <div
        data-home-hero-panel
        className="flex min-h-[300px] flex-col overflow-hidden rounded-2xl bg-indigo-600 px-5 py-5 text-white shadow-sm sm:px-8 sm:py-6 lg:min-h-[420px] lg:px-8"
      >
        <nav className="flex min-h-11 items-center justify-between gap-4">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img
              src="/logo.png"
              alt="September Logo"
              width={40}
              height={40}
              className="h-9 w-9 rounded-lg bg-white sm:h-10 sm:w-10"
              loading="lazy"
            />
            <span className="text-xl font-bold">september</span>
          </Link>

          <a
            href="https://github.com/sonnes/september"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden min-h-11 items-center rounded-full border border-white/30 px-5 text-sm font-semibold text-white/90 transition hover:bg-white/10 sm:inline-flex"
          >
            Open source
          </a>
        </nav>

        <div className="flex max-w-2xl flex-1 flex-col justify-center gap-4 py-8 sm:py-10 lg:py-12">
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-normal text-white sm:text-5xl">
            <span className="block text-amber-400 sm:inline">Faster</span> Communication.
            <br />
            <span className="block text-amber-400 sm:inline">Fewer</span> Keystrokes.
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
            September helps you write and speak everyday messages with fewer taps.
          </p>

          <div>
            <Button
              asChild
              size="lg"
              className="min-h-12 bg-white px-6 font-bold text-indigo-600 hover:bg-white/90"
            >
              <Link to="/onboarding">Start setup</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
