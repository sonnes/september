import { Badge } from '@september/ui/components/badge';
import { Button } from '@september/ui/components/button';
import { Link } from '@tanstack/react-router';
import { ArrowDown, Github, Volume2 } from 'lucide-react';

import { BrandMark, BrandWordmark } from '@/components/brand';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Mac app', href: '#calls' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'About', href: '#about' },
];

export function HeroSection() {
  return (
    <section className="px-3 pt-2 sm:px-4">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap items-center justify-between gap-3 py-3 sm:py-4">
          <Link to="/" aria-label="September home" className="flex items-center gap-2">
            <BrandMark size={40} className="size-8 sm:size-10" />
            <BrandWordmark aria-hidden="true" className="text-xl sm:text-2xl" />
          </Link>

          <div className="flex items-center gap-1 sm:gap-4">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="hidden min-h-11 items-center px-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-950 sm:inline-flex"
              >
                {link.label}
              </a>
            ))}
            <Button
              asChild
              className="h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              <Link to="/welcome">Get started</Link>
            </Button>
          </div>
        </nav>

        <div className="grid overflow-hidden rounded-surface border border-indigo-100 shadow-sm lg:grid-cols-2">
          {/* Copy panel — the one bold indigo surface on the page. */}
          <div className="flex flex-col items-start gap-5 bg-indigo-600 p-6 sm:gap-6 sm:p-10 lg:p-12">
            <span className="rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1.5 text-sm font-semibold text-primary-foreground">
              Free &amp; open source
            </span>

            {/* Each line is an unbreakable block and the size is fluid, so the
                tagline holds exactly two lines at every width. */}
            <h1 className="text-[clamp(1.25rem,6vw,2.25rem)] font-bold leading-[1.12] tracking-tight text-primary-foreground lg:text-[clamp(1.75rem,3.4vw,2.75rem)]">
              <span data-tagline-line className="block whitespace-nowrap">
                <span className="text-indigo-200">Faster</span> Communication
              </span>
              <span data-tagline-line className="block whitespace-nowrap">
                <span className="text-indigo-200">Fewer</span> Keystrokes
              </span>
            </h1>

            <p className="max-w-[44ch] text-base leading-relaxed text-primary-foreground/85 sm:text-lg">
              A communication assistant for people living with ALS, MND, and other speech &amp;
              motor difficulties.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Button
                asChild
                data-hero-cta
                className="h-11 rounded-full bg-primary-foreground px-6 text-sm font-semibold text-indigo-600 transition hover:bg-primary-foreground/90 sm:h-12 sm:px-8 sm:text-base"
              >
                <Link to="/welcome">Get started</Link>
              </Button>
              <Badge
                asChild
                variant="secondary"
                className="w-fit border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary-foreground/20 sm:px-4 sm:py-2 sm:text-sm"
              >
                <a
                  href="https://github.com/sonnes/september"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Open source</span>
                </a>
              </Badge>
            </div>

            <div className="grid gap-1.5">
              <p className="text-sm text-primary-foreground/80">
                Free to use. Your words can stay on this device.
              </p>
              <p className="text-sm font-medium text-primary-foreground">
                Everything on this page is the real thing — try it as you scroll. ↓
              </p>
            </div>
          </div>

          <ConsolePeek />
        </div>
      </div>
    </section>
  );
}

/** A still showing the typed prefix, suggested words, and spoken result. */
function ConsolePeek() {
  return (
    <div
      data-hero-peek
      aria-hidden="true"
      className="flex min-w-0 flex-col justify-center gap-6 bg-indigo-50 p-6 sm:p-10 lg:p-12"
    >
      <div>
        <p className="mb-3 text-sm font-medium text-zinc-600">You type</p>
        <p className="text-3xl font-medium tracking-tight text-zinc-950 sm:text-4xl">
          I’d like a co
          <span
            data-caret
            className="ml-1 inline-block h-[1em] w-0.5 translate-y-[0.12em] animate-caret-blink bg-indigo-600 motion-reduce:animate-none"
          />
        </p>
      </div>
      <div>
        <p className="mb-3 text-sm font-medium text-zinc-600">Tap to finish</p>
        <div className="flex flex-wrap gap-3">
          {['coffee,', 'please'].map(word => (
            <span
              key={word}
              className="rounded-chip border border-indigo-200 bg-white px-5 py-3 text-xl font-medium text-indigo-700 shadow-sm"
            >
              {word}
            </span>
          ))}
        </div>
      </div>
      <ArrowDown className="size-6 text-indigo-400" />
      <div className="rounded-surface border border-indigo-200 bg-white p-6 shadow-sm">
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-indigo-600">
          <Volume2 className="size-5" />
          September speaks
        </p>
        <p className="text-3xl font-semibold leading-tight tracking-tight text-zinc-950 sm:text-4xl">
          I’d like a coffee, please.
        </p>
      </div>
    </div>
  );
}
