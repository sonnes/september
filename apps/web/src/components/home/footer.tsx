export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="max-w-none sm:whitespace-nowrap">
          © {new Date().getFullYear()} September. Communication with fewer keystrokes.
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-6">
          {/* Anchor links here give small screens a path to the sections — the
              hero nav hides Features/About below md. */}
          <a href="#features" className="inline-flex min-h-11 items-center transition hover:text-zinc-950">
            Features
          </a>
          <a href="#calls" className="inline-flex min-h-11 items-center transition hover:text-zinc-950">
            Mac app
          </a>
          <a
            href="#privacy"
            className="inline-flex min-h-11 items-center transition hover:text-zinc-950"
          >
            Privacy
          </a>
          <a href="#about" className="inline-flex min-h-11 items-center transition hover:text-zinc-950">
            About
          </a>
          <a
            href="https://github.com/sonnes/september"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center transition hover:text-zinc-950"
          >
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}
