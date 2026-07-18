# Design System — September

> Extracted from the live web app (`apps/web/app/globals.css`, `packages/ui`) on 2026-06-12 via `/design-consultation`. A Noto + zinc + indigo system tuned **calm and roomy** for its audience.

## Product Context

- **What this is:** An assistive communication app — fewer keystrokes to full expression for people who type slowly or not at all.
- **Who it's for:** People living with ALS, MND, or other speech & motor difficulties. Many use switch access, eye-gaze, or single-finger input. Caregivers and conversation partners are secondary users.
- **Space/industry:** Assistive technology / AAC (augmentative and alternative communication).
- **Project type:** Web app (Next.js 15 · React 19 · Tailwind v4 · shadcn). A native macOS app shares the spec only.

## Design Thesis

**Calm, dignified, low-effort.** Every pixel should reduce the work of being understood. The interface stays quiet so the user's words are the loud thing; it never feels clinical, never makes the user hurry. Indigo carries warmth and trust; generous spacing reads as ease, not emptiness. When a choice trades density for reach, reach wins — this is software operated under physical constraint.

Design that serves this thesis: large calm targets, one confident accent, predictable rhythm, motion only when it explains. Design that betrays it: cramped rows, hover-only affordances, decorative flourish, anything that adds a keystroke.

## Aesthetic Direction

- **Direction:** Quiet utility with a warm spine — function-first, but humane.
- **Decoration level:** Minimal. Typography, whitespace, and the indigo accent do the work.
- **Density:** **Roomy desktop.** Deliberately less compact than a productivity tool — 64px header, `rounded-xl` cards, `gap-6`. Spacing is an accessibility feature here, not a style.
- **Mood:** A calm, trustworthy companion. Clean and modern without feeling like enterprise dashboards or medical devices.
- **Differentiator:** A **solid indigo sidebar** — September's one bold identity move. The shell is unmistakably branded while the work surface stays white and quiet.

## Typography

- **Family:** Noto Sans — single family across display, body, and UI. No separate display or mono font today.
- **Loading:** `next/font/google` `Noto_Sans`, exposed as `--font-noto-sans`. Body falls back to `Helvetica, sans-serif`, rendered `antialiased`.
- **Why one family:** Coherence and reliability over personality. Noto's wide language coverage and even rhythm keep long-form composed text legible — the thing this product is for.
- **Scale** (observed in app + marketing):

  | Role      | Size                     | Weight  | Notes                                        |
  | --------- | ------------------------ | ------- | -------------------------------------------- |
  | Hero / H1 | 30–36px (`text-3xl/4xl`) | 700     | `tracking-tight`; marketing & page titles    |
  | Eyebrow   | 14px (`text-sm`)         | 500     | `text-indigo-600`; section kicker above H1   |
  | H2        | 20px (`text-xl`)         | 600     | Section headings                             |
  | H3        | 16px (`text-base`)       | 600     | Sub-sections                                 |
  | Body      | 14px (`text-sm`)         | 400     | `leading-relaxed` for prose; default UI text |
  | UI label  | 14px (`text-sm`)         | 500     | Buttons, fields, nav items                   |
  | Small     | 12px (`text-xs`)         | 400–500 | Badges, helper text, sidebar group labels    |

- **Accessibility floor:** Body text never below 14px; mobile inputs render at 16px (`text-base md:text-sm`) to avoid iOS zoom. Avoid all-caps for anything a user must read quickly.

### App surface type roles (B·s, 2026-07-18)

The interactive work surfaces (Talk, Notes) standardize on five type roles. Four map to native Tailwind steps; note/section titles get one semantic token because 17px has no native step.

| Role                 | Utility      | Size / weight | Applies to                                    |
| -------------------- | ------------ | ------------- | --------------------------------------------- |
| Label / eyebrow      | `text-xs`    | 12 / 500–600  | Working-set labels, sidebar group labels      |
| Body & UI            | `text-sm`    | 14 / 400–500  | Default text, buttons, tabs, dock, chips      |
| Token / bubble       | `text-base`  | 16 / 400–500  | Suggestion word tiles, spoken-message bubbles |
| Note / section title | `text-title` | 17 / 600      | Note title field, section headings            |
| Composer input       | `text-xl`    | 20 / 400      | The message/note composer textarea            |

`--text-title` (17px) is defined in `globals.css`. Do not reintroduce arbitrary sizes (`text-[15px]`, `text-[11px]`); snap to a role.

## Color

- **Approach:** Restrained — zinc neutrals + one indigo accent, in the shadcn token model.
- **Color space:** Tailwind v4 named-color references (`var(--color-indigo-600)`, `var(--color-zinc-900)`). Only the five chart tokens are raw `oklch`.
- **Theme switch:** `.dark` class variant (`@custom-variant dark`). Tokens defined in `:root` and `.dark` in `apps/web/app/globals.css`.

### Neutrals (Zinc)

| Token                  | Light    | Dark     | Usage                             |
| ---------------------- | -------- | -------- | --------------------------------- |
| `--background`         | white    | zinc-900 | Page / work-surface background    |
| `--foreground`         | zinc-900 | white    | Primary text                      |
| `--card`               | white    | zinc-800 | Card surfaces                     |
| `--popover`            | white    | zinc-800 | Popovers, menus                   |
| `--muted`              | zinc-100 | zinc-700 | Muted backgrounds                 |
| `--muted-foreground`   | zinc-500 | zinc-400 | Secondary text                    |
| `--secondary`          | zinc-100 | zinc-700 | Secondary surfaces                |
| `--border` / `--input` | zinc-200 | zinc-700 | Borders, dividers, field outlines |

> Note: the page is shipped on a `bg-zinc-100` `<html>` so the white inset app shell floats on a faint gray. Pure white is reserved for content surfaces so they pop.

### Brand (Indigo)

| Token                    | Light      | Dark       | Usage                               |
| ------------------------ | ---------- | ---------- | ----------------------------------- |
| `--primary`              | indigo-600 | indigo-500 | Primary buttons, key actions        |
| `--primary-foreground`   | white      | white      | Text on primary                     |
| `--accent`               | indigo-100 | indigo-900 | Hover/active tints, soft highlights |
| `--accent-foreground`    | indigo-600 | white      | Text on accent                      |
| `--ring`                 | indigo-500 | indigo-400 | Focus rings                         |
| `--secondary-foreground` | indigo-600 | white      | Accented text on secondary surfaces |

### Sidebar (signature — stays indigo in both themes)

The sidebar is a **solid indigo panel** in light _and_ dark mode — September's identity anchor. It does not invert with the neutrals.

| Token                                    | Value      | Usage                 |
| ---------------------------------------- | ---------- | --------------------- |
| `--sidebar`                              | indigo-500 | Sidebar background    |
| `--sidebar-foreground`                   | white      | Sidebar text/icons    |
| `--sidebar-primary` / `--sidebar-accent` | indigo-600 | Active / hovered item |
| `--sidebar-border`                       | indigo-400 | Internal dividers     |
| `--sidebar-ring`                         | indigo-300 | Focus within sidebar  |

> **Contrast note:** white on indigo-500 clears AA for large/medium-weight UI text and icons (~3:1+) but is tight for small body text. Keep sidebar labels ≥14px and ≥500 weight; never set fine print on the indigo.

### Semantic (from `callout.tsx`)

| Token   | Color   | Light surface                   | Usage                                                          |
| ------- | ------- | ------------------------------- | -------------------------------------------------------------- |
| info    | Indigo  | indigo-50 / indigo-200 border   | Neutral info, brand-aligned notes                              |
| warning | Amber   | amber-50 / amber-200 border     | Attention needed                                               |
| success | Emerald | emerald-50 / emerald-200 border | Completed, positive                                            |
| danger  | Red     | red-50 / red-200 border         | Errors, destructive (`--destructive` = red-600 / dark red-500) |

### Charts

`--chart-1…5` — shadcn default `oklch` palette (warm-to-cool spread), distinct in light and dark.

## Spacing

- **Base unit:** 4px (Tailwind `--spacing` default).
- **Density:** Roomy desktop (deliberate — see thesis).
- **Scale:** 1(4) 2(8) 3(12) 4(16) 6(24) 8(32) 12(48) 16(64) — Tailwind `p-N`/`gap-N`/`w-N` multiply the base.
- **App content padding:** `p-2 md:p-4` around the work surface.
- **Card rhythm:** `py-6` with `gap-6` between card regions — generous, calm.
- **Header:** `h-16` (64px), `border-b`, `px-4` — taller than a productivity tool on purpose (bigger touch zone, calmer top edge).
- **Footer:** `border-t`, `py-4`, `px-4 md:px-6`, muted centered text.

## Layout

- **Base viewport:** **13" iPad Pro (M4), landscape — 1376×1032.** Primary designs target this size; lay things out here first, then scale up for wider desktops and down for tablet portrait / mobile. The constant lives in `BASE_VIEWPORT_WIDTH` (`@/packages/shared`); `useIsCompact()` reports when the viewport is at or below it.
- **Approach:** shadcn `Sidebar` + `SidebarInset`, grid-disciplined.
- **Sidebar default state:** viewport-driven. At or below the base (≤1376px — both iPad orientations and smaller) the sidebar defaults to its **icon rail**; wider screens default to the full sidebar. A manual toggle (rail or ⌘/Ctrl-B) wins for the session. Below 768px it becomes the mobile sheet.
- **Sidebar widths:** `16rem` (256px) expanded · `18rem` mobile sheet · `3rem` icon rail.
- **Inset shell:** content floats as an inset card — `md:m-2 md:ml-0 md:rounded-xl md:shadow-sm` — over the `zinc-100` page, beside the indigo sidebar.
- **Header:** `SidebarLayout.Header` = `h-16 border-b`, icon + title at `px-4`.
- **Marketing / legal:** centered single column, `max-w-3xl`, `px-4 py-12 sm:px-6`; eyebrow → H1 → lede header block.
- **Border radius (B·s roles, 2026-07-18):** four named roles plus the pill, defined as `--radius-*` tokens in `globals.css`. This replaces the old "buttons=`md`, cards=`xl`" mapping and collapses the 14 ad-hoc radii the app had drifted into.

  | Role      | Utility           | Value | Applies to                                                     |
  | --------- | ----------------- | ----- | -------------------------------------------------------------- |
  | control   | `rounded-control` | 12px  | Buttons, inputs, icon/rail buttons, stripe submit (enter) key  |
  | chip      | `rounded-chip`    | 14px  | Suggestion word tiles                                          |
  | surface   | `rounded-surface` | 20px  | Cards, composer, editor, stripe consoles, message bubbles      |
  | pill      | `rounded-full`    | full  | Primary actions, dock tabs, note tabs, pinned chips, suggestions |

  The legacy shadcn `--radius-sm/md/lg/xl` scale still exists for overlays (dropdowns, popovers, dialogs), which stay slightly tighter than content surfaces on purpose. Nested micro-controls (tiptap toolbar buttons) keep `rounded-md` (8px) so they read as keys inside a surface.
- **Surface treatment:** border **plus** a soft `shadow-sm` on cards and the inset shell — a gentle depth cue (a deliberate step warmer than a flat, border-only system).
- **Scrollbars:** custom, calm, and rounded — a slim zinc pill thumb (`zinc-300`, `zinc-400` on hover; `zinc-600`/`zinc-500` in dark) on a transparent track, `scrollbar-width: thin` + 12px WebKit width with a 3px transparent inset. Defined once in `globals.css`. Surfaces that deliberately hide their scrollbar (suggestion stripes) still do.
- **Toasts:** Sonner, `position="top-center"`, `closeButton`, `duration={15000}` — long dwell so slow readers aren't rushed.

## Motion

- **Approach:** Minimal-functional — motion only when it aids comprehension.
- **Libraries:** `tw-animate-css` (utility keyframes) + `framer-motion` (component transitions).
- **Patterns in use:** `transition-all` on buttons; `transition-[color,box-shadow]` on inputs/fields; sidebar width/position `duration-200 ease-linear`.
- **Accessibility:** honor `prefers-reduced-motion` — animation is never required to understand state. (Not yet globally wired — see Decisions Log.)

## Accessibility (first-class)

September is operated under physical constraint. These are requirements, not nice-to-haves. In QA mode, flag violations.

- **Target size:** Interactive controls should present a **≥44×44px** effective hit area. Button `default` is `h-9` (36px) — for primary/standalone actions and anything switch- or gaze-driven, use `lg` (`h-10`) or larger and add padding; never pack small icon-only controls tightly.
- **Spacing between actions:** Generous gaps between adjacent targets so imprecise input (tremor, eye-gaze dwell) doesn't mis-hit. The roomy density exists to serve this.
- **Focus visibility:** Every interactive element keeps a visible focus ring — `focus-visible:ring-[3px] ring-ring/50` is the standard (already baked into `Button`, `Input`, sidebar). **Never** remove the outline.
- **Contrast:** Target WCAG **AA** minimum (4.5:1 body text, 3:1 large text / UI). indigo-600 on white passes for text; white on the indigo-500 sidebar is large/medium-weight only (see Sidebar note).
- **Keyboard & switch operability:** Everything reachable and operable without a pointer. No hover-only affordances — hover may enhance, never gate. Visible, logical focus order.
- **Reduced motion:** Respect `prefers-reduced-motion`; no parallax, no motion that conveys required meaning.
- **Reading pace:** Don't auto-dismiss important content quickly (toasts dwell 15s). Avoid timeouts on input.
- **Minimal keystrokes (product-level a11y):** Suggestion pills, autocomplete, and contextual shortcuts are accessibility features — every interaction that removes a keystroke is on-thesis.

## Component Patterns

All UI primitives live in `@/packages/ui` (`src/packages/ui/components`) — shadcn wrappers over Radix, composed with `cva`. Icons: `lucide-react`. No raw Radix or hand-rolled primitives in app code.

- **Buttons:** `Button` with `rounded-control` (12px), `transition-all`. Variants: `default` (indigo), `destructive`, `outline`, `secondary`, `ghost`, `link`. Sizes: `default` h-9 · `sm` h-8 · `lg` h-10 · `icon` / `icon-sm` / `icon-lg`. Prefer `lg`/`icon-lg` for primary and touch-critical actions. Pill actions (Speak, Voice-over, Reel, tabs) override with `rounded-full`.
- **Suggestion pills:** `Suggestion` / `Suggestions` — `rounded-full`, `outline`, `size="sm"`, `px-4`, in a horizontal `ScrollArea`. The autocomplete/contextual-reply surface; the product's signature interaction. Keep targets comfortable and well-spaced.
- **Cards:** `Card` — `rounded-surface border py-6 shadow-sm`, `gap-6`; `CardTitle` = `font-semibold leading-none`. Roomy, lightly elevated.
- **Badges:** `Badge` — `rounded-full border px-2 py-0.5 text-xs font-medium`. Variants `default`/`secondary`/`destructive`/`outline`.
- **Inputs / fields:** `Input` = `h-9 rounded-control border shadow-xs`; mobile `text-base`, desktop `text-sm`. Compose with `Field`/`Form` (react-hook-form). Always pair with a visible `Label`.
- **Callouts:** `Callout` — `rounded-lg border px-4 py-3 text-sm`, tones `info`/`warning`/`success`/`danger`, each with a lucide icon. Use for legal/explanatory notes.
- **Sidebar nav:** `SidebarMenuButton` items (icon + label), collapsible groups via shadcn `Collapsible`, `SidebarGroupLabel` (`text-xs font-medium`), active state by `data-active`. Indigo surface throughout.
- **Dropdowns / comboboxes:** shadcn `DropdownMenu` and `Command` + `Popover`.
- **Overlays:** `Dialog`, `Sheet`, `AlertDialog`, `HoverCard`, `Tooltip` — Radix-backed.
- **States:** `Skeleton` / `LoadingState` (loading), `EmptyState` (centered muted text + primary action), `ErrorState`, `Spinner`.
- **Toasts:** Sonner `Toaster` — top-center, close button, 15s.

## Decisions Log

| Date       | Decision                               | Rationale                                                                                                                                                                                                                    |
| ---------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-12 | Design system extracted & documented   | Captured the live system from `globals.css` + `packages/ui` via `/design-consultation`.                                                                                                                                     |
| 2026-06-12 | Thesis: calm, dignified, low-effort    | Anchors every decision to the ALS/MND audience — quiet UI, warm accent, reach over density.                                                                                                                                  |
| 2026-06-12 | Solid indigo sidebar as identity       | The one bold move; the shell is branded while work surfaces stay white and quiet. Sidebar stays indigo in dark mode (does not invert).                                                                                       |
| 2026-06-12 | Roomy density codified as intended     | 64px header, `rounded-xl` cards, `gap-6` — spacing is an accessibility feature for imprecise input, not a stylistic choice. Deliberately more generous than typical compact productivity density.                            |
| 2026-06-12 | Accessibility is first-class           | Central to the product. Codifies target size, focus visibility, contrast floors, keyboard/switch operability, reduced motion — some are aspirational vs current code (see gaps).                                             |
| 2026-06-12 | Keep single Noto Sans family           | Coherence + language coverage + legibility for long composed text. No separate display or mono font today.                                                                                                                  |
| 2026-06-12 | shadcn + semantic tokens only          | All primitives from `@/packages/ui`; prefer semantic tokens over hardcoded Tailwind color utilities. (Marketing/legal pages currently use raw `zinc-*`/`indigo-*` — acceptable for static prose, migrate opportunistically.) |
| 2026-06-12 | Soft shadow on cards (not border-only) | A gentle `shadow-sm` depth cue on cards and the inset shell — warmer and softer than a flat border-only surface treatment.                                                                                                   |
| 2026-06-12 | Base viewport = 13" iPad (1376×1032)   | Design primary screens for the 13" iPad Pro landscape; scale up/down from there. At/below the base the sidebar collapses to an icon rail (`useIsCompact`), reclaiming horizontal space for content on the primary target.    |
| 2026-06-13 | Onboarding setup UI | Full-screen flow: sidebar hidden during onboarding, centered `max-w-2xl` column over a subtle radial indigo glow, clickable step circles, and a shared step chrome (all-caps 10px eyebrow/labels, 36px hero title, footer action bar). User-approved deviations from the system below; auto-rotating carousel and staggered motion were dropped to respect reading-pace/reduced-motion. |
| 2026-06-27 | Onboarding redesigned around setup modes | Mode-centered flow (Welcome → About you → Choose setup → mode-specific Finish). Single column on `bg-zinc-100`, `max-w-4xl`: an **indigo hero header** band (brand + setup title) over a white `rounded-xl` surface card, with a **horizontal step indicator** at the top of the surface (numbered circles, check on completion, connectors fill indigo as you advance). Replaces the prior left indigo step-rail. User-approved. |
| 2026-07-18 | Custom zinc scrollbars | Replaced platform-default scrollbars with a calm rounded zinc pill thumb on a transparent track (`globals.css`), consistent with the border/surface treatment. Slim but with an inset that keeps a usable target; opt-out surfaces (stripes) still hide. |
| 2026-07-18 | Radius & type standardized to B·s roles | The app had drifted to 14 distinct radius utilities (`rounded-lg` ×78, `-full` ×76, `-md` ×60, plus `2xl`/`sm`/`xs`…) with same-role elements disagreeing, and arbitrary type sizes (`text-[15px]`, `text-[11px]`). Collapsed to four radius roles (control 12 · chip 14 · surface 20 · pill) + a five-role type scale, defined as `--radius-*`/`--text-title` tokens in `globals.css` and propagated app-wide through the `Button`/`Card`/`Input` primitives. Option **B·s** ("Soft Companion, type one step down") — rounder shapes for warmth, today's 14px body floor for density. User-approved (mock `docs/mocks/2026-07-18-design-system-options.html`). |
| 2026-07-18 | Unified Voice page (selection + cloning) | Voice was split across three routes — `/settings/voice` (pick), `/clone` (clone), `/voices` (find-similar). Collapsed into one `/voice` page (Option A): the everyday task is a single calm, paginated voice list (5/page, cloned voices sorted first) with a pinned current-voice banner + Preview; cloning opens in a right-hand `Sheet` and the new clone auto-selects on completion. Sidebar "Voice" now points here; `/clone`, `/voices`, `/settings/voice`, `/settings/speech` redirect in. User-approved (mock `docs/mocks/2026-07-18-voice-page-options.html`). |
| 2026-07-17 | Editorial serif + Tailwind pairs for exported reels only | The note-reel look (story player + MP4) is a deliberate, scoped deviation from the single-Noto / zinc+indigo system: a serif **display** headline (**Playfair Display** 500, the one non-Noto face, loaded only for this surface) over **Noto Sans** support text, on one of six solid **Tailwind colour pairs** (bg 900/950 · display 200 · support 50, default `stone`), with film grain, a soft vignette, and a "September" watermark. Scope is exported/shareable reel artifacts, **not** app UI — the app chrome stays Noto + zinc + indigo. Roles derive from punctuation deterministically so the DOM player and canvas exporter render identically. Source of truth: `packages/notes/lib/reel-theme.ts`. User-approved (mock `docs/mocks/2026-07-17-reel-redesign.html`). |

### Known gaps (honest state, not yet enforced)

- `prefers-reduced-motion` is not globally wired.
- Button `default` (36px) is below the 44px touch target; touch-critical actions must opt up to `lg`/`icon-lg`.
- Marketing/legal pages use raw Tailwind color utilities instead of semantic tokens.
- No custom focus-visible audit across all domain components yet; verify suggestion pills and sidebar items meet the focus-ring standard.
