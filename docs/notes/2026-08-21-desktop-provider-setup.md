---
title: Desktop provider setup implementation notes
plan: ../plans/2026-08-21-desktop-provider-setup.md
---

# Desktop provider setup implementation notes

## Deviations from the plan

- The plan asked for `keys.rs` and `providers.rs`. Both are in `providers.rs`.
  The Keychain part is about 40 lines, and it is used only by the clients in
  the same file. Two files would add an import and no clarity.
- The plan said to add the `rustls-tls` feature to `reqwest`. In reqwest 0.13
  that feature is named `rustls`. The old name fails to resolve.
- The plan asked the mode step to read `apfel_status`, so the free-mode text
  matches the Mac. The text now names the requirement instead: "It needs macOS
  26 on Apple silicon." This is true on every Mac, and it keeps the mode step
  free of a sidecar start, which can take several seconds.
- The plan said the service choices go to settings while the user works. They
  are written one time, when the user leaves the Connect step. Onboarding sends
  an unreachable step back to `/welcome` after a reload, so the draft is
  deliberately volatile and a read-back during the flow would have no reader.

## Decisions the plan did not cover

- The Connect step uses a `Section` component, not the `Field` component from
  the profile step. `Field` renders a `Label`, and a `label` element cannot
  point at a radio group. The radio group names itself with `aria-label`, and
  the visible title is plain text. The two components share their class list.
- The key field and the voice list take an `aria-label`. A visible `Label`
  would repeat the choice title directly above it.
- The content security policy needed no change. `media-src` already allows
  `https:`, which covers the ElevenLabs preview URL.
- `lucide-react` is new in this app. The shadcn `radio-group` and `select`
  primitives import it, and `DESIGN.md` already names it as the icon library.
- `provider_status` runs its two key tests one after the other, not together.
  Two requests at app start do not need the concurrency.

## Marks and card height

Each mark is the brand's own published file, not a redrawing.

| Service | Mark | Source |
| --- | --- | --- |
| ElevenLabs | `public/elevenlabs-mark.svg` | The symbol from elevenlabs.io/brand |
| OpenRouter | `public/openrouter-mark.svg` | `openrouter.ai/brand/v2/openrouter-glyph-light.svg` |
| Apple Intelligence | U+F8FF | The macOS system font, through `system-ui` |
| System voice | lucide `Volume2` | No brand asset |
| No writing help | lucide `Ban` | No brand asset |

- The first mark for ElevenLabs was a crop of the wordmark in
  `apps/web/public/elevenlabs-logo.svg`. It is now their published symbol file.
  The bars are the same, but the official file is square and carries the
  clearance space that the ElevenLabs brand rules ask for.
- OpenRouter changed its logo on 13 July 2026. The `simple-icons` package still
  holds the older mark, so the file comes from the OpenRouter site. The glyph
  has a light form (`#7624F4`) and a dark form (`#C8FF00`) with the same path.
  This app is light only, so it carries the light form.
- **Apple Intelligence wears the Apple logo, by request.** The mark is the
  U+F8FF glyph, which the macOS system font carries. `--font-sans` lists
  `system-ui` after Noto Sans, so the glyph resolves without a bundled asset.
  Apple states that a third party may use its word mark in a referential
  phrase, and may not use the Apple Logo or any other Apple graphic symbol
  without an express written trademark licence
  (apple.com/legal/intellectual-property/guidelinesfor3rdparties.html). The
  choice to show it is the product owner's, and it is recorded here so a
  reviewer sees the requirement. An earlier version used a neutral `Cpu` glyph.
- Every mark sits on the same white tile with a zinc border, so the row reads
  evenly and each brand keeps its own colour.
- A choice card keeps its height when it becomes selected. Selection changes the
  border and the ring only. The key panel below belongs to the state of the
  service, so it shows whether or not that service is chosen. A panel that
  appeared on selection would grow the card and push every choice below it down.
  A test locks this: `Choice` must render `{children}`, never `{children && }`.

## Things a reviewer must know

- `nextStep` and `previousStep` take the draft now. Free setup skips
  `/connect`, so a walk by array index would land on a step the user cannot
  open. `stepsFor` is the one place that rule lives.
- `steps.tsx` used `STEPS[0]` through `STEPS[3]` for its button text. Adding
  `/connect` at index 3 moved `/finish`, so those reads are now `stepFor(path)`.
- The Rust tests never touch the real Keychain. They cover the account names
  and the network contract only.
- The free-mode copy changed meaning, not only wording. It used to say the
  message goes to OpenRouter.
- Verified on screen, on macOS 26.5 with Apple Intelligence on: the step opens
  with Apple Intelligence and the system voice already chosen, and both report
  "Ready". A click on a card title selects that card, because a `label` element
  forwards the click to the Radix radio button.
