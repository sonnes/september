import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';

import { Button } from '@september/ui/components/button';

import { SectionHeader } from './section-header';

export function PlatformSection() {
  return (
    <section id="calls" className="scroll-mt-4 bg-zinc-100 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-9">
        <SectionHeader
          eyebrow="Where September works"
          title="In your browser today. On your Mac for calls."
          lede="September runs where you talk. Start in the browser with nothing to install. The Mac app takes your words into video calls and keeps writing help on the device."
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <article className="flex flex-col gap-4 rounded-2xl border bg-white p-6 shadow-lg sm:p-8">
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
                'Suggestions and the system voice work without the internet services.',
              ]}
            />
            <Button
              asChild
              className="mt-auto h-11 w-fit rounded-full px-6 text-sm font-semibold"
            >
              <Link to="/welcome">Get started</Link>
            </Button>
          </article>

          <article className="flex flex-col gap-4 rounded-2xl border bg-white p-6 shadow-lg sm:p-8">
            <div className="flex flex-wrap gap-2">
              <Tag className="bg-zinc-100 text-zinc-700">On your Mac</Tag>
              <Tag className="bg-amber-100 text-amber-800">Coming soon</Tag>
            </div>
            <h3 className="text-2xl font-bold leading-tight text-zinc-950">
              Your seat at the video call.
            </h3>
            <p className="text-base leading-relaxed text-zinc-600">
              September Microphone joins FaceTime and Zoom. Your typed words are spoken directly
              into the call.
            </p>
            <Points
              points={[
                'Apple Intelligence gives writing help without the internet.',
                'Your keys stay in the macOS Keychain.',
              ]}
            />
            <a
              href="https://github.com/sonnes/september"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto inline-flex min-h-11 w-fit items-center text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
            >
              Follow along on GitHub →
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}

function Tag({ children, className }: { children: string; className: string }) {
  return (
    <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${className}`}>{children}</span>
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
