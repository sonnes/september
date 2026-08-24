# Copy vocabulary standard

One standard vocabulary for all user-facing copy in the web and desktop apps.
The target reader is not technical. Each sentence must survive one read.

**The one-line rule:** one thing, one name. The actor is September or a named
service, never "a model" or "AI". Technical words appear only where the user
must meet them.

## Nouns — one name per thing

| Standard term | Means | Replaces |
| --- | --- | --- |
| space | The container for one person or place | — (already consistent) |
| Talk / Notes | The two modes of a space | — |
| message | One thing you speak in Talk | "sentence", "row" |
| About | The space description tab; describe it as "what this space is for" | "the note of the space" |
| phrase | A saved sentence; the feature is "Saved phrases" | — |
| opening | A sentence start that moves into the composer | "starter" in UI text (`starter` stays as the data kind) |
| code | The 2–5 letter shortcut for a phrase | "shortcut" ("Code ideas", not "Shortcut ideas") |
| suggestion | A tile in the stripe | "row" |
| voice | Who speaks | "sound" as a noun for the voice |
| System voice | The free built-in voice | "This device", "browser voice", "system speech", "Natural speech" |
| sample | Audio the user gives for cloning | "audio sample", "audio file", "voice file" |
| key | The credential for a service | "API key", "access key" (verbatim quotes of a vendor's own button stay exact) |
| service | OpenRouter, ElevenLabs, Apple Intelligence, System voice | "provider" |
| writing help | The suggestion and completion feature | "writing helper", "writing service", "AI" |
| model | Only inside the OpenRouter and ElevenLabs advanced pickers | "a model" as an actor anywhere else |
| request | One call to a service, on Today and Usage | "call" (collides with calling apps) |
| credits | The ElevenLabs unit | "allowance" |
| Settings | The screen where the user changes things | Cross-references always say "in Settings" |
| Services | The settings section for connections and keys | Section title "Setup" and heading "Connections" |
| setup | The one-time onboarding flow only | — |
| this Mac / this browser | Where data lives (desktop / web); shared screens say "this device" | mixed "this device" / "the device" |
| Today | The first screen | "Dashboard" |
| caregiver | — (established term, keep) | — |
| September Microphone / September Camera | Exact names, always in full | "virtual microphone", "the September input" |

## Verbs — one verb per action

| Standard verb | Means | Replaces |
| --- | --- | --- |
| Speak | Say a message aloud | "Say" |
| Read aloud | Play a note in your voice | "Voice-over" |
| Hear | Preview a voice or a sample | "Preview", "Try it" |
| Stop | Stop any sound | "Stop the voice" |
| Keep | Hold a phrase so generation never removes it | "pin" |
| Connect | Link a service; states are "Connected" / "Not connected" | — |
| Remove | Take out of a list; data survives elsewhere | — |
| Delete | Destroy a saved thing; always with the undo line | "Throw away", "go for good", "erase" |
| Clear | Empty the composer only | — |
| Create | The confirming action; "New" stays the label | "Make" |

## Style rules

1. Sentence case everywhere. Capitals only for proper names.
2. One error voice: a full sentence, capital first letter, period, what
   happened plus what to do next, 20 words or fewer.
3. No raw status code as the whole message. A code can close the sentence in
   parentheses.
4. One undo line: "You cannot undo this."
5. One empty-state shape: "No X yet." plus what makes it appear, or the action.
6. One ellipsis: the `…` character.
7. Curly apostrophes in prose.
8. "← Back" for navigation, "Cancel" to abandon an action, "Close" to dismiss
   an overlay.
9. September is the actor. Never "a model", "the system", or "AI".
10. 20 words per sentence for instructions, 25 for descriptions.

## Jargon kill list — never in user-visible text

- Internal codenames: `apfel` → "Apple Intelligence".
- Database internals: column names, byte counts, lock and transaction words.
- Raw service IDs: `openrouter` → "OpenRouter".
- Plumbing words: "multipart form", "bytes", "loopback", "endpoint", "encode".
- Usage-screen leaks: "Latency" → "Time", "chars" → "characters",
  "Cached" → "Reused", raw cost-source values → plain words.
- "Keychain refused" → "The key could not be saved on this Mac."

## Decisions

1. "Calls" → "requests" on Today and Usage.
2. "Dashboard" → "Today" (label only; route slugs stay).
3. "Clone your voice" stays; "clone" is used for nothing else.
4. "opening" over "starter" in UI text.
