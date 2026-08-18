import { Link } from '@tanstack/react-router';
import { Github } from 'lucide-react';

import { BrandMark, BrandWordmark } from '@/components/brand';

import { Badge } from '@/packages/ui/components/badge';
import { Button } from '@/packages/ui/components/button';

export function HeroSection() {
  return (
    <section className="flex flex-col items-center px-3 pt-4">
      <div className="relative flex w-full flex-col overflow-hidden rounded-2xl bg-indigo-600">
        {/* Navbar inside card */}
        <nav className="flex w-full items-center justify-between px-4 py-4 sm:px-6 sm:py-5 lg:px-9 lg:py-6">
          <Link to="/" aria-label="September home" className="flex items-center gap-2">
            <BrandMark size={40} className="size-8 sm:size-10" />
            <BrandWordmark aria-hidden="true" tone="inverse" className="text-xl sm:text-2xl" />
          </Link>

          <div className="flex items-center gap-3 sm:gap-6">
            <a
              href="#features"
              className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-primary-foreground/80 transition hover:text-primary-foreground"
            >
              Features
            </a>
            <a
              href="#about"
              className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-primary-foreground/80 transition hover:text-primary-foreground"
            >
              About
            </a>
          </div>
        </nav>

        {/* Main Content — headline left, supporting copy + CTAs right (stacks on mobile) */}
        <div className="flex flex-1 flex-col gap-6 p-4 pt-4 sm:gap-8 sm:p-6 sm:pt-5 lg:flex-row lg:items-center lg:gap-12 lg:p-9 lg:pt-6">
          <h1 className="text-3xl font-bold leading-tight text-primary-foreground sm:text-4xl xl:text-5xl lg:flex-1">
            <span className="text-amber-300">Faster</span> Communication
            <br />
            <span className="text-amber-300">Fewer</span> Keystrokes
          </h1>

          <div className="flex flex-col gap-4 sm:gap-6 lg:flex-1">
            <p className="max-w-lg text-base text-primary-foreground/80 sm:text-lg">
              A communication assistant for people living with ALS, MND, and other speech & motor
              difficulties
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Button
                asChild
                className="h-11 rounded-full bg-primary-foreground px-6 text-sm font-semibold text-indigo-600 shadow-lg transition hover:bg-primary-foreground/90 hover:shadow-xl sm:h-12 sm:px-8 sm:text-base"
              >
                <Link to="/onboarding">Get Started</Link>
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
                  <span>Open Source</span>
                </a>
              </Badge>
            </div>

            <p className="text-sm text-primary-foreground/80">
              Free to use. Your words can stay on this device.
            </p>
            <p className="text-sm font-medium text-primary-foreground">
              Everything on this page is the real thing — try it as you scroll.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
