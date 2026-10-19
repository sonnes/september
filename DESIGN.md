# Design System — September

> Extracted from the live web app (`apps/web/app/globals.css`, `packages/ui`) on 2026-06-12 via `/design-consultation`. A Noto UI + Lexend brand + zinc + indigo system tuned **calm and roomy** for its audience.

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

- **UI family:** Noto Sans across display, body, and controls. Brand lettering is the only app-chrome exception.
- **Note headings:** Fraunces (variable, 600) for the title and the headings of a note, through `--font-heading`. The note body stays in Noto Sans. The font is fetched when a note opens.
- **Brand family:** Lexend 700 for the `Sep` keycap legend and `September` wordmark only.
- **Loading:** Self-hosted `@fontsource/noto-sans` and `@fontsource/lexend`; `--font-sans` and `--font-brand` expose the two roles.
- **Why:** Noto keeps the interface coherent and multilingual. Lexend gives the compact brand lettering open, substantial forms without changing reading typography.
- **Scale** (observed in app + marketing):

  | Role      | Size                     | Weight  | Notes                                        |
  | --------- | ------------------------ | ------- | -------------------------------------------- |
  | Hero / H1 | 30–36px (`text-3xl/4xl`) | 700     | `tracking-tight`; marketing & page titles    |
  | Eyebrow   | 14px (`text-sm`)         | 500     | `text-indigo-600`; section kicker above H1   |
  | H2        | 20px (`text-xl`)         | 600     | Section headings                             |
  | H3        | 16px (`text-base`)       | 600     | Sub-sections                                 |
  | Body      | 14px (`text-sm`)         | 400     | `leading-relaxed` for prose; default UI text |
  | UI label  | 14px (`text-sm`)         | 500     | Buttons, fields, nav items                   |
  | Small     | 14px (`text-xs`)         | 400–500 | Badges, helper text, sidebar group labels    |

- **Accessibility floor:** No text is smaller than 14px, so `text-xs` is 14px. Inputs are 16px at every width. Every text role grows with `--reach-scale`. Avoid all-caps for anything a user must read quickly.

### App surface type roles (B·s, 2026-07-18)

The interactive work surfaces (Talk, Notes) standardize on five type roles. Four map to native Tailwind steps; note/section titles get one semantic token because 17px has no native step.

| Role                 | Utility      | Size / weight | Applies to                                    |
| -------------------- | ------------ | ------------- | --------------------------------------------- |
| Label / eyebrow      | `text-xs`    | 14 / 500–600  | Working-set labels, sidebar group labels      |
| Body & UI            | `text-sm`    | 14 / 400–500  | Default text, buttons, tabs, dock, chips      |
| Token / message      | `text-base`  | 16 / 400–500  | Suggestion word tiles, spoken-message rows    |
| Note / section title | `text-title` | 17 / 600      | Section headings                              |
| Composer input       | `text-xl`    | 20 / 400      | The message composer and the note body        |
| Note document title  | `font-heading text-3xl` | 30 / 600 | The title of a note, in Fraunces       |

`--text-title` (17px) is defined in `globals.css`. Do not reintroduce arbitrary sizes (`text-[15px]`, `text-[11px]`); snap to a role.

### Brand identity

- **Compact mark:** An inverted, top-down 2D mechanical keycap. The indigo housing surrounds a white inset face with a large indigo `Sep` legend.
- **Wordmark:** Lexend 700 `September`, with solid indigo `Sep` and pale-indigo `tember` to represent autocomplete.
- **Usage:** Use the square mark alone where space is constrained. Use the wordmark in headers, navigation, launch surfaces, and marketing.
- **Assets:** `public/logo.svg` is the scalable source. `pnpm brand:generate` regenerates `logo.png`, favicons, touch icons, and install icons.

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
| `--muted-foreground`   | zinc-600 | zinc-300 | Secondary text, 7:1 on `--muted`  |
| `--secondary`          | zinc-100 | zinc-700 | Secondary surfaces                |
| `--border`             | zinc-200 | zinc-700 | Dividers and card edges           |
| `--input`              | zinc-500 | zinc-500 | Field outlines and tracks, 3:1 or more |

> Note: the page is shipped on a `bg-zinc-100` `<html>` so the white inset app shell floats on a faint gray. Pure white is reserved for content surfaces so they pop.

### Brand (Indigo)

| Token                    | Light      | Dark       | Usage                               |
| ------------------------ | ---------- | ---------- | ----------------------------------- |
| `--primary`              | indigo-600 | indigo-500 | Primary buttons, key actions        |
| `--primary-foreground`   | white      | white      | Text on primary                     |
| `--accent`               | indigo-100 | indigo-900 | Hover/active tints, soft highlights |
| `--accent-foreground`    | indigo-600 | white      | Text on accent                      |
| `--brand`                | indigo-600 | indigo-400 | Indigo as text or as a line         |
| `--secondary-foreground` | indigo-600 | white      | Accented text on secondary surfaces |

### Attention (Amber)

Amber marks attention only: focus, dwell, the scan band, and the stripe tile under the pointer. Nothing else is amber.

| Token                    | Light    | Dark     | Usage                                     |
| ------------------------ | -------- | -------- | ----------------------------------------- |
| `--attention`            | amber-300 | amber-300 | The ring of `.focus-attention`, the dwell fill, the scan band, the hovered stripe tile |
| `--attention-soft`       | amber-200 | amber-200 | The dwell fill before the gaze, the scan band fill |
| `--attention-strong`     | amber-400 | amber-400 | The dwell fill after the gaze           |
| `--attention-foreground` | zinc-900 | zinc-900 | Ink on amber, and the line inside the ring |
| `--ring`                 | zinc-900 | amber-300 | The outline of a focused control         |

### Sidebar (signature — stays indigo in both themes)

The sidebar is a **solid indigo panel** in light _and_ dark mode — September's identity anchor. It does not invert with the neutrals.

| Token                                    | Value      | Usage                 |
| ---------------------------------------- | ---------- | --------------------- |
| `--sidebar`                              | indigo-500 | Sidebar background    |
| `--sidebar-foreground`                   | white      | Sidebar text/icons    |
| `--sidebar-primary` / `--sidebar-accent` | indigo-600 | Active / hovered item |
| `--sidebar-border`                       | indigo-400 | Internal dividers     |
| `--sidebar-ring`                         | amber-300  | Focus within sidebar  |

> **Contrast note:** white on indigo-500 is 4.58:1, which passes AA for text by a small margin. Keep sidebar labels ≥14px and ≥500 weight, and set them in full white, never at an opacity. Amber-300 is 3.16:1 on indigo-500, so the focus ring shows on the sidebar.

### Semantic (from `callout.tsx`)

| Token   | Color   | Light surface                   | Usage                                                          |
| ------- | ------- | ------------------------------- | -------------------------------------------------------------- |
| info    | Indigo  | indigo-50 / indigo-200 border   | Neutral info, brand-aligned notes                              |
| warning | Zinc    | zinc-100 / zinc-500 border, triangle icon | Attention needed. Not amber, because amber marks focus |
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

- **Base viewport:** **13" iPad Pro (M4), landscape — 1376×1032.** Primary designs target this size; lay things out here first, then scale up for wider desktops and down for tablet portrait / mobile. The constant lives in `BASE_VIEWPORT_WIDTH` (`@/packages/shared`).
- **Approach:** shadcn `Sidebar` + `SidebarInset`, grid-disciplined.
- **Sidebar default state:** collapsed to the icon rail at every desktop width. A manual toggle (rail or ⌘/Ctrl-B) persists while the app shell is mounted, including across resizes. Below 768px it becomes the mobile sheet, closed by default.
- **Sidebar widths:** `16rem` (256px) expanded · `18rem` mobile sheet · `3.25rem` icon rail, which holds a 48px key.
- **Inset shell:** content floats as an inset card — `md:m-2 md:ml-0 md:rounded-xl md:shadow-sm` — over the `zinc-100` page, beside the indigo sidebar.
- **Phone layout:** below 48rem, the right rail of a space is a row of two 48px keys under the screen, and its card opens above the row. The dock wraps the Talk, Notes, and Agent switch to a second line, so the space key keeps a full key width.
- **Header:** `ScreenHeader` = `h-16 border-b`, the 48px Menu key + title at `px-4`. A screen with no visible `h1` gives the header a `heading`, which only a screen reader reads.
- **Marketing / legal:** centered single column, `max-w-3xl`, `px-4 py-12 sm:px-6`; eyebrow → H1 → lede header block.
- **Border radius (B·s roles, 2026-07-18):** four named roles plus the pill, defined as `--radius-*` tokens in `globals.css`. This replaces the old "buttons=`md`, cards=`xl`" mapping and collapses the 14 ad-hoc radii the app had drifted into.

  | Role    | Utility           | Value | Applies to                                                       |
  | ------- | ----------------- | ----- | ---------------------------------------------------------------- |
  | control | `rounded-control` | 12px  | Buttons, inputs, icon/rail buttons, stripe submit (enter) key    |
  | chip    | `rounded-chip`    | 14px  | Suggestion word tiles                                            |
  | surface | `rounded-surface` | 20px  | Cards, composer, editor, speaking card                           |
  | pill    | `rounded-full`    | full  | Primary actions, dock tabs, pinned chips, suggestions |

  The legacy shadcn `--radius-sm/md/lg/xl` scale still exists for overlays (dropdowns, popovers, dialogs), which stay slightly tighter than content surfaces on purpose. Nested micro-controls (tiptap toolbar buttons) keep `rounded-md` (8px) so they read as keys inside a surface.

- **Surface treatment:** border **plus** a soft `shadow-sm` on cards and the inset shell — a gentle depth cue (a deliberate step warmer than a flat, border-only system).
- **Scrollbars:** custom, calm, and rounded — a slim zinc pill thumb (`zinc-500`, `zinc-600` on hover; `zinc-400`/`zinc-300` in dark) on a transparent track, `scrollbar-width: thin` + 12px WebKit width with a 3px transparent inset. Defined once in `globals.css`. Surfaces that deliberately hide their scrollbar (suggestion stripes) still do.
- **Toasts:** Sonner, `position="top-center"`, `closeButton`, `duration={15000}` — long dwell so slow readers aren't rushed.

## Motion

- **Approach:** Minimal-functional — motion only when it aids comprehension.
- **Libraries:** `tw-animate-css` (utility keyframes) + `framer-motion` (component transitions).
- **Patterns in use:** `transition-all` on buttons; `transition-[color,box-shadow]` on inputs/fields; sidebar width/position `duration-200 ease-linear`.
- **Accessibility:** `theme.css` stops every animation and transition when `prefers-reduced-motion` is on. No state depends on motion.

## Accessibility (first-class)

September is operated under physical constraint. These are requirements, not nice-to-haves. In QA mode, flag violations.

- **Target size:** Every key is at least `--reach-target`, 48px for touch. Every `Button` size, `Input`, `Select`, `Tabs`, menu row, and close key has this minimum. A checkbox or a radio is 24px inside a labelled row of 48px. Never pack small icon-only controls tightly.
- **Spacing between actions:** Generous gaps between adjacent targets so imprecise input (tremor, eye-gaze dwell) doesn't mis-hit. The roomy density exists to serve this.
- **Focus visibility:** Every interactive element shows focus with `.focus-attention`: a 2px zinc-900 line inside a 5px amber-300 ring. The line passes 3:1 on white and zinc, and the amber passes 3:1 on indigo and on dark surfaces. A menu row or a scroll area uses `.focus-attention-inset`. **Never** remove the outline.
- **Contrast:** WCAG **AA** at the minimum: 4.5:1 for text, 3:1 for large text, field lines, and focus. Secondary text is zinc-600 (7:1 on zinc-100). Indigo text is `--brand`, so it passes in dark too. A disabled key uses `.key-disabled`, a dotted border, so its state is not a fade alone.
- **Keyboard & switch operability:** Everything reachable and operable without a pointer. No hover-only affordances — hover may enhance, never gate. Visible, logical focus order. A move to another screen puts the focus on its `h1`, unless the screen puts it on a field.
- **Reduced motion:** Respect `prefers-reduced-motion` and the Reduced motion choice of the access profile; no parallax, no motion that conveys required meaning.
- **Access profile:** Setup and Settings ask how the person chooses things: touch, mouse, keyboard, switch, or eyes. The profile sets `--reach-target`, `--reach-gap`, `--reach-word`, and `--reach-scale`, the number of stripes, and the words in a slice. Eyes is 88px keys with 24px gaps, and Switch is 64px keys with 16px gaps. A new input method applies only on Continue or on its Use key. See `docs/concepts/access-profile.md`.
- **Answers to a press:** An accepted press squeezes the key and shows an indigo check, or two indigo rings with reduced motion. A click plays unless the voice speaks or the person turned the click off. A dwell fills the key from the bottom in amber, with ink marks at the fill level. The scan band is an amber fill with an ink line, or an amber ring alone on the indigo sidebar and header. The Pause scan key sits where it covers nothing: the foot of the sidebar, the panel header, the setup sidebar, or a reserved space at the foot of a phone screen. An open sheet, dialog, or menu gets a second Pause scan key at its end.
- **Reading pace:** Don't auto-dismiss important content quickly (toasts dwell 15s). Avoid timeouts on input.
- **Minimal keystrokes (product-level a11y):** Suggestion pills, autocomplete, and contextual shortcuts are accessibility features — every interaction that removes a keystroke is on-thesis.

## Component Patterns

All UI primitives live in `@/packages/ui` (`src/packages/ui/components`) — shadcn wrappers over Radix, composed with `cva`. Icons: `lucide-react`. No raw Radix or hand-rolled primitives in app code.

- **Buttons:** `Button` with `rounded-control` (12px), `transition-all`. Variants: `default` (indigo), `destructive`, `outline`, `secondary`, `ghost`, `link`. Sizes: `default` · `sm` · `lg` · `icon` / `icon-sm` / `icon-lg`. Every size is at least `--reach-target` (48px) high. The sizes differ only in padding, and the icon sizes are 48px square. Pill actions (Speak, Voice-over, Present, Export, tabs) override with `rounded-full`.
- **Suggestion pills:** `Suggestion` / `Suggestions` — `rounded-full`, `outline`, `size="sm"`, `px-4`, in a horizontal `ScrollArea`. The autocomplete/contextual-reply surface; the product's signature interaction. Keep targets comfortable and well-spaced.
- **Cards:** `Card` — `rounded-surface border py-6 shadow-sm`, `gap-6`; `CardTitle` = `font-semibold leading-none`. Roomy, lightly elevated.
- **Badges:** `Badge` — `rounded-full border px-2 py-0.5 text-xs font-medium`. Variants `default`/`secondary`/`destructive`/`outline`.
- **Inputs / fields:** `Input` = 48px high, `rounded-control border border-input shadow-xs`, `text-base` (16px) at every width. Compose with `Field`/`Form` (react-hook-form). Always pair with a visible `Label`, a search field too. A placeholder is a hint, never the only label.
- **Switches:** `Switch` is 32 by 56px. The thumb sits 2px from each edge and shows an indigo check when the switch is on. The whole labelled row of 48px turns it on and off.
- **Callouts:** `Callout` — `rounded-lg border px-4 py-3 text-sm`, tones `info`/`warning`/`success`/`danger`, each with a lucide icon. Use for legal/explanatory notes.
- **Sidebar nav:** `SidebarMenuButton` items (icon + label) in a `nav` named Main, collapsible groups via shadcn `Collapsible`, `SidebarGroupLabel` (`text-xs font-medium`, full white). Every row is 48px. The current row has `aria-current="page"`, the indigo-600 fill, and a 4px white bar at its start edge, so the state is not a fill alone. Rows use the inset focus. The edge strip (`SidebarRail`) is for a pointer only. Indigo surface throughout.
- **Current tab:** a space tab in the dock shows a dot before its name when it is open. The Talk, Notes, and Agent switch is a `nav` with `aria-current`, not a `tablist`.
- **Skip link:** the first key of each shell is "Skip to main content". It shows at the top left while it has the focus, with the attention focus.
- **Dropdowns / comboboxes:** shadcn `DropdownMenu` and `Command` + `Popover`. Dwell and scan open them with a pointer press. The desktop More key opens a sheet of 48px rows, not a dropdown. A short fixed list of choices, such as the usage period, is a row of `ChoiceKey` keys.
- **Word being read:** while the browser system voice reads a message, its current word is indigo-600 with white words. It is not amber, because amber marks attention only.
- **Present keys:** Previous, Stop, and Next are keys below the words, in the ink of the tone. A key with nothing to do keeps its place and shows a dotted line. Tab stays inside the stage, and the focus goes back to the Present key when the stage closes.
- **Note focus:** while the note document has the focus, a 3px zinc-900 bar in a 2px amber ring shows at its start edge. A ring around the whole page pulls the eye from the words. The caret line stays clear of the reading bar.
- **Overlays:** `Dialog`, `Sheet`, `AlertDialog`, `HoverCard`, `Tooltip` — Radix-backed.
- **States:** `Skeleton` / `LoadingState` (loading), `EmptyState` (centered muted text + primary action), `ErrorState`, `Spinner`.
- **Toasts:** Sonner `Toaster` — top-center, close button, 15s.

## Decisions Log

| Date       | Decision                                                 | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-12 | Design system extracted & documented                     | Captured the live system from `globals.css` + `packages/ui` via `/design-consultation`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-06-12 | Thesis: calm, dignified, low-effort                      | Anchors every decision to the ALS/MND audience — quiet UI, warm accent, reach over density.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-06-12 | Solid indigo sidebar as identity                         | The one bold move; the shell is branded while work surfaces stay white and quiet. Sidebar stays indigo in dark mode (does not invert).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-06-12 | Roomy density codified as intended                       | 64px header, `rounded-xl` cards, `gap-6` — spacing is an accessibility feature for imprecise input, not a stylistic choice. Deliberately more generous than typical compact productivity density.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-06-12 | Accessibility is first-class                             | Central to the product. Codifies target size, focus visibility, contrast floors, keyboard/switch operability, reduced motion — some are aspirational vs current code (see gaps).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-06-12 | Keep Noto Sans for app UI                                | Coherence + language coverage + legibility for long composed text. Brand and exported-artifact exceptions remain scoped away from reading and control typography.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-06-12 | shadcn + semantic tokens only                            | All primitives from `@/packages/ui`; prefer semantic tokens over hardcoded Tailwind color utilities. (Marketing/legal pages currently use raw `zinc-*`/`indigo-*` — acceptable for static prose, migrate opportunistically.)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-06-12 | Soft shadow on cards (not border-only)                   | A gentle `shadow-sm` depth cue on cards and the inset shell — warmer and softer than a flat border-only surface treatment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-06-12 | Base viewport = 13" iPad (1376×1032)                     | Design primary screens for the 13" iPad Pro landscape; scale up/down from there. At/below the base the sidebar collapses to an icon rail (`useIsCompact`), reclaiming horizontal space for content on the primary target.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-06-13 | Onboarding setup UI                                      | Full-screen flow: sidebar hidden during onboarding, centered `max-w-2xl` column over a subtle radial indigo glow, clickable step circles, and a shared step chrome (all-caps 10px eyebrow/labels, 36px hero title, footer action bar). User-approved deviations from the system below; auto-rotating carousel and staggered motion were dropped to respect reading-pace/reduced-motion.                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-06-27 | Onboarding redesigned around setup modes                 | Mode-centered flow (Welcome → About you → Choose setup → mode-specific Finish). Single column on `bg-zinc-100`, `max-w-4xl`: an **indigo hero header** band (brand + setup title) over a white `rounded-xl` surface card, with a **horizontal step indicator** at the top of the surface (numbered circles, check on completion, connectors fill indigo as you advance). Replaces the prior left indigo step-rail. User-approved.                                                                                                                                                                                                                                                                                                                                                            |
| 2026-07-18 | Custom zinc scrollbars                                   | Replaced platform-default scrollbars with a calm rounded zinc pill thumb on a transparent track (`globals.css`), consistent with the border/surface treatment. Slim but with an inset that keeps a usable target; opt-out surfaces (stripes) still hide.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-07-18 | Radius & type standardized to B·s roles                  | The app had drifted to 14 distinct radius utilities (`rounded-lg` ×78, `-full` ×76, `-md` ×60, plus `2xl`/`sm`/`xs`…) with same-role elements disagreeing, and arbitrary type sizes (`text-[15px]`, `text-[11px]`). Collapsed to four radius roles (control 12 · chip 14 · surface 20 · pill) + a five-role type scale, defined as `--radius-*`/`--text-title` tokens in `globals.css` and propagated app-wide through the `Button`/`Card`/`Input` primitives. Option **B·s** ("Soft Companion, type one step down") — rounder shapes for warmth, today's 14px body floor for density. User-approved (mock `docs/mocks/2026-07-18-design-system-options.html`).                                                                                                                              |
| 2026-07-18 | Unified Voice page (selection + cloning)                 | Voice was split across three routes — `/settings/voice` (pick), `/clone` (clone), `/voices` (find-similar). Collapsed into one `/voice` page (Option A): the everyday task is a single calm, paginated voice list (5/page, cloned voices sorted first) with a pinned current-voice banner + Preview; cloning opens in a right-hand `Sheet` and the new clone auto-selects on completion. Sidebar "Voice" now points here; `/clone`, `/voices`, `/settings/voice`, `/settings/speech` redirect in. User-approved (mock `docs/mocks/2026-07-18-voice-page-options.html`).                                                                                                                                                                                                                      |
| 2026-08-24 | Presentation tones for Present and exported video | Seven full-bleed tones in one picker, in two families, replacing the row below. **Keycap** — **Indigo** (default), **Ink**, **Paper** — is pure system: Noto Sans 700 display over Noto Sans 500 support, on the app's own colours, signed with the September mark. **Reading light** — **Cream**, **Sage**, **Blush**, **Sky** — is the one scoped deviation: paper tints with a **Fraunces** 550 display serif (variable, fetched only when one of these four is chosen) over Noto Sans support, ink text, accents amber-700 · emerald-700 · rose-700 · sky-700, signed with the wordmark. No film grain, no vignette. The live stage is full-bleed and sizes text to the viewport; 9:16 is the exported video only. Roles are deterministic (heading or first-of-section is display), so the stage and the canvas exporter agree. Source of truth: `packages/core/rules/present.ts`. User-approved (mock `docs/mocks/2026-08-24-present-look-options.html`, Option A default with Option B tints). |
| 2026-07-17 | ~~Editorial serif + Tailwind pairs for exported reels only~~ (superseded 2026-08-24) | The note-reel look (story player + MP4) is a deliberate, scoped deviation from the Noto UI / zinc+indigo system: a serif **display** headline (**Playfair Display** 500, loaded only for this surface) over **Noto Sans** support text, on one of six solid **Tailwind colour pairs** (bg 900/950 · display 200 · support 50, default `stone`), with film grain, a soft vignette, and a "September" watermark. Scope is exported/shareable reel artifacts, **not** app UI — the app chrome stays Noto + zinc + indigo, with Lexend reserved for brand marks. Roles derive from punctuation deterministically so the DOM player and canvas exporter render identically. Source of truth: `packages/notes/lib/reel-theme.ts`. User-approved (mock `docs/mocks/2026-07-17-reel-redesign.html`). |
| 2026-08-21 | App onboarding uses a left indigo sidebar                | Applies to the shared web and desktop application UI; the web-only public landing page keeps its hero header. The brand, setup title, and vertical step list sit in a fixed 288px indigo sidebar. The sidebar and step surface are inset cards on the `zinc-100` page, with the same radius, shadow, and 8px gutter. Every section on a step stays open. Controls come from the shared shadcn primitives in `packages/ui/`. User-approved. |
| 2026-08-21 | Desktop provider setup asks by job, not by brand           | The `/connect` step asks two questions — "Writing help" and "Voice" — instead of listing three service cards. A brand the user has never heard of is not an answerable question, and two services that do one job cannot both look active. Each question starts pre-answered with a service that already works (Apple Intelligence, macOS system voice), so a supported Mac continues with zero clicks. The step appears only in advanced setup; free setup keeps four steps. A service list by brand is still the right shape for Settings. Free-mode copy now names Apple Intelligence instead of OpenRouter, because on this platform free mode is the private mode. User-approved (mock `docs/mocks/2026-08-21-provider-setup-options.html`, Option A). |
| 2026-08-21 | Desktop app layout ports the shadcn sidebar shell           | `apps/desktop` now has two shells. Setup keeps the fixed 288px indigo sidebar from the row above. The app itself uses the same `Sidebar` + `SidebarInset` pair as the web app: a solid indigo sidebar beside a white inset card, `variant="inset"` and `collapsible="icon"`. The sidebar tokens hold the DESIGN.md indigo values, not the shadcn grays, so the panel stays indigo. The window opens at the 1376px baseline, so the sidebar starts as the icon rail. Nav rows are `size="lg"` (48px) instead of the web app's 32px default, because a bigger target suits the audience; the rail keeps the 32px icon button. |
| 2026-09-05 | Landing page hierarchy after visual critique | The hero emphasizes the completed spoken sentence. Talk follows immediately. Agent has a full-width request-and-result demonstration, with an expandable conversation. Spaces and saved phrases remain together; Notes and Voice use native disclosures. Privacy and the founder narrative follow the demos. Compact browser and Mac choices replace the closing banner. Noto, Lexend branding, the two-line tagline, indigo with zinc neutrals, and 44px targets remain. Marketing display type reaches 60px for the spoken result and 48px for Agent; supporting headings use 30–36px. User-approved hierarchy improvements supersede the 2026-08-24 landing layout. |
| 2026-08-24 | Landing page rebuilt as chapters, hero as a split card    | The public page had six equal-weight demos, no mention of the Mac app, and duplicate Notes/Present and privacy/setup material. It now reads proof first, then one chapter per idea: hero → Talk → codes → Spaces → Voice → Notes & Present (merged) → Where September works (new, `#calls`) → Privacy → About → closing CTA. The hero is a split card — indigo copy panel beside a quiet `indigo-50` gallery holding a cropped, non-interactive Talk console; the caret blink is the page's only motion and honors reduced motion. The kept tagline holds **exactly two lines at every width** through fluid `clamp()` sizing with each line an unbreakable block. The setup-choices section is gone (privacy absorbs it) and About moves to a gray band to keep the alternating rhythm. Every section surface carries the hero's `shadow-lg`, with inner cards at `shadow-sm`, so elevation is one scale down the page. User-approved (mocks `docs/mocks/2026-08-24-landing-ia-options.html` Option A, `docs/mocks/2026-08-24-landing-redesign.html`, `docs/mocks/2026-08-24-landing-hero-options.html` Option C). |
| 2026-08-18 | Lexend autocomplete brand identity                       | Replaced the fox mascot with an inverted 2D mechanical `Sep` keycap and a Lexend 700 wordmark. Solid `Sep` plus ghosted `tember` makes the core autocomplete feature part of the identity; Noto remains the UI font. User-approved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-10-05 | Desktop app moves to one floating panel | Supersedes the 2026-08-21 desktop layout row. The desktop app has one window, a floating panel, beside the call app. It opens at 834×1194 points and resizes from 400×560 to the full screen. Its 64px indigo header uses the sidebar tokens and replaces the screen header and the dock. On a space path, the header holds a space button, the Talk, Notes, and Agent switch, and a More menu. On every other page, it holds Back, the page title, and the More menu. The More menu lists Spaces, Voice, Eye tracker, Help, and Settings, and the space switcher has an All spaces row. The panel reuses the shared screens and folds them by width. Under 560 points, one mood menu key replaces the five mood keys, the audio selector takes its own line, and Clear moves into the More menu. Under 900 points, Phrases and Voice controls open as sheets below the header. From 900 points they open in the right rail. Every control stays at 44 points. Setup shows in the panel as a normal window. Present fills the screen with the panel while the overlay shows. With the float on, September has no Dock icon. With the float off or during setup, it has one. There is no Today screen. User-approved (mock `docs/mocks/2026-10-04-floating-panel.html`, plans `docs/plans/2026-10-05-floating-panel.md` and `docs/plans/2026-10-05-single-panel.md`). |
| 2026-10-05 | Talk body from the panel mock, in both apps | Talk is one shared screen, so the web app and the panel get the same body. The last 3 messages sit in a white card with the time and a speak mark on each row. See all shows the pages of 8 in place of the suggestions. The suggestion rows keep their word tiles and have no card. The mark at the start of a row has the colour of its tiles, and a model row has a grey sparkle. The composer is a white card with a constant 3px indigo ring. While a sentence plays, an indigo speaking card takes the place of the field. A key line under the composer shows only with a fine pointer. The sound output is one 44px headphones key, with a green dot when the September Microphone is on. The Talk body is `bg-muted/40`. Mocks: `docs/mocks/2026-10-05-talk-web.html`, `docs/mocks/2026-10-05-audio-output-options.html`. |
| 2026-10-13 | Notes as a Markdown document | The note is one document: the title is the first line in Fraunces 600, the body is Noto Sans at the 20px composer size, and the body has no box. Each Markdown line shows its format, and the caret line also shows its syntax. The composer leaves Notes. The writing tools (style keys, Undo, Delete word, Hide, and the Talk stripes) open on the first typed key under the caret line, and over it near the bottom. Escape or Hide closes them, and ⌘J opens them. The note actions move to a floating reading bar at the foot of the page: Read aloud (the selection, or the whole note), Present, Suggestions, and a More menu with Export and Delete note. The notes are a list (see the row below). Fraunces in Notes extends its approved use in Present. User-approved (mock `docs/mocks/2026-10-13-notes-doc-editor.html`). |
| 2026-10-13 | The note list replaces the note tabs | The notes of a space are a list of large rows: About first, then each note with its name, its first line of words, and the time of its last change. A search field shows from five notes. From 52rem of screen body, the list is a 288px column beside the note. Below it, the list and the note take turns, and a note opens with a "Notes" back key. Notes opens on the last note, not on the list. The reading bar shows only icons for Present, Suggestions, and More below 36rem. Chosen over a title menu and over tabs with an All notes sheet. User-approved (mock `docs/mocks/2026-10-13-note-selector-options.html`, Option B). |
| 2026-10-19 | Accessibility polish on the layout of main | The layout, Noto Sans, zinc, the filled tiles, and Fraunces stay. Secondary text is zinc-600 and field lines are zinc-500, so both pass AA. Focus is a zinc-900 line inside an amber-300 ring, and amber marks attention only, so a warning is zinc. Every key is 48px or more, and no text is smaller than 14px. Reduced motion is global. User-approved. |
| 2026-10-19 | Screens: labels and choices that a reader and a switch can use | The console keys Undo, Delete, and Clear show their labels. A gap and a line come before Speak, and Speak is the largest key. The mood in use shows its name. The rail keys show their labels under the icons. A list of choices is a radio group of `ChoiceKey` rows with a check on the chosen row. A choice that is not ready has a dashed line, not a fade. The chosen tone swatch has a 4px line. The newest message in Talk is `text-xl`. A stripe tile keeps its word size and height, and only its padding shrinks. User-approved as part of the accessibility polish. |
| 2026-10-19 | The access profile on the layout of main | Setup asks How you choose after Welcome, and Settings has Access. Each of touch, mouse, keyboard, switch, and eyes sets the key size, the gap, the word size, the timing, and the number of stripes. The theme is Light, Dark, or Same as this device, on the zinc tokens. A new input method applies on Continue or on its Use key, never on an arrow key. Dwell and scan open menus. The scan has a Pause scan key and a scan step of up to 30 seconds. The click of a press can be turned off. The word being read is indigo. User-approved. |
| 2026-10-19 | Speaking card below the messages, indigo composer ring | While a sentence plays, the indigo speaking card shows below the messages, and the composer stays in place. Write next, or a typed letter, moves the focus to the field. The composer keeps its indigo ring, at 30% at rest and full strength with the focus, a change of 3.8:1. It does not take the amber focus ring. Supersedes the speaking card part of the 2026-10-05 row. User-approved. |
| 2026-10-19 | The Talk history fits its space | Talk shows the newest messages that fit whole above the suggestions, up to 8, and always the newest one. A row that does not fit whole does not show, so no row is cut, and the scan and the keyboard never reach a hidden row. See all shows when older messages do not fit. The count changes only when a size or the messages change, so a row does not move under a dwell. Supersedes the fixed 3 messages of the 2026-10-05 row. User-approved. |

### Known gaps (honest state, not yet enforced)

- Marketing/legal pages use raw Tailwind color utilities instead of semantic tokens.
