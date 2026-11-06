import { AudioLines } from "lucide-react";

import { useSpokenWord } from "@september/app-ui/services/speech";
import { draftParts, tagLabel } from "@september/core/rules/audio-tags";
import { wordsOf } from "@september/core/rules/spoken-word";

/** The inside of a tag tile or chip: a sound mark and the words of the tag. */
export function TagMark({ label }: { label: string }) {
  return (
    <>
      <AudioLines className="size-[0.9em] shrink-0" aria-hidden />
      {label}
    </>
  );
}

/**
 * A sentence that the voice can read. While the voice reads this sentence,
 * the word it is on is indigo with white words. Amber marks attention only,
 * so the word that is read is not amber. A sentence with audio tags shows its
 * tags instead, because the voice does not read them as words.
 */
export function SpokenText({ id, text }: { id: string; text: string }) {
  const spoken = useSpokenWord();
  if (draftParts(text).some((part) => part.tag)) return <TaggedText text={text} />;
  const reading = spoken?.id === id ? spoken.word : null;
  return (
    <>
      {wordsOf(text).map((part, index) =>
        part.word !== null && part.word === reading ? (
          <mark
            key={index}
            className="bg-primary text-primary-foreground rounded-md px-0.5 [box-decoration-break:clone]"
          >
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  );
}

/** Text with each audio tag shown as a chip, for a message or a phrase. */
export function TaggedText({ text }: { text: string }) {
  return (
    <>
      {draftParts(text).map((part, index) =>
        part.tag ? (
          <span
            key={index}
            data-tag
            className="bg-primary/10 text-brand inline-flex items-center gap-1 rounded-full px-2 align-baseline text-sm font-medium"
          >
            <TagMark label={tagLabel(part.text)} />
          </span>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
