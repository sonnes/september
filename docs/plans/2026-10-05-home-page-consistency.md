---
title: Home page consistency
date: 2026-10-05
status: done
---

# Home Page Consistency

The home page tells one story in its copy. Its examples do not. The same space name holds different phrases in two demos, one sentence has two origins, and two demos do not show what their lede claims. This plan makes every example on the page agree with the page.

All files are in `apps/web/src/components/home/`. Tests are in `home-redesign.test.tsx` in the same folder. Write each test before its change.

## Steps

### 1. One Friends Space

The live demo and the codes demo both show a space named Friends. Give both the same phrases.

In `spaces-section.tsx`, replace the Friends phrases with the three phrases of the live demo:

| Text | Code |
|---|---|
| Plot twist! | pt |
| Tell me more. | more |
| I have a better idea. | idea |

In `live-demo-section.tsx`, change the pinned chips to "Tell me more." and "Plot twist!" so that both demos use the same punctuation.

Work keeps the code `idea` today. Change it to `angle` for "Let's try another angle."

Test: the Friends tab of the codes demo offers "I have a better idea." as a pinned chip, and `matchDemoCode("pt", 1)` returns "Plot twist!".

### 2. One Origin For Each Sentence

"I see it differently." is an AI suggestion in the live demo and a saved Work phrase in the codes demo. Keep the Work phrase. In `live-demo-section.tsx`, replace the AI suggestion with "I had a feeling about that." This sentence also starts with "I ha", so the hint in the lede now leaves two rows to tap.

Test: update the two "contains" tests to type "feeling" and expect "I had a feeling about that."

### 3. A History Row With History

The live demo marks "That reminds me." as said before, but the transcript does not hold it. In `live-demo-section.tsx`, add "That reminds me." as the first message of the seeded transcript.

Test: the live demo renders "That reminds me." in the transcript before any typing.

### 4. A Two-Letter Code In The Placeholder

The lede promises that two letters can be a whole sentence. The placeholder shows the first code of the open space, and no first code has two letters. In `spaces-section.tsx`, move "I've changed my mind." with code `cm` to the first slot of Family. The default placeholder then reads "Try: cm".

Test: the codes demo placeholder reads "Try: cm" on load.

### 5. Game Night Phrase Count

The agent demo reports six phrases in Game night before the turn. The codes demo shows three after the turn, and the turn adds one. In `agent-section.tsx`, change the Game night inspect result to `inspected(1, 2, 2)`.

Test: none. The count is inside a JSON tool result that no test reads.

### 6. The Expression Demo Changes Tone, Not Sentence

The lede says the suggestions change their tone with the mood. The demo swaps between five different sentences. In `expression-section.tsx`, give every mood the same sentence with a different tag:

| Mood | Line |
|---|---|
| warm | [warmly] Can we try that one more time? |
| playful | [laughs] Can we try that one more time? |
| low | [sighs] Can we try that one more time? |
| frustrated | [frustrated sigh] Can we try that one more time? |
| angry | [firmly] Can we try that one more time? |

Each tag is in the example list of its mood in `packages/core/rules/moods.ts`.

Test: for each mood, the rendered line holds the same words after the tag.

### 7. The Doctor Calls Note

The result card shows a note that the agent never wrote. In `agent-section.tsx`, remove the `note` field from the Doctor calls space, the `note` field from `DemoSpace`, and the branch that renders it. The card then shows the two phrases only, which is what the reply describes.

Test: the Doctor calls card does not render "Questions for the doctor".

### 8. The Doctor Calls Ask

The ask says "Make a space". The turn configures the open space. In `agent-section.tsx`, change the label to "Set up a space for my doctor calls" and the ask to "Set up this space for my calls with my neurologist. I tire quickly, so I want short answers ready." The reply stays as it is.

Test: the first chip reads "Set up a space for my doctor calls".

### 9. The Platform Anchor

The nav and footer link "Mac app" to a section that covers the browser and the Mac. In `platform-section.tsx`, change the section id to `apps`. In `hero-section.tsx` and `footer.tsx`, change the href to `#apps` and the label to "Browser & Mac".

Test: the nav holds a link named "Browser & Mac" with href `#apps`, and a section with id `apps` exists.

### 10. Cloning Is A Cloud Service

The Privacy section says voice services are optional. The Voice section does not say which service cloning uses. In `voice-section.tsx`, change the card copy to: "Use a 30-second recording of yourself, or audio from an old home video. Cloning uses ElevenLabs, an optional voice service."

Test: none. This is wording.

## Order

Do steps 1 to 4 together, because they share two files and one test suite. Then do 5 to 8, which stay in `agent-section.tsx` and `expression-section.tsx`. Then do 9 and 10.

## Verification

Run from `apps/web`:

```
pnpm test -- home-redesign
pnpm test -- prerender
pnpm lint
pnpm build
```

Then open https://september.localhost and walk the page from the top. Type "I ha" in the live demo and make sure that two rows remain. Switch the codes demo to Friends and make sure that it shows the live demo phrases.

## Out Of Scope

- The eyebrow and lede copy of each section stays as it is.
- The Mac download link and version stay as they are.
- The Notes demo stays as it is. Its example matches its lede.
