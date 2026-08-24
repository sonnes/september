import { Link } from '@tanstack/react-router';
import { Delete, Github, Pin, Undo2, Volume2 } from 'lucide-react';

import { BrandMark, BrandWordmark } from '@/components/brand';

import { Badge } from '@september/ui/components/badge';
import { Button } from '@september/ui/components/button';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Calls', href: '#calls' },
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

        <div className="grid overflow-hidden rounded-2xl shadow-lg lg:grid-cols-2">
          {/* Copy panel — the one bold indigo surface on the page. */}
          <div className="flex flex-col items-start gap-5 bg-linear-160 from-indigo-500 via-indigo-600 to-indigo-700 p-6 sm:gap-6 sm:p-10 lg:p-12">
            <span className="rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              Free &amp; open source
            </span>

            {/* Each line is an unbreakable block and the size is fluid, so the
                tagline holds exactly two lines at every width. */}
            <h1 className="text-[clamp(1.25rem,6vw,2.25rem)] font-bold leading-[1.12] tracking-tight text-primary-foreground lg:text-[clamp(1.75rem,3.4vw,2.75rem)]">
              <span data-tagline-line className="block whitespace-nowrap">
                <span className="text-amber-300">Faster</span> Communication
              </span>
              <span data-tagline-line className="block whitespace-nowrap">
                <span className="text-amber-300">Fewer</span> Keystrokes
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
                className="h-11 rounded-full bg-primary-foreground px-6 text-sm font-semibold text-indigo-600 shadow-lg transition hover:bg-primary-foreground/90 hover:shadow-xl sm:h-12 sm:px-8 sm:text-base"
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

/**
 * A still of the Talk console, cropped off the right and bottom edges of a
 * quiet gallery. It is an illustration, not a second demo — the working one is
 * the section directly below, so nothing here takes focus.
 */
function ConsolePeek() {
  return (
    <div
      data-hero-peek
      aria-hidden="true"
      className="relative min-h-[300px] overflow-hidden bg-indigo-50 sm:min-h-[380px] lg:min-h-[560px]"
    >
      <div className="absolute -right-10 -bottom-10 top-8 left-8 flex flex-col gap-3 rounded-tl-[22px] border border-indigo-100 bg-white p-4 shadow-xl sm:-right-14 sm:-bottom-12 sm:top-12 sm:left-12 sm:p-5">
        <div className="flex justify-end pr-16 sm:pr-24">
          <span className="flex max-w-[85%] items-start gap-2 rounded-lg rounded-br-sm bg-accent px-4 py-2.5 text-accent-foreground">
            <Volume2 className="mt-1 size-4 shrink-0 opacity-60" />
            <span className="text-sm leading-snug sm:text-base">
              Good morning! Ready when you are.
            </span>
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 rounded-lg bg-muted/40 p-3">
          <div className="flex gap-2">
            {['Hello', 'Thank you'].map(chip => (
              <span
                key={chip}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-card px-5 text-base font-medium text-foreground"
              >
                <Pin className="size-3.5 text-primary/60" />
                {chip}
              </span>
            ))}
          </div>

          <div className="flex flex-nowrap items-center gap-1.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold uppercase text-muted-foreground">
              G
            </span>
            <span className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-primary/70 bg-primary/10 px-4 text-base font-medium text-foreground">
              coffee,
            </span>
            <span className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-primary/40 bg-card px-4 text-base font-medium text-foreground">
              please
            </span>
            <span className="grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground">
              <Volume2 className="size-4" />
            </span>
          </div>

          <div className="rounded-2xl border-2 border-input bg-background p-3">
            <p className="text-xl font-medium leading-snug text-foreground sm:text-2xl">
              I’d like a co
              <span
                data-caret
                className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-[0.12em] animate-caret-blink bg-primary motion-reduce:animate-none"
              />
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="flex size-11 items-center justify-center rounded-md border bg-card text-muted-foreground">
                  <Undo2 className="size-5" />
                </span>
                <span className="flex size-11 items-center justify-center rounded-md border bg-card text-muted-foreground">
                  <Delete className="size-5" />
                </span>
              </div>
              <span className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                <Volume2 className="size-4" />
                Speak
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
