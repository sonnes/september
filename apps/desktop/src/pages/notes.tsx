import { useEffect, useRef, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { FileText, Info, Plus, Square, Trash2, Volume2 } from "lucide-react";

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
  usePhrases,
  usePutPhrase,
  useSpaces,
  useUpdateNote,
  useUpdateSpace,
  type Note,
  type Space,
} from "@/services/data";
import {
  appendToNote,
  markdownToVoiceText,
  noteContentUpdates,
  noteFromSlug,
  noteSlug,
  UNTITLED_NOTE,
} from "@/rules/notes";
import { PanelRail } from "@/blocks/phrase-panel";
import { RightPanel, ScreenHeader } from "@/blocks/screen";
import { generateCode } from "@/rules/phrases";
import { spaceFromSlug, spaceSlug } from "@/rules/spaces";
import { speak, stopSpeaking, useSpeaking } from "@/services/speech";
import {
  Composer,
  spaceParams,
  SpaceDock,
  SpaceTitle,
  useRememberMode,
} from "@/blocks/space";

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
  const update = useUpdateNote(space.id);
  const { data: phrases } = usePhrases(space.id);
  const putPhrase = usePutPhrase();
  const patch = useUpdateSpace();
  const [draft, setDraft] = useState("");
  // The About tab is state, not an address. Give it an address when a user
  // asks to open the app on it.
  const [about, setAbout] = useState(false);
  useRememberMode(space, "notes");
  const remove = useDeleteNote(space.id);

  const rows = notes ?? [];
  // The address names the note. Without a name in it, the newest note opens,
  // because `note_list` gives the most recently changed row first.
  const note = about ? undefined : wanted ? noteFromSlug(wanted, rows) : rows[0];
  const [toDelete, setToDelete] = useState<Note | null>(null);

  const open = (row: Note) => {
    setAbout(false);
    return navigate({
      to: "/spaces/$slug/notes/$noteSlug",
      params: { slug: spaceSlug(space.title), noteSlug: noteSlug(row.name) },
    });
  };

  const add = () => create.mutateAsync().then(open);

  /**
   * Puts the composed words under the note.
   *
   * A space with no note yet gets one, so the words are never turned away for
   * want of a note the user has not made.
   */
  const put = (words: string) => {
    // The About tab is not a note, so the words go to the space instead.
    if (about) {
      void patch
        .mutateAsync({
          id: space.id,
          context: appendToNote(space.context ?? "", words),
        })
        .then(() => setDraft(""));
      return;
    }

    const written = note
      ? update.mutateAsync({
          id: note.id,
          ...noteContentUpdates(note.name, appendToNote(note.content, words)),
        })
      : create.mutateAsync().then((made) =>
          update.mutateAsync({
            id: made.id,
            ...noteContentUpdates(undefined, words),
          }),
        );

    void written.then((saved) => {
      setDraft("");
      if (saved.name && noteSlug(saved.name) !== wanted) {
        navigate({
          to: "/spaces/$slug/notes/$noteSlug",
          params: {
            slug: spaceSlug(space.title),
            noteSlug: noteSlug(saved.name),
          },
          replace: true,
        });
      }
    });
  };

  /** Keeps a row of the stripe, so a regeneration cannot take it away. */
  const keep = (text: string) => {
    if (phrases?.some((row) => row.text.toLowerCase() === text.toLowerCase())) {
      return;
    }
    const at = Date.now();
    putPhrase.mutate({
      id: crypto.randomUUID(),
      space_id: space.id,
      text,
      kind: "phrase",
      code: generateCode(
        text,
        {
          existingCodes: (phrases ?? [])
            .map((row) => row.code)
            .filter((code): code is string => Boolean(code)),
        },
      ),
      pinned: true,
      created_at: at,
      updated_at: at,
    });
  };

  return (
    <>
      <ScreenHeader>
        <SpaceTitle space={space} mode="notes" />
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
                params: { slug: spaceSlug(space.title) },
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

          {about ? (
            <SpaceAbout space={space} />
          ) : note ? (
            <NoteEditor
              key={note.id}
              note={note}
              spaceId={space.id}
              onRenamed={(name) =>
                navigate({
                  to: "/spaces/$slug/notes/$noteSlug",
                  params: {
                    slug: spaceSlug(space.title),
                    noteSlug: noteSlug(name),
                  },
                  replace: true,
                })
              }
            />
          ) : (
            <Empty onCreate={add} isPending={create.isPending} />
          )}

          {/* The composer always shows, because the About tab lives in its
              slot. A space with no note of its own still has that one. */}
          <Composer
            mode="notes"
            spaceId={space.id}
            context={space.context ?? ""}
            draft={draft}
            onDraft={setDraft}
            onAction={put}
            onPin={keep}
            pending={about ? patch.isPending : update.isPending}
            // The engine reads the note, not the spoken messages, so the
            // words it offers follow what the user is writing here.
            history={
              about ? [space.context ?? ""] : note ? [note.content] : []
            }
            before={
              <NoteTabs
                notes={rows}
                current={note}
                about={about}
                onAbout={() => setAbout(true)}
                onOpen={open}
                onCreate={add}
                isCreating={create.isPending}
              />
            }
          />
        </div>

        <SpaceDock
          current={space}
          spaces={spaces}
          mode="notes"
          onMode={(next) => navigate(spaceParams(space, next))}
        />
      </div>

      <RightPanel>
        <PanelRail
          spaceId={space.id}
          onInsert={(text) =>
            setDraft((current) =>
              !current || /\s$/.test(current) ? current + text : `${current} ${text}`,
            )
          }
        />
      </RightPanel>
    </>
  );
}

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
  const [dirty, setDirty] = useState(false);
  const [shown, setShown] = useState(note.id);

  // The last words typed, for the save that runs as the screen closes. The
  // cleanup runs after the state is gone, so it reads these instead.
  const held = useRef(content);
  const unsaved = useRef(dirty);
  held.current = content;
  unsaved.current = dirty;

  // The first save gives the note a name, so the field must show it.
  useEffect(() => setName(note.name ?? ""), [note.name]);

  // The composer is a second writer: it puts the composed words under the
  // note. When nothing here is unsaved, the screen takes the new text. Without
  // this the field holds the words it had, and the next save writes them back
  // over the words the composer added.
  if (note.id !== shown || (!dirty && note.content !== content)) {
    setShown(note.id);
    setContent(note.content);
    held.current = note.content;
  }

  const write = (text: string) => {
    setContent(text);
    setDirty(true);
  };

  useEffect(() => {
    if (!dirty) return;

    const timer = window.setTimeout(() => {
      const updates = noteContentUpdates(note.name, content);
      void update.mutateAsync({ id: note.id, ...updates }).then(() => {
        // A save that lands while the user types again leaves the note dirty,
        // so the next save still carries the newer words.
        if (held.current === content) setDirty(false);
        // The first save gives the note a name, and the name makes the slug.
        if (updates.name) onRenamed(updates.name);
      });
    }, SAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
    // `update` and `onRenamed` are new on each render, so they stay out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, content, note.id, note.name]);

  useEffect(() => {
    const id = note.id;
    return () => {
      // Only words that never reached SQLite. A clean note needs no write,
      // and a write here would race the other writers of the same row.
      if (!unsaved.current) return;
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
        onChange={(event) => write(event.target.value)}
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
 * The note that says who a space is for.
 *
 * A model writes it from the first message of the space, and the user writes
 * over it here. Every suggestion and every phrase of the space reads it, so a
 * correction here changes the words that the app offers.
 *
 * ponytail: the save is a copy of the one in NoteEditor, and not a shared
 * hook. The two differ — a note carries a name and a slug, and this one
 * carries neither. Join them when a third writer needs the same save.
 */
function SpaceAbout({ space }: { space: Space }) {
  const patch = useUpdateSpace();
  const remote = space.context ?? "";
  const [text, setText] = useState(remote);
  const [dirty, setDirty] = useState(false);

  // The last words typed, for the save that runs as the tab closes. The
  // cleanup runs after the state is gone, so it reads these instead.
  const held = useRef(text);
  const unsaved = useRef(dirty);
  held.current = text;
  unsaved.current = dirty;

  // The composer is a second writer. With nothing unsaved here, the screen
  // takes the words it added, so the next save does not write over them.
  if (!dirty && remote !== text) {
    setText(remote);
    held.current = remote;
  }

  useEffect(() => {
    if (!dirty) return;

    const timer = window.setTimeout(() => {
      void patch.mutateAsync({ id: space.id, context: text }).then(() => {
        // A save that lands while the user types again leaves the tab dirty,
        // so the next save still carries the newer words.
        if (held.current === text) setDirty(false);
      });
    }, SAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
    // `patch` is new on each render, so it stays out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, text, space.id]);

  useEffect(() => {
    const id = space.id;
    return () => {
      // Only words that never reached SQLite. A clean note needs no write,
      // and a write here would race the other writers of the same row.
      if (!unsaved.current) return;
      void patch.mutateAsync({ id, context: held.current });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space.id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="shrink-0 px-2">
        <h2 className="text-title font-semibold">About this space</h2>
        <p className="text-muted-foreground text-xs">
          Who you speak to here, and why. Talk reads it for every suggestion
          and every phrase.
        </p>
      </div>
      <textarea
        autoFocus
        value={text}
        aria-label="About this space"
        placeholder={"- I speak to my sister here\n- We talk about the garden"}
        onChange={(event) => {
          setText(event.target.value);
          setDirty(true);
        }}
        className="placeholder:text-muted-foreground/60 focus-within:border-ring focus-within:ring-ring/20 min-h-0 flex-1 resize-none rounded-2xl border bg-transparent p-4 text-xl leading-relaxed shadow-sm transition-[box-shadow,border-color] focus:outline-none focus-within:ring-[3px]"
      />
    </div>
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
  about,
  onAbout,
  onOpen,
  onCreate,
  isCreating,
}: {
  notes: Note[];
  current?: Note;
  about: boolean;
  onAbout: () => void;
  onOpen: (note: Note) => void;
  onCreate: () => void;
  isCreating: boolean;
}) {
  const tab = (selected: boolean) =>
    `focus-visible:ring-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
      selected
        ? "bg-primary text-primary-foreground border-transparent"
        : "hover:bg-accent"
    }`;

  return (
    <div
      role="tablist"
      aria-label="Notes"
      className="flex shrink-0 items-center gap-2 overflow-x-auto"
    >
      {/* The note of the space comes first, because it decides the words that
          every other screen offers. */}
      <button
        type="button"
        role="tab"
        aria-selected={about}
        onClick={onAbout}
        className={tab(about)}
      >
        <Info className="size-4 shrink-0" aria-hidden />
        About
      </button>

      {notes.map((note) => (
        <button
          key={note.id}
          type="button"
          role="tab"
          aria-selected={note.id === current?.id}
          onClick={() => onOpen(note)}
          className={tab(note.id === current?.id)}
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
