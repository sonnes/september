# September Web — Design Language

This document defines the design language for the web app. It is the source of
truth. Every page must follow it. When something feels off, fix the page — do
not invent a new pattern.

The goal is **consistency**, not novelty. The brand is already chosen: indigo
primary, amber accent, Noto Sans, zinc neutrals, shadcn look. This document
describes how every page assembles those existing pieces the same way.

---

## 1. Foundations

### 1.1 Typography

- **Typeface:** Noto Sans (everywhere). No display face. No serif.
- **Weights in use:** 400 body, 500 labels/nav, 600 section headings, 700 page
  titles.
- **Scale — use these classes, not raw sizes:**
  - Page title: `text-3xl font-bold tracking-tight`
  - Section heading: `text-base font-semibold` with `text-zinc-900`
  - Body: default (`text-sm` in dense UI, `text-base` in reading contexts)
  - Description / meta: `text-sm text-muted-foreground`

### 1.2 Color

Use the CSS variables in `app/globals.css`. Do not hard-code hex values or
arbitrary Tailwind palette shades in page code. The only hard-coded palette
colors that remain are inside the marketing `HeroSection` (which is intentionally
bold and pre-dates this system) and should not be copied into app pages.

- **Primary** — `--primary` (indigo-600). Reserved for primary CTAs and the
  active sidebar state.
- **Accent / warm** — amber. Used sparingly: the sidebar-active rail treatment
  and the marketing hero. Not for buttons.
- **Neutrals** — zinc scale via `--foreground`, `--muted-foreground`, `--border`,
  `--card`.
- **Destructive** — `--destructive` for errors and destructive actions.
- **Semantic tones** — use the `<Callout>` component (see §3). Callout's four
  tones (`info`, `warning`, `success`, `destructive`) cover every banner/alert
  situation.

### 1.3 Spacing and rhythm

- Page padding is owned by `<PageShell>`. Pages do **not** add their own `p-6`.
- Vertical rhythm inside a page uses a single `gap-6` on a flex-column.
  Tight groupings inside a card use `gap-3` or `gap-4`.

### 1.4 Radius, borders, shadows

- Radius follows `--radius` (0.625rem). Use `rounded-md` / `rounded-lg`; avoid
  `rounded-xl` in app chrome.
- Borders are `border` (uses `--border` token). No hand-coded border colors
  outside `<Callout>` internals.
- Shadows: shadcn defaults. Don't add bespoke drop shadows inside pages.

---

## 2. Page shell

Every page inside `app/(app)` assembles the same three parts, in this order.

```tsx
<SidebarLayout.Header>
  <PageHeader breadcrumbs={[…]} />   {/* owns trigger + separator + breadcrumbs */}
</SidebarLayout.Header>

<SidebarLayout.Content>
  <PageShell width="default">
    <PageTitle
      title="…"
      description="…"
      actions={<Button>…</Button>}
    />
    {/* page body */}
  </PageShell>
</SidebarLayout.Content>
```

### 2.1 `<PageHeader>`

Lives in `apps/web/components/layout/page-header.tsx`. It contains — and only
contains — the sidebar trigger, a separator, and an optional breadcrumb trail.
It never contains the page title. Pages with a mobile-specific header (e.g.
chat detail) may replace it; they still must not render the page title inside
it.

```tsx
<PageHeader breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Providers' }]} />
```

### 2.2 `<PageShell>`

Lives in `apps/web/components/layout/page-shell.tsx`. Owns content padding and
width.

- `width="default"` → `max-w-3xl` — lists, short forms
- `width="wide"` → `max-w-4xl` — editors, chat timelines
- `width="form"` → `max-w-2xl` — settings forms
- `width="full"` → no max width — talk, onboarding, dashboards with full-bleed
  composition

Padding: `px-4 py-6 sm:px-6 md:py-8`. Pages do not add extra padding.

### 2.3 `<PageTitle>`

Lives in `apps/web/components/layout/page-title.tsx`. Renders the page title
(`h1`), optional description, and optional right-aligned actions.

- Exactly one `PageTitle` per page. If you feel the need for two, split the
  page.
- Title text is the page's name, not a re-statement. Say "Providers", not
  "Providers Configuration". Say "Voices", not "Find similar voices".
- Actions sit to the right on desktop, stack below on mobile.

```tsx
<PageTitle
  title="Chats"
  description="Your ongoing conversations."
  actions={
    <Button onClick={handleNewChat}>
      <PlusIcon className="size-4" />
      New chat
    </Button>
  }
/>
```

---

## 3. State components

Four shared primitives replace the ad-hoc loading/error/empty/warning UI
scattered across pages today. They live in `packages/ui/components/` and wrap
existing shadcn primitives — nothing new visually, just reused.

### 3.1 `<Callout>`

Replaces: hand-rolled `bg-amber-50 border border-amber-200` divs, `Card` used
as a warning box, bare `<Alert>` with custom color classes.

Four tones:

| Tone          | Use for                                                       |
|---------------|---------------------------------------------------------------|
| `info`        | Neutral explanatory notices (default)                         |
| `warning`     | "API key required", heads-ups that do not block the user      |
| `success`     | Saved, configured, ready                                      |
| `destructive` | Dangerous or failed state that needs attention                |

```tsx
<Callout tone="warning" title="API Key Required">
  AI transcription requires a Gemini API key. Configure it in{' '}
  <a href="/settings/providers" className="underline">AI Providers</a>.
</Callout>
```

### 3.2 `<ErrorState>`

Replaces: the red inline div (chats list), the circular-icon card (chat
detail, write detail), the bare `<p>` (voices).

```tsx
<ErrorState
  title="Failed to load chats"
  description={error.message}
  onRetry={() => window.location.reload()}
/>
```

### 3.3 `<EmptyState>`

Replaces: bespoke empty UI inside list components.

```tsx
<EmptyState
  icon={MessageCircle}
  title="No chats yet"
  description="Start a conversation to see it here."
  action={<Button onClick={handleNewChat}>New chat</Button>}
/>
```

### 3.4 `<LoadingState>`

Wraps a spinner + label for inline loading and a centered spinner for
page-level loading. Domain skeletons (chat messages, document editor) stay
where they are — they're different.

```tsx
<LoadingState variant="inline" label="Loading account settings…" />
<LoadingState variant="page" />
```

---

## 4. Page-type recipes

### 4.1 List page (chats, write, voices)

```tsx
<SidebarLayout.Header>
  <PageHeader breadcrumbs={[{ label: 'Chats' }]} />
</SidebarLayout.Header>
<SidebarLayout.Content>
  <PageShell width="default">
    <PageTitle title="Chats" actions={<Button>…</Button>} />

    {isLoading && <LoadingState variant="page" />}
    {error && <ErrorState title="…" description={error.message} onRetry={…} />}
    {data && data.length === 0 && <EmptyState … />}
    {data && data.length > 0 && <List items={data} />}
  </PageShell>
</SidebarLayout.Content>
```

### 4.2 Detail / editor page (chat/[id], write/[id])

Use `width="wide"`. The editor fills the shell; a sticky bottom compose area
may break out of the shell width — that's allowed. Header may include
page-specific actions (e.g. Display button), but still no duplicate title.

### 4.3 Settings subpage (providers, suggestions, transcription, speech)

Use `width="form"`. Breadcrumb is `Settings / <Name>`. `PageTitle` is the one
name of the subject ("Providers"), not "Providers Configuration". Warnings go
in `<Callout tone="warning">`.

### 4.4 Single-purpose page (talk, clone)

Use `width="full"`. `PageTitle` is short and descriptive ("Talk", "Clone your
voice"). Sticky bottom compose UIs in `talk` break out of the shell width.

### 4.5 Marketing / legal (`/`, `/privacy-policy`, `/terms-of-service`)

These are **not** app pages and do not use `SidebarLayout`. They live under
`app/(marketing)/` with a lightweight layout: the hero nav + the existing
`Footer`. Legal pages still follow §3 (use `<Callout>` for highlighted
notices) so a user moving from the app into legal sees consistent banner
styling.

### 4.6 Broadcast surfaces (`/display/[id]`, `/present/[id]`, `/preview`)

Intentionally different. Black canvas, full-bleed, large type. They are
out-of-scope of this document.

---

## 5. Anti-patterns

Do not do any of these:

- **Duplicate the page title.** If the breadcrumb says "Providers", the
  `PageTitle` says "Providers" — not "Providers Configuration" and not both in
  the content area.
- **Hand-code amber/blue/red banners.** Use `<Callout>`.
- **Invent a new error layout.** Use `<ErrorState>`.
- **Add `p-6` inside a `PageShell`.** The shell owns padding.
- **Pick a random `max-w-*`.** Use `PageShell`'s `width` prop.
- **Reach into `(app)` chrome from legal pages** by wrapping them in the
  sidebar. They belong under `(marketing)`.

---

## 6. Accessibility rules (non-negotiable)

The audience includes users with ALS/MND and motor difficulties. Therefore:

- Primary touch targets are at least 44×44 px. Use `size="default"` or larger
  on `<Button>` for primary actions; `size="sm"` is only for dense secondary
  rows.
- Focus rings (from shadcn tokens) are preserved — never `outline: none`
  without providing an equivalent.
- Color is never the only channel for state. Error text also gets a label;
  Callouts always include an icon.
- Keystrokes matter. Never require a mouse-only gesture for a primary path.

---

## 7. Where things live

```
apps/web/
  app/
    (app)/               → app pages, use SidebarLayout + PageShell
    (marketing)/         → / + /privacy-policy + /terms-of-service
    display/             → broadcast surfaces, unstyled by this doc
    present/             → broadcast surfaces
    preview/             → broadcast surfaces
  components/
    layout/
      page-header.tsx    → breadcrumbs + sidebar trigger
      page-shell.tsx     → width + padding
      page-title.tsx     → title + description + actions
    sidebar/             → existing sidebar chrome
packages/ui/components/
  callout.tsx            → four-tone banner
  empty-state.tsx        → empty-list illustration + action
  error-state.tsx        → error + retry
  loading-state.tsx      → page / inline loading
```

---

## 8. Maintenance

When you catch a page drifting from this document:

1. Fix the page, not the document.
2. If the document is wrong, update it in the same PR that fixes the page.
3. If a new page type is genuinely needed, add a §4 recipe before merging.
