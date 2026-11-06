# TODOS

Deferred work captured during reviews. Each item includes what, why, pros, cons, context, and dependencies so anyone picking it up in 3 months has the reasoning intact.

## Voice cloning

### Switch Control / single-button recording UX for ALS users
- **What:** Redesign the recorder in [packages/app-ui/blocks/voice-clone.tsx](packages/app-ui/blocks/voice-clone.tsx) so a single switch press can drive the whole flow: space-to-record → space-to-stop → space-to-next. The access layer already gives every key a dwell and switch scanning, so the work is fewer presses per sample. Test end-to-end with macOS Switch Control and Voice Control.
- **Why:** September's target users have ALS/MND. The current recording UI needs multiple precise button taps (Prev, Mic, Stop, Play, Trash, Next). For switch users or users with severe motor limitations, this is unusable. CLAUDE.md says the app is "for people with ALS, MND, or speech/motor difficulties" — the recording flow should match.
- **Pros:** Makes voice cloning actually usable by the people who need it most. Reinforces September's core value.
- **Cons:** Significant UX and accessibility work. Needs user testing with real AAC users. Likely needs a design review pass and VoiceOver/keyboard/Switch Control audit.
- **Context:** The macOS keyboard in `apps/keyboard` already drives every control through `AXPress`; the web flow should match it. Switch Control test matrix should cover: auto-scan, single-switch, two-switch.
- **Depends on / blocked by:** None — can start anytime. Should precede recommending voice cloning to end users.
