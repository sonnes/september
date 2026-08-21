import { useEffect, useRef, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { FileText, Plus, Square, Trash2, Volume2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import {
  useCreateNote,
  useDeleteNote,
  useNotes,
  useSpaces,
  useUpdateNote,
  type Note,
  type Space,
} from "./data";
import {
  markdownToVoiceText,
  noteContentUpdates,
  noteFromSlug,
  noteSlug,
  UNTITLED_NOTE,
} from "./notes";
import { ScreenHeader, SpaceModes } from "./shell";
import { spaceFromSlug } from "./spaces";
import { speak, stopSpeaking, useSpeaking } from "./speech";
import { SpaceDock, SpaceTitle } from "./talk";

/** How long the screen waits after the last keystroke before it saves. */
const SAVE_DELAY_MS = 600;

export function NotesScreen({
  slug,
  noteSlug: wanted,
}: {
  slug: string;
  noteSlug?: string;
}) {
  const navigate = useNavigate();
  const { data: spaces, isPending } = useSpaces();
  const space = spaceFromSlug(slug, spaces ?? []);

  useEffect(() => {
    if (!isPending && !space) navigate({ to: "/spaces", replace: true });
  }, [isPending, space, navigate]);

  if (!space) return null;

  return (
    <Notes
      key={space.id}
      space={space}
      spaces={spaces ?? []}
      wanted={wanted}
    />
  );
}

function Notes({
  space,
  spaces,
  wanted,
}: {
  space: Space;
  spaces: Space[];
  wanted?: string;
}) {
  const navigate = useNavigate();
  const { data: notes, error } = useNotes(space.id);
  const create = useCreateNote(space.id);
  const remove = useDeleteNote(space.id);

  const rows = notes ?? [];
  // The address names the note. Without a name in it, the newest note opens,
  // because `note_list` gives the most recently changed row first.
  const note = wanted ? noteFromSlug(wanted, rows) : rows[0];
  const [toDelete, setToDelete] = useState<Note | null>(null);

  const open = (row: Note) =>
    navigate({
      to: "/spaces/$slug/notes/$noteSlug",
      params: { slug: noteSlugParams(space), noteSlug: noteSlug(row.name) },
    });

  const add = () => create.mutateAsync().then(open);

  return (
    <>
      <ScreenHeader>
        <SpaceTitle space={space} mode="notes" />
        <SpaceModes title={space.title} mode="notes" />
        {note ? <VoiceOver note={note} /> : null}
        {note ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete note"
            onClick={() => setToDelete(note)}
          >
            <Trash2 aria-hidden />
          </Button>
        ) : null}
      </ScreenHeader>

      <DeleteNoteDialog
        note={toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() =>
          remove
            .mutateAsync(toDelete!.id)
            .then(() =>
              navigate({
                to: "/spaces/$slug/notes",
                params: { slug: noteSlugParams(space) },
                replace: true,
              }),
            )
            .finally(() => setToDelete(null))
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-2 md:p-4">
        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
          {error ? (
            <p className="text-destructive rounded-xl border border-dashed p-8 text-center text-sm">
              {error.message}
            </p>
          ) : null}

          {note ? (
            <NoteEditor
              key={note.id}
              note={note}
              spaceId={space.id}
              onRenamed={(name) =>
                navigate({
                  to: "/spaces/$slug/notes/$noteSlug",
                  params: {
                    slug: noteSlugParams(space),
                    noteSlug: noteSlug(name),
                  },
                  replace: true,
                })
              }
            />
          ) : (
            <Empty onCreate={add} isPending={create.isPending} />
          )}

          {rows.length > 0 ? (
            <NoteTabs
              notes={rows}
              current={note}
              onOpen={open}
              onCreate={add}
              isCreating={create.isPending}
            />
          ) : null}
        </div>

        <SpaceDock current={space} spaces={spaces} mode="notes" />
      </div>
    </>
  );
}

/** The slug of the space, for the note routes. */
const noteSlugParams = (space: Space) =>
  noteSlug(space.title) === "note" ? "space" : slugOf(space);

const slugOf = (space: Space) =>
  (space.title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "space";

function Empty({
  onCreate,
  isPending,
}: {
  onCreate: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <FileText className="size-6" aria-hidden />
      </div>
      <p className="text-muted-foreground max-w-xs text-sm">
        A note holds long text. Write it now, and hear it in your voice when
        you are ready.
      </p>
      <Button type="button" size="lg" onClick={onCreate} disabled={isPending}>
        <Plus aria-hidden />
        New note
      </Button>
    </div>
  );
}

/**
 * The title and the words of one note.
 *
 * The screen saves on its own, because a user who types slowly must never
 * lose words to a save they forgot to press. It saves again when it closes,
 * so the last keystrokes reach SQLite even when the user leaves at once.
 */
function NoteEditor({
  note,
  spaceId,
  onRenamed,
}: {
  note: Note;
  spaceId: string;
  onRenamed: (name: string) => void;
}) {
  const update = useUpdateNote(spaceId);
  const [name, setName] = useState(note.name ?? "");
  const [content, setContent] = useState(note.content);

  // The last words typed, for the save that runs as the screen closes.
  const held = useRef(content);
  held.current = content;
  const dirty = useRef(false);

  useEffect(() => {
    if (content === note.content) return;
    dirty.current = true;

    const timer = window.setTimeout(() => {
      const updates = noteContentUpdates(note.name, content);
      dirty.current = false;
      void update.mutateAsync({ id: note.id, ...updates }).then(() => {
        // The first save gives the note a name, and the name makes the slug.
        if (updates.name) onRenamed(updates.name);
      });
    }, SAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
    // `update` and `onRenamed` are new on each render, so they stay out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, note.id, note.name, note.content]);

  useEffect(() => {
    const id = note.id;
    return () => {
      if (!dirty.current) return;
      void update.mutateAsync({ id, content: held.current });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  const saveName = () => {
    const next = name.trim();
    if (next === (note.name ?? "")) return;
    void update
      .mutateAsync({ id: note.id, name: next || undefined })
      .then(() => onRenamed(next));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <input
        value={name}
        aria-label="Note title"
        placeholder={UNTITLED_NOTE}
        onChange={(event) => setName(event.target.value)}
        onBlur={saveName}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setName(note.name ?? "");
            event.currentTarget.blur();
          }
        }}
        className="placeholder:text-muted-foreground/60 hover:bg-accent focus-visible:ring-ring shrink-0 rounded-md bg-transparent px-2 py-1 text-title font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      />
      <textarea
        autoFocus
        value={content}
        aria-label="Note"
        placeholder="Write your note here..."
        onChange={(event) => setContent(event.target.value)}
        className="placeholder:text-muted-foreground/60 focus-within:border-ring focus-within:ring-ring/20 min-h-0 flex-1 resize-none rounded-2xl border bg-transparent p-4 text-xl leading-relaxed shadow-sm transition-[box-shadow,border-color] focus:outline-none focus-within:ring-[3px]"
      />
    </div>
  );
}

/** Reads the note aloud in the chosen voice. It writes no message. */
function VoiceOver({ note }: { note: Note }) {
  const speaking = useSpeaking();
  const id = `note-${note.id}`;
  const busy = speaking === id;
  const words = markdownToVoiceText(note.content);

  return (
    <Button
      type="button"
      variant={busy ? "outline" : "default"}
      className="shrink-0 rounded-full"
      disabled={!words}
      aria-label={busy ? "Stop the voice" : "Read this note aloud"}
      onClick={() => (busy ? stopSpeaking() : void speak(words, id))}
    >
      {busy ? <Square aria-hidden /> : <Volume2 aria-hidden />}
      Voice-over
    </Button>
  );
}

/**
 * One tab for each note, in the slot the suggestions fill in Talk.
 *
 * ponytail: the row scrolls sideways. The web app collapses it into a list,
 * which needs a `ResizeObserver`; add that when a space holds enough notes
 * for the row to feel long.
 */
function NoteTabs({
  notes,
  current,
  onOpen,
  onCreate,
  isCreating,
}: {
  notes: Note[];
  current?: Note;
  onOpen: (note: Note) => void;
  onCreate: () => void;
  isCreating: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="Notes"
      className="mt-3 flex shrink-0 items-center gap-2 overflow-x-auto"
    >
      {notes.map((note) => (
        <button
          key={note.id}
          type="button"
          role="tab"
          aria-selected={note.id === current?.id}
          onClick={() => onOpen(note)}
          className={`focus-visible:ring-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
            note.id === current?.id
              ? "bg-primary text-primary-foreground border-transparent"
              : "hover:bg-accent"
          }`}
        >
          <FileText className="size-4 shrink-0" aria-hidden />
          <span className="max-w-40 truncate">{note.name || UNTITLED_NOTE}</span>
        </button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="New note"
        disabled={isCreating}
        onClick={onCreate}
      >
        <Plus aria-hidden />
      </Button>
    </div>
  );
}

function DeleteNoteDialog({
  note,
  onClose,
  onConfirm,
}: {
  note: Note | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={note !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete &ldquo;{note?.name || UNTITLED_NOTE}&rdquo;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The words of this note go for good. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Keep</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90 text-white"
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
