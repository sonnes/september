# TODOS

Deferred work captured during reviews. Each item includes what, why, pros, cons, context, and dependencies so anyone picking it up in 3 months has the reasoning intact.

## Voice cloning

### Persist created voice_id locally + voice picker
- **What:** After ElevenLabs returns a `voice_id`, persist `{voice_id, name, description, created_at}` in IndexedDB. Surface the list in `/settings/ai` and add a voice picker on `/talk` and `/write`.
- **Why:** Today the clone disappears into a toast. The user has to remember the name and dig through ElevenLabs dashboard to reuse it. The feature is functionally dead without this follow-up — you cloned a voice but nothing in September can actually use it.
- **Pros:** Unlocks the whole reason voice cloning exists. Users can select their own cloned voice for TTS playback. Unblocks multi-voice selection if the user clones more than one (e.g., "calm me", "excited me").
- **Cons:** Needs UX decisions on picker placement, default voice, and what happens if the user deletes the voice in ElevenLabs but it still lives in September's store. Needs a schema for the persisted record and a migration path if that schema changes.
- **Context:** Source code at [packages/cloning/components/form.tsx:87-89](packages/cloning/components/form.tsx#L87-L89) — today the `result.voice_id` is only shown in a toast and then forgotten. The cloning package already owns the storage primitive via [use-voice-storage.ts](packages/cloning/hooks/use-voice-storage.ts); extending it to store voice metadata is straightforward. See also [/settings/ai](apps/web/app/(app)/settings/) for where the API key lives — the voice list belongs nearby.
- **Depends on / blocked by:** Voice cloning fix PR (current work) lands first.

### Switch Control / single-button recording UX for ALS users
- **What:** Redesign [packages/cloning/components/record.tsx](packages/cloning/components/record.tsx) so a single switch press can drive the whole flow: space-to-record → space-to-stop → space-to-next. Add dwell/delay tolerances for users with tremor or limited precision. Test end-to-end with macOS Switch Control and Voice Control.
- **Why:** September's target users have ALS/MND. The current recording UI needs multiple precise button taps (Prev, Mic, Stop, Play, Trash, Next). For switch users or users with severe motor limitations, this is unusable. CLAUDE.md says the app is "for people with ALS, MND, or speech/motor difficulties" — the recording flow should match.
- **Pros:** Makes voice cloning actually usable by the people who need it most. Reinforces September's core value.
- **Cons:** Significant UX and accessibility work. Needs user testing with real AAC users. Likely needs a design review pass and VoiceOver/keyboard/Switch Control audit.
- **Context:** See [apps/swift/docs/accessibility-implementation-guide.md](apps/swift/docs/accessibility-implementation-guide.md) for parallel Swift accessibility work — web flow should match conceptually. Switch Control test matrix should cover: auto-scan, single-switch, two-switch.
- **Depends on / blocked by:** None — can start anytime. Should precede recommending voice cloning to end users.
