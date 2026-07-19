# Space-first navigation — Agent · Talk · Notes

Status: **implemented** (shell B · M2 dock · P2 sub-dock · icon-rail panel).
The chosen alternatives below shipped as described; the rejected shell/mode/
panel variants (A, M1/M3/M4/M5, P1/P3/P4) were not built. See
`docs/concepts/space-navigation.md` for the resulting design and
`docs/notes/2026-07-17-space-nav-implementation.md` for build decisions.
Mocks: `docs/mocks/2026-07-17-space-first-nav.html` (shell alternatives),
`docs/mocks/2026-07-17-mode-switching.html` (mode switching within shell B)

**Decisions (2026-07-17):** shell = **B** (sidebar stays the collapsed
icon rail, spaces as bottom dock); mode switching = **M2** (dock split —
spaces left, `Agent | Talk | Notes` right, one bottom row); notes nav =
**P2** (sub-dock note tabs above the composer); right panel = collapsible
**icon rail** mirroring the left sidebar (rail ⇄ 320px card).
Implementation plan: `docs/plans/2026-07-17-space-nav-implementation.md`.

## The idea

Spaces become the topmost context holder. Everything the user does happens
*inside* a space, in one of three modes:

- **Agent** — chat with an assistant scoped to the space: configure/change
  space settings, draft notes, manage saved phrases, seed context.
- **Talk** — the existing speaking surface (messages, composer, suggestions).
- **Notes** — the existing per-space notes (document editor, voice-over).

The bottom composer (pinned phrase rows + suggestion pills + typing box)
stays structurally the same in Talk; it can be restyled.

## What changes structurally

Today (feature-first):

```
Sidebar: Dashboard · Talk · Notes · Clone · Help · Settings
/talk                     → space list
/talk/$spaceSlug          → talk surface (Talk/Notes toggle in header)
/notes/$spaceSlug/$note   → notes, separately rooted
```

Proposed (space-first):

```
Sidebar: Home · Spaces (primary) · Voice · Settings · Help
/spaces                       → space list (landing)
/spaces/$spaceSlug            → redirect to last-used mode
/spaces/$spaceSlug/talk
/spaces/$spaceSlug/agent
/spaces/$spaceSlug/notes
/spaces/$spaceSlug/notes/$noteSlug
```

- "Talk" stops being both a section name and a surface name — it becomes
  purely the speaking mode. The section is "Spaces".
- "Clone" renames to "Voice" (it's user-level, not space-level).
- Dashboard either merges into the space list (recent spaces + resume) or
  stays as Home. Open question below.
- Old routes redirect (`/talk/$slug` → `/spaces/$slug/talk` etc.).

## Alternatives (all in the mock)

### A. Space rail — spaces live in the indigo sidebar

The sidebar lists spaces directly (like Slack channels). Modes are a
segmented control in the header: `Agent | Talk | Notes`. The bottom space
tabs disappear.

- - Spaces are *structurally* top-level — the IA is visible in the shell.
- - Scales past ~5 spaces (scroll, search, groups later).
- – On the base viewport (≤1376px) the sidebar collapses to an icon rail,
  so switching spaces costs expand-then-pick — two interactions. Worse for
  eye-gaze/switch users than today's one-tap bottom dock.
- – Sidebar becomes busier; the calm indigo identity carries more load.

### B. Bottom dock — keep space tabs at the bottom, modes in the header

Least-change evolution. Space tabs stay where they are (adjacent to the
composer, where the user's attention and pointer/gaze already live). The
header's Talk/Notes toggle grows to `Agent | Talk | Notes`. Sidebar
simplifies to global items only.

- - One-tap space switching, zero travel from the composer. Best keystroke
  economy — on-thesis ("when a choice trades density for reach, reach wins").
- - Smallest migration; bottom dock is a known, working pattern.
- – Dock scales poorly past ~5–6 spaces (horizontal space).
- – Spaces being "top-most" is not visible in the shell — the hierarchy is
  implied, not shown.

### C. Agent as companion — not a mode, a drawer

Talk and Notes remain the two modes. The agent is a right-side panel
toggleable from anywhere, always scoped to the current space, with quick
actions (Edit settings · Draft note · Manage phrases). It has its own small
input; the main composer always belongs to Talk/Notes.

- - Cleanest answer to the "which text gets spoken?" problem — the agent
  never owns the main composer, so the Speak surface is unambiguous.
- - Agent can assist *while* the user talks (e.g. suggest a phrase mid-
  conversation) instead of being a separate place to go.
- – A second input on screen is more chrome; drawer + main + composer is a
  lot at 1376px.
- – Agent duties like "reconfigure this space" feel cramped in a drawer.

### Recommendation

**B as the base, borrowing C's handoff pattern.** Keystroke economy is the
design thesis, and the bottom dock is the cheapest space switch we have.
Grow the header toggle to three modes. When the dock outgrows ~6 spaces,
introduce A's sidebar list *in addition* (dock shows pinned/recent, sidebar
shows all). From C, keep the principle: **agent output is never directly
speakable** — it hands off via explicit chips ("Save as phrase", "Open in
Notes", "Insert into composer").

## Mode switching alternatives (within shell B)

Shell B fixed: icon rail + bottom space dock. Where does `Agent | Talk |
Notes` go? Mock: `docs/mocks/2026-07-17-mode-switching.html`.

- **M1 Header segmented (baseline).** Existing Talk/Notes toggle grows to
  three. Zero new patterns, state always visible — but top-right is the
  farthest point from the composer, and nav splits into two zones.
- **M2 Dock split.** One bottom row: space tabs left, mode group right,
  deliberate gap between groups. Single nav zone at the bottom edge;
  header goes quiet. Cost: spaces and modes share row width (~4 visible
  spaces + 3 modes at 1376px; overflow behind "…").
- **M3 Compound tab.** Mode segments live *inside* the active space tab —
  hierarchy made literal. Most elegant, but mini-segments fall below the
  44px target floor and the control moves when you switch spaces.
- **M4 Rail modes.** The icon rail gains a contextual "SPACE" section with
  three mode icons. Fixed position (great for switch scanning), no width
  cost — but icons-only, and it mixes global + contextual nav in one rail.
- **M5 No tabs — layers.** Talk is the space itself; Agent opens as a
  drawer, Notes as a full overlay. No mode state to hold; interruptions
  land safely on Talk. Cost: Notes demoted for long writing; deep-linking
  fuzzier. (Pairs with shell alternative C's drawer.)

**Leaning: M2**, with M1 as the safe fallback if dock crowding tests
badly. M4 becomes interesting if a fourth mode ever appears; M5 is a
product-philosophy question (agent = tool vs place), not just navigation.

## Right panel & notes navigation (within B + M2)

Mock: `docs/mocks/2026-07-17-right-panel.html`.

Today the right panel is two different things: in Talk it's a settings hub
(overview grid → History / Provider / Voice / Speech / Context / Phrases /
Display, `ChatRightPanel`); in Notes it *is* the notes navigator
(`SpaceNotesPanel`: card list with voice-over / download / reel actions
inside the selected card). With Agent mode arriving, Context and Phrases
move to the agent's remit, which reopens what the panel is for.

- **P1 Toolbox panel.** One consistent panel across modes: icon tab-rail
  (contextual tab first — Notes here, History in Talk — then Voice,
  Display). Note cards become pure nav; per-note actions move to the
  editor header. Cost: switching notes needs the panel open (−300px), and
  right-side nav breaks the M2 bottom-edge principle.
- **P2 Sub-dock.** Note tabs in a strip directly above the composer — the
  same slot phrase rows occupy in Talk. Nav joins the bottom zone; editor
  full width; panel becomes an on-demand toolbox. Cost: titles only,
  ~4–5 notes before overflow.
- **P3 Master-detail.** Persistent list column inside the content (Apple
  Notes shape). Rich previews always visible, scales well. Cost: ~250px
  permanent width, and Notes gets a different layout grammar than
  Talk/Agent.
- **P4 Title switcher.** The note title is a dropdown switcher; zero
  standing chrome; panel = per-note actions (voice-over, download, reel
  swatches, display). Cost: two taps per switch, low discoverability.

**Leaning: P2**, with P4's dropdown demoted to the overflow ("…") path
past ~5 notes, and P3 as the escalation if users turn out to keep many
long notes per space. Cross-cutting moves regardless of pick:

- The strip above the composer is the mode's **working set** — phrase
  rows in Talk, note tabs in Notes, prompt pills in Agent. One slot, one
  meaning.
- The right panel stops being navigation anywhere. It becomes a slim
  on-demand toolbox (History · Voice · Display); Context & Phrases tabs
  retire into the Agent (direct phrase editing stays via Talk's phrase
  rows).
- Per-note actions (voice-over · download · reel) move from the panel
  card into the editor header — visible exactly when the note is.

## Composer restyle (structure unchanged)

- Phrase rows, suggestion pills, input, Speak: same structure and order.
- Restyle: input becomes a soft card (`rounded-xl`, `shadow-sm`) with an
  indigo focus ring; Speak becomes `lg` `rounded-full` (44px+ target);
  phrase rows get quieter chips (`rounded-md`, zinc borders) so the pills
  and input read as the loud layer.
- In Agent mode the same composer is reused but the primary action becomes
  **Send** (secondary styling, not indigo Speak) — visual insurance against
  speaking a prompt aloud.

## Gaps & unknown unknowns

1. **Speak vs Send ambiguity.** Same chat-shaped UI for Talk (spoken aloud,
   the user's voice) and Agent (meta-conversation). If they look alike,
   users will eventually speak a prompt or send a sentence meant for the
   room to the agent. Needs a distinct visual language per mode (mock shows
   one treatment) and distinct primary-action labels.
2. **Does the shared composer's suggestion engine know the mode?** Talk
   suggestions predict speech; Agent mode should suggest *prompts* ("Add a
   phrase about…", "Summarize today's talk into a note"). Two suggestion
   sources behind one UI.
3. **Two settings surfaces.** Agent configures *space* settings; the
   Settings page configures the *app/user*. Users won't hold that
   distinction. Decide: does the agent also answer app-settings requests
   (deep-linking to Settings), or refuse with a pointer?
4. **Agent edit trust.** Agent renames the space, rewrites context, deletes
   phrases — silently? Every agent-made change needs a visible receipt in
   the chat (diff chip) and an undo. Otherwise users can't audit what
   changed.
5. **Space bootstrap.** New space creation is an agent-shaped moment ("What
   is this space for?") — the agent could interview once and seed title,
   context, and phrases. Replaces today's create-then-configure. Decide if
   new-space lands in Agent mode.
6. **Landing & resume.** Space-first implies open-app → last space + last
   mode, not a list. Needs per-space last-mode persistence and a global
   "resume" affordance. What does a brand-new user (zero spaces) see?
7. **Quick-jump to Talk.** Real conversations interrupt: user is in Notes
   or Agent, someone speaks to them. Mode switch must be one tap from
   anywhere — consider a persistent Talk shortcut or hotkey, not just the
   segmented control.
8. **Cross-space agent scope.** "Move this phrase to my Family space",
   "what did I talk about yesterday across spaces" — the agent is scoped
   per space, but users will ask global things. Refuse, or allow with
   explicit space mentions?
9. **Phrases live in two places.** Managed via Agent, used via pinned rows
   in Talk. Direct manipulation (pin/unpin/edit in place) should survive —
   the agent is an alternative path, not the only path.
10. **Dashboard fate.** Is Home/Dashboard still earning its sidebar slot,
    or does the space list become the landing? Two "start here" surfaces
    is one too many.
11. **Notes list vs notes mode.** `/notes` today has its own space-scoped
    hierarchy. Under space-first it's a mode — but the *global* "all my
    notes across spaces" view disappears. Does anyone need it?
12. **Compact/mobile.** Bottom dock + composer + suggestion pills + mode
    tabs all compete for the bottom edge on phones. Decide the mobile
    stack order before building (mock is desktop/iPad only).
13. **Offline/on-device agent.** Talk suggestions can run on-device
    (privacy mode). The agent implies a heavier model — is Agent mode
    degraded or hidden in privacy mode? On-device concept doc says nothing
    about agent-grade chat.
14. **Message history semantics.** Talk history = things said aloud (a
    record of real conversation). Agent history = tool chatter. Keep them
    in separate collections from day one or migration hurts later
    (`messages.type` exists but audit its uses).

## Migration sketch (when approved)

1. New route group `/spaces/$spaceSlug/{agent,talk,notes}`; redirects from
   `/talk/*` and `/notes/*`.
2. Sidebar: `getNavigationData()` reshuffle (Spaces primary; Clone→Voice).
3. Header mode toggle: extend existing Talk/Notes segmented control.
4. Agent surface: new `@/packages/agent` module (chat UI, space tools).
5. Composer: extract mode-aware primary action; restyle per DESIGN.md.
