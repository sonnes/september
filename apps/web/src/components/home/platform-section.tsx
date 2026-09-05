import { Button } from '@september/ui/components/button';
import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';

import { SectionHeader } from './section-header';

export function PlatformSection() {
  return (
    <section id="calls" className="scroll-mt-4 bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-9">
        <SectionHeader
          eyebrow="Where September works"
          title="In your browser. At home on your Mac."
          lede="Start in the browser with nothing to install, or use the Mac app with Apple Intelligence for writing help on your device."
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <article className="flex flex-col gap-4 border-t border-zinc-200 bg-white pt-6 sm:pr-8">
            <div className="flex flex-wrap gap-2">
              <Tag className="bg-indigo-50 text-indigo-700">In your browser</Tag>
            </div>
            <h3 className="text-2xl font-bold leading-tight text-zinc-950">
              Start now — nothing to install.
            </h3>
            <p className="text-base leading-relaxed text-zinc-600">
              Open September and begin. Your spaces, notes, phrases, and voice stay in this browser.
              No account is required.
            </p>
            <Points
              points={[
                'Works on a tablet, a laptop, or a desktop.',
                'Suggestions and system voices work offline without cloud services.',
              ]}
            />
            <Button asChild className="mt-auto h-11 w-fit rounded-full px-6 text-sm font-semibold">
              <Link to="/welcome">Get started</Link>
            </Button>
          </article>

          <article className="flex flex-col gap-4 border-t border-zinc-200 bg-white pt-6 sm:pr-8">
            <div className="flex flex-wrap gap-2">
              <Tag className="bg-zinc-100 text-zinc-700">On your Mac</Tag>
              <Tag className="bg-amber-100 text-amber-800">Alpha</Tag>
            </div>
            <h3 className="text-2xl font-bold leading-tight text-zinc-950">
              Built for Apple Intelligence.
            </h3>
            <p className="text-base leading-relaxed text-zinc-600">
              The full September app on your Mac, designed to work with Apple Intelligence for
              on-device writing help on supported Macs. Still in alpha.
            </p>
            <Points
              points={[
                'Talk, spaces, notes, and saved phrases in one app.',
                'September Microphone brings your voice into calls.',
                'Your keys stay in the macOS Keychain.',
              ]}
            />
            <div className="mt-auto">
              <Button asChild className="h-11 w-fit rounded-full px-6 text-sm font-semibold">
                <a href="https://github.com/sonnes/september/releases/download/v0.1.0-alpha.1/September_0.1.0-alpha.1_aarch64.dmg">
                  Download for Mac
                </a>
              </Button>
              <p className="mt-3 text-sm text-zinc-600">Apple Silicon · macOS 26 or later</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Tag({ children, className }: { children: string; className: string }) {
  return (
    <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function Points({ points }: { points: string[] }) {
  return (
    <ul className="grid gap-2.5">
      {points.map(point => (
        <li key={point} className="flex items-start gap-2 text-base leading-relaxed text-zinc-700">
          <Check className="mt-1 size-4 shrink-0 text-indigo-600" aria-hidden="true" />
          {point}
        </li>
      ))}
    </ul>
  );
}
