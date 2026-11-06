import { useRef, useState, type MutableRefObject } from "react";
import { Button } from "@september/ui/components/button";
import { useUpdateNote, useUpdateSpace } from "@september/app-ui/services/data";
import type { Note, Space } from "@september/core/rules/records";
import { noteContentUpdates, UNTITLED_NOTE } from "@september/core/rules/notes";
import { NoteDocument, type NoteDocumentHandle } from "@september/app-ui/blocks/note-document";
import { useAutosave } from "@september/app-ui/services/autosave";
import { useEscape } from "@september/app-ui/blocks/keymap";

/**
 * The title and the words of one note.
 *
 * Each edit saves on its own. A waiting or failed write keeps the close
 * warning on.
 */
export function NoteEditor({
  note,
  spaceId,
  context = "",
  onRenamed,
  onPin,
  onTools,
  handle,
}: {
  note: Note;
  spaceId: string;
  /** The About words of the space, for the suggestion stripes. */
  context?: string;
  onRenamed: (name: string) => void;
  onPin?: (phrase: string) => void;
  onTools?: (open: boolean) => void;
  handle?: MutableRefObject<NoteDocumentHandle | null>;
}) {
  const update = useUpdateNote(spaceId);
  const saved = useAutosave(
    { name: note.name ?? "", content: note.content },
    async ({ name, content }) => {
      const title = name.trim();
      const updates = noteContentUpdates(title || undefined, content);
      const savedName = title || updates.name;
      await update.mutateAsync({ id: note.id, ...updates, name: savedName });
      if (!savedName) return;
      if (savedName !== note.name) onRenamed(savedName);
      return { name: savedName, content };
    },
  );
  const { name, content } = saved.value;
  const write = (text: string) => saved.write({ ...saved.current(), content: text });
  const writeName = (text: string) => saved.write({ ...saved.current(), name: text });
  const title = useRef<HTMLInputElement>(null);
  const [naming, setNaming] = useState(false);
  useEscape(
    naming
      ? () => {
          writeName(note.name ?? "");
          title.current?.blur();
        }
      : null,
  );

  return (
    // The page scrolls, and the writing tools scroll with the line they serve.
    <div data-note-scroll className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col px-2 pt-6 pb-32 md:px-6">
        {saved.state === "failed" ? (
          <div role="alert" className="mb-4">
            <p>Your note could not be saved. Keep this page open and retry.</p>
            <Button onClick={saved.retry}>Retry saving</Button>
          </div>
        ) : null}
        <input
          value={name}
          aria-label="Note title"
          placeholder={UNTITLED_NOTE}
          onChange={(event) => writeName(event.target.value)}
          ref={title}
          onFocus={() => setNaming(true)}
          onBlur={() => setNaming(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="focus-attention font-heading placeholder:text-muted-foreground w-full rounded-md bg-transparent text-3xl leading-tight @max-[36rem]:text-2xl font-semibold tracking-tight"
        />
        <p role="status" className="text-muted-foreground mt-1 mb-5 text-xs font-medium">
          {saved.state === "failed" ? "Not saved" : saved.state === "saving" ? "Saving…" : "Saved"}
        </p>
        <NoteDocument
          value={content}
          onChange={write}
          label="Note"
          placeholder="Write your note here…"
          spaceId={spaceId}
          context={context}
          onPin={onPin}
          onTools={onTools}
          handle={handle}
        />
      </div>
    </div>
  );
}


/**
 * The note that says who a space is for.
 *
 * A model writes it from the first message of the space, and the user writes
 * over it here. Every suggestion and every phrase of the space reads it, so a
 * correction here changes the words that the app offers.
 */
export function SpaceAbout({
  space,
  onPin,
  onTools,
  handle,
}: {
  space: Space;
  onPin: (phrase: string) => void;
  onTools: (open: boolean) => void;
  handle: MutableRefObject<NoteDocumentHandle | null>;
}) {
  const patch = useUpdateSpace();
  const saved = useAutosave(space.context ?? "", async (context) => {
    await patch.mutateAsync({ id: space.id, context });
  });

  return (
    <div data-note-scroll className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col px-2 pt-6 pb-32 md:px-6">
        <h2 className="font-heading text-3xl leading-tight font-semibold tracking-tight">
          About this space
        </h2>
        <p className="text-muted-foreground mt-1 mb-5 text-sm">
          Who you speak to here, and why. Talk reads it for every suggestion
          and every phrase.
        </p>
        {saved.state === "failed" ? (
          <div role="alert" className="mb-4">
            <p>The words about this space could not be saved. Keep this page open and retry.</p>
            <Button onClick={saved.retry}>Retry saving</Button>
          </div>
        ) : null}
        <NoteDocument
          value={saved.value}
          onChange={saved.write}
          label="About this space"
          placeholder="Who I speak to here, and what we talk about"
          spaceId={space.id}
          context={saved.value}
          onPin={onPin}
          onTools={onTools}
          handle={handle}
        />
      </div>
    </div>
  );
}
