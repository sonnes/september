import { Badge } from '@september/ui/components/badge';
import { Button } from '@september/ui/components/button';
import { Link } from '@tanstack/react-router';
import { Download, Github } from 'lucide-react';

import { BrandMark, BrandWordmark } from '@september/app-ui/blocks/brand';
import { KEYBOARD_DOWNLOAD, KEYBOARD_VERSION } from '@/rules/keyboard-release';

import appIcon from '../../../../keyboard/Resources/AppIcon.svg?url';
import { Shot } from './media';

const NAV_LINKS = [
  { label: 'Story', href: '#story' },
  { label: 'Features', href: '#features' },
  { label: 'Access', href: '#access' },
  { label: 'Privacy', href: '#privacy' },
];

export function KeyboardHero() {
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
              className="bg-primary text-primary-foreground h-11 rounded-full px-5 text-sm font-semibold"
            >
              <a href="#download">Download</a>
            </Button>
          </div>
        </nav>

        <div className="rounded-surface overflow-hidden border border-indigo-100 shadow-sm">
          <div className="grid gap-8 bg-indigo-600 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center lg:p-12">
            <div className="flex flex-col items-start gap-5 sm:gap-6">
              <span className="rounded-full bg-amber-300 px-3 py-1.5 text-sm font-semibold text-zinc-950">
                Free &amp; open source
              </span>

              <div>
                <p className="text-primary-foreground/80 mb-3 text-sm font-semibold">
                  September Keyboard for Mac
                </p>
                <h1 className="text-[clamp(1.75rem,6vw,3rem)] leading-[1.1] font-bold tracking-tight text-white">
                  <span className="block">The Accessibility Keyboard,</span>
                  <span className="block text-amber-300">reimagined</span>
                </h1>
              </div>

              <p className="text-primary-foreground/85 max-w-[56ch] text-base leading-relaxed sm:text-lg">
                An on-screen keyboard for macOS that types into any app, predicts the rest of your
                sentence, presses shortcuts, and speaks for you. For anyone who finds a physical
                keyboard slow, painful, or out of reach. Built by a person with ALS.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  asChild
                  className="bg-primary-foreground hover:bg-primary-foreground/90 h-11 rounded-full px-6 text-sm font-semibold text-indigo-600 transition sm:h-12 sm:px-8 sm:text-base"
                >
                  <a href={KEYBOARD_DOWNLOAD}>
                    <Download className="size-5" aria-hidden />
                    Download for Mac
                  </a>
                </Button>
                <Badge
                  asChild
                  variant="secondary"
                  className="focus-attention border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 min-h-11 w-fit px-4 text-sm font-medium transition"
                >
                  <a
                    href="https://github.com/sonnes/september/tree/main/apps/keyboard"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="size-4" aria-hidden />
                    <span>Source</span>
                  </a>
                </Badge>
              </div>

              <p className="text-primary-foreground/80 text-sm">
                Version {KEYBOARD_VERSION} · Apple Silicon · macOS 14 or later
              </p>
            </div>

            <img
              src={appIcon}
              alt=""
              width={160}
              height={160}
              className="hidden size-40 drop-shadow-xl lg:block"
            />
          </div>

          <figure className="bg-white p-3 sm:p-6">
            <Shot
              src="typing.webp"
              still="type.webp"
              alt="The keyboard types 'Are we still on for t' into Messages. Above the input bar, three sentence predictions offer endings such as 'the match tonight?' A row of words above the keys completes the word. A press on a prediction finishes the sentence."
              width={3200}
              height={1075}
              eager
            />
            <figcaption className="mt-4 px-1 text-sm leading-relaxed text-zinc-600">
              Sentence predictions sit above the input bar. Word completions sit above the keys. The
              shortcut panels float at each side.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
