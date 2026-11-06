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

- **Typeface:** Noto Sans. Note titles and headings use Fraunces (`font-heading`).
- **Weights in use:** 400 body, 500 labels/nav, 600 section headings, 700 page
  titles.
- **Scale — use these classes, not raw sizes:**
  - Page title: `text-3xl font-bold tracking-tight`
  - Section heading: `text-base font-semibold` with `text-zinc-900`
  - Body: default (`text-sm` in dense UI, `text-base` in reading contexts)
  - Description / meta: `text-sm text-muted-foreground`

### 1.2 Color

Use the CSS variables in `packages/ui/theme.css`, which `src/styles/globals.css` imports. Do not hard-code hex values or
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
- **Semantic tones** — use the `<Callout>` component (see §2). Callout's four
  tones (`info`, `warning`, `success`, `destructive`) cover every banner/alert
  situation.

### 1.3 Spacing and rhythm

- `Screen` in `packages/app-ui/blocks/screen.tsx` owns the padding and the
  width of an app screen. A screen does not add its own `p-6`.
- Vertical rhythm inside a page uses a single `gap-6` on a flex-column.
  Tight groupings inside a card use `gap-3` or `gap-4`.

### 1.4 Radius, borders, shadows

- Radius follows `--radius` (0.625rem). Use `rounded-md` / `rounded-lg`; avoid
  `rounded-xl` in app chrome.
- Borders are `border` (uses `--border` token). No hand-coded border colors
  outside `<Callout>` internals.
- Shadows: shadcn defaults. Don't add bespoke drop shadows inside pages.

---

## 2. State components

- `<Callout>` in `packages/ui/components/callout.tsx` is the one banner. It has
  four tones: `info` (the default), `warning`, `success`, and `destructive`.
  Each tone has its own icon.
- `<Problem>` in `packages/app-ui/blocks/states.tsx` shows an error that stops
  a screen.
- `<EmptyState>` in `packages/app-ui/blocks/states.tsx` shows a screen with
  nothing in it yet, and the key that starts it.

```tsx
<Callout tone="warning" title="API Key Required">
  Connect ElevenLabs in Settings to use this voice.
</Callout>
```

---

## 3. Anti-patterns

Do not do any of these:

- **Hand-code amber/blue/red banners.** Use `<Callout>`.
- **Invent a new error layout.** Use `<Problem>`.
- **Add `p-6` inside a `Screen`.** The screen owns padding.

---

## 4. Accessibility rules (non-negotiable)

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

## 5. Maintenance

When you catch a page drifting from this document:

1. Fix the page, not the document.
2. If the document is wrong, update it in the same PR that fixes the page.
3. If a new pattern is needed, add it to this document before merging.
