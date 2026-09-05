import { Button } from '@september/ui/components/button';
import { Link } from '@tanstack/react-router';

export function PlatformSection() {
  return (
    <section id="calls" className="scroll-mt-4 bg-zinc-100 px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_1fr_1fr] lg:gap-12">
        <div>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-zinc-950 sm:text-4xl">
            Your next conversation starts here.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-700">
            Free and open source. Start on your own, or with someone beside you.
          </p>
        </div>
        <div className="flex flex-col items-start gap-4 border-t border-zinc-300 pt-6 lg:border-t-0 lg:pt-0">
          <h3 className="text-xl font-semibold text-zinc-950">In your browser</h3>
          <p className="text-base leading-relaxed text-zinc-700">
            Nothing to install. Talk, spaces, phrases, and notes on your tablet, laptop, or desktop.
          </p>
          <Button asChild className="mt-auto h-12 rounded-full px-6 text-base font-semibold">
            <Link to="/welcome">Get started</Link>
          </Button>
        </div>
        <div className="flex flex-col items-start gap-4 border-t border-zinc-300 pt-6 lg:border-t-0 lg:pt-0">
          <h3 className="flex flex-wrap items-center gap-3 text-xl font-semibold text-zinc-950">
            On your Mac{' '}
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
              Alpha
            </span>
          </h3>
          <p className="text-base leading-relaxed text-zinc-700">
            The full app, designed for Apple Intelligence on supported Macs. On-device writing help,
            with September Microphone for calls.
          </p>
          <div className="mt-auto">
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full border-zinc-400 bg-white px-6 text-base font-semibold"
            >
              <a href="https://github.com/sonnes/september/releases/download/v0.1.0-alpha.1/September_0.1.0-alpha.1_aarch64.dmg">
                Download for Mac
              </a>
            </Button>
            <p className="mt-3 text-sm text-zinc-600">Apple Silicon · macOS 26 or later</p>
          </div>
        </div>
      </div>
    </section>
  );
}
