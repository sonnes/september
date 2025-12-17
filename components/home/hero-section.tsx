import Image from 'next/image';
import Link from 'next/link';

import { Github } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { EditorProvider } from '@/components-v4/editor/context';
import Editor from '@/components-v4/editor/editor';
import { KeyboardProvider } from '@/components-v4/keyboards';

export function HeroSection() {
  return (
    <section className="hidden flex-col items-center px-3 pt-4 lg:flex">
      <div className="relative flex w-full flex-col overflow-hidden rounded-2xl bg-indigo-600">
        {/* Navbar inside card */}
        <nav className="flex w-full items-center justify-between px-9 py-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="September Logo" width={40} height={40} />
            <span className="text-2xl font-bold text-primary-foreground">september</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="https://github.com/sonnes/september"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary-foreground/80 transition hover:text-primary-foreground"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="text-sm font-medium">GitHub</span>
            </Link>
            <Link
              href="/onboarding"
              className="rounded-full bg-primary-foreground px-5 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-primary-foreground/90"
            >
              Try Now
            </Link>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex flex-row gap-8 p-9 pt-6 xl:gap-12">
          {/* Left Column - Hero Content */}
          <div className="flex flex-1 flex-col gap-6">
            <h1 className="text-4xl font-bold leading-tight text-primary-foreground xl:text-5xl">
              <span className="text-amber-400">Faster</span> Communication
              <br />
              <span className="text-amber-400">Fewer</span> Keystrokes
            </h1>

            <p className="max-w-lg text-lg text-primary-foreground/80">
              A communication assistant for people living with ALS, MND, and other speech & motor
              difficulties
            </p>

            <div className="flex flex-row items-center gap-4">
              <Button
                asChild
                className="h-12 rounded-full bg-amber-500 px-8 text-base font-semibold text-white shadow-lg hover:bg-amber-600 hover:shadow-xl"
              >
                <Link href="/onboarding">Get Started</Link>
              </Button>
              <Badge
                asChild
                variant="secondary"
                className="w-fit border-primary-foreground/20 bg-primary-foreground/10 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-foreground/20"
              >
                <a
                  href="https://github.com/sonnes/september"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-4 w-4" />
                  <span>Open Source</span>
                </a>
              </Badge>
            </div>
          </div>

          {/* Right Column - Interactive Demo */}
          <div className="flex flex-1 flex-col justify-center">
            <div className="overflow-hidden rounded-xl border border-primary-foreground/10 bg-white shadow-2xl">
              <div className="flex items-center gap-1.5 border-b border-gray-100 px-3 py-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-green-400"></div>
                <span className="ml-2 text-xs font-medium text-gray-400">September</span>
              </div>
              <div className="p-4">
                <EditorProvider defaultText="I would like ">
                  <KeyboardProvider>
                    <Editor />
                  </KeyboardProvider>
                </EditorProvider>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
