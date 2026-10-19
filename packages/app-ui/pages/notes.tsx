import { useEffect, useRef, useState, type MutableRefObject } from "react";

import { useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  Download,
  Ellipsis,
  FileText,
  Film,
  Info,
  Loader2,
  PenLine,
  Play,
  Plus,
  Square,
  Trash2,
  Volume2,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@september/ui/components/alert-dialog";
import { cn } from "@september/ui";
import { Button } from "@september/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@september/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@september/ui/components/dropdown-menu";
import { Input } from "@september/ui/components/input";
import { Progress } from "@september/ui/components/progress";

import {
  useCreateNote,
  useDeleteNote,
  useNotes,
  usePhrases,
  usePutPhrase,
  useUpdateNote,
  useUpdateSpace,
  type Note,
  type Space,
} from "@platform/services/data";
import {
  markdownToVoiceText,
  noteContentUpdates,
  noteFromSlug,
  noteSlug,
  UNTITLED_NOTE,
} from "@september/core/rules/notes";
import {
  NoteDocument,
  type NoteDocumentHandle,
} from "@september/app-ui/blocks/note-document";
import { PanelRail } from "@september/app-ui/blocks/space-panel";
import { PresentOverlay } from "@september/app-ui/blocks/present";
import { RightPanel, ScreenHeader } from "@september/app-ui/blocks/screen";
import { documentTitle } from "@september/core/rules/titles";
import { pinnedPhrase } from "@september/core/rules/phrases";
import {
  EXPORT_ARTIFACTS,
  PRESENT_TONES,
  type ExportKind,
  type PresentToneKey,
} from "@september/core/rules/present";
import { messageTime, spaceSlug } from "@september/core/rules/spaces";
import { notePreview } from "@september/core/rules/note-document";
import { matchesWords } from "@september/core/rules/pick";
import {
  exportUnavailable,
  saveNoteAudio,
  saveNoteText,
  saveNoteVideo,
  type VideoStage,
} from "@platform/services/export";
import {
  currentPresent,
  guardUnsavedChanges,
  rememberPresent,
} from "@platform/services/os";
import { speak, stopSpeaking, useSpeaking, useVoiceFallback } from "@platform/services/speech";
import {
  spaceParams,
  SpaceDock,
  SpaceTitle,
  useRememberMode,
  useSpaceBySlug,
} from "@september/app-ui/blocks/space";

export function NotesScreen({
  slug,
  noteSlug: wanted,
}: {
  slug: string;
  noteSlug?: string;
}) {
  const { space, spaces } = useSpaceBySlug(slug, "notes");

  if (!space) return null;

  return <Notes key={space.id} space={space} spaces={spaces} wanted={wanted} />;
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
  const handle = useRef<NoteDocumentHandle | null>(null);
  const [tools, setTools] = useState(false);
  // On a narrow screen, the list and the note take turns. The note comes
  // first, because a user who writes one note at a time needs no extra press.
  const [pane, setPane] = useState<"list" | "note">("note");
  // The About tab is state, not an address. Give it an address when a user
  // asks to open the app on it.
  //
  // A space with no note of its own opens here, because a space reaches that
  // state by being skipped, and About is the one thing it still needs. An
  // address that names a note wins, so a deep link is never taken over.
  const [about, setAbout] = useState(!wanted && !space.context?.trim());
  useRememberMode(space, "notes");
  const remove = useDeleteNote(space.id);

  const rows = notes ?? [];
  // The address names the note. Without a name in it, the newest note opens,
  // because `note_list` gives the most recently changed row first.
  const note = about ? undefined : wanted ? noteFromSlug(wanted, rows) : rows[0];
  const [toDelete, setToDelete] = useState<Note | null>(null);

  const open = (row: Note) => {
    setAbout(false);
    setPane("note");
    return navigate({
      to: "/spaces/$slug/notes/$noteSlug",
      params: { slug: spaceSlug(space.title), noteSlug: noteSlug(row.name) },
    });
  };

  const add = () => create.mutateAsync().then(open);

  /** Keeps a row of the stripe, so a regeneration cannot take it away. */
  const keep = (text: string) => {
    const row = pinnedPhrase(text, space.id, phrases ?? []);
    if (row) putPhrase.mutate(row);
  };

  return (
    <>
      <title>
        {note
          ? documentTitle(note.name, space.title)
          : documentTitle(space.title, "Notes")}
      </title>
      <ScreenHeader
        heading={note ? `${note.name} · ${space.title}` : `${space.title} · Notes`}
      >
        <SpaceTitle space={space} mode="notes" />
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

      <div className="@container flex min-h-0 flex-1 flex-col gap-3 p-2 md:p-4">
        {/* From 52rem the list is a column beside the note. Below it, one
            of the two fills the screen. */}
        <div data-pane={pane} className="group/notes flex min-h-0 flex-1 gap-4">
          <NoteList
            space={space}
            notes={rows}
            current={note}
            about={about}
            onAbout={() => {
              setAbout(true);
              setPane("note");
            }}
            onOpen={open}
            onCreate={add}
            isCreating={create.isPending}
            className="@max-[52rem]:flex-1 @max-[52rem]:group-data-[pane=note]/notes:hidden @min-[52rem]:w-72 @min-[52rem]:shrink-0 @min-[52rem]:border-r @min-[52rem]:pr-4"
          />
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col @max-[52rem]:group-data-[pane=list]/notes:hidden">
            <div className="shrink-0 @min-[52rem]:hidden">
              <button
                type="button"
                onClick={() => setPane("list")}
                className="focus-attention text-brand hover:bg-primary/10 inline-flex min-h-12 items-center gap-1 rounded-full pr-4 pl-2 text-sm font-semibold"
              >
                <ChevronLeft className="size-5" aria-hidden />
                All notes
              </button>
            </div>
            {error ? (
              <p className="text-destructive rounded-xl border border-dashed p-8 text-center text-sm">
                {error.message}
              </p>
            ) : null}

            {about ? (
              <SpaceAbout space={space} onPin={keep} handle={handle} onTools={setTools} />
            ) : note ? (
              <NoteEditor
                key={note.id}
                note={note}
                spaceId={space.id}
                context={space.context ?? ""}
                onPin={keep}
                handle={handle}
                onTools={setTools}
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

            {/* The bar steps away while the writing tools are open, so one
                floating panel is on the page at a time. */}
            {note && !about && !tools ? (
              <NoteReadingBar
                note={note}
                handle={handle}
                onDelete={() => setToDelete(note)}
              />
            ) : null}
          </div>
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
          onInsert={(text) => handle.current?.insert(text)}
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
 * lose words to a save they forgot to press. Each edit starts a local write;
 * a pending or failed write keeps the close warning active.
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
  const [name, setName] = useState(note.name ?? "");
  const [content, setContent] = useState(note.content);
  const [dirty, setDirty] = useState(false);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(note.id);

  const held = useRef(content);
  const heldName = useRef(name);
  const revision = useRef(0);
  const received = useRef({ content: note.content, name: note.name });

  // Only a new repository value can replace a clean editor. Completing a
  // save must not restore an older prop while its query is still refreshing.
  if (note.id !== shown || (!dirty && (
    received.current.content !== note.content || received.current.name !== note.name
  ))) {
    setShown(note.id);
    setContent(note.content);
    setName(note.name ?? "");
    held.current = note.content;
    heldName.current = note.name ?? "";
  }
  received.current = { content: note.content, name: note.name };

  const save = () => {
    const version = ++revision.current;
    const text = held.current;
    const title = heldName.current.trim();
    const updates = noteContentUpdates(title || undefined, text);
    const savedName = title || updates.name;
    setDirty(true);
    setFailed(false);
    void update.mutateAsync({ id: note.id, ...updates, name: savedName }).then(() => {
      if (version !== revision.current) return;
      setDirty(false);
      setFailed(false);
      if (savedName) {
        heldName.current = savedName;
        setName(savedName);
        if (savedName !== note.name) onRenamed(savedName);
      }
    }).catch(() => {
      if (version === revision.current) setFailed(true);
    });
  };

  const write = (text: string) => {
    held.current = text;
    setContent(text);
    save();
  };
  const writeName = (text: string) => {
    heldName.current = text;
    setName(text);
    save();
  };

  useEffect(() => {
    if (!dirty) return;
    return guardUnsavedChanges();
  }, [dirty]);

  return (
    // The page scrolls, and the writing tools scroll with the line they serve.
    <div data-note-scroll className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col px-2 pt-6 pb-32 md:px-6">
        {failed ? (
          <div role="alert" className="mb-4">
            <p>Your note could not be saved. Keep this page open and retry.</p>
            <Button onClick={save}>Retry saving</Button>
          </div>
        ) : null}
        <input
          value={name}
          aria-label="Note title"
          placeholder={UNTITLED_NOTE}
          onChange={(event) => writeName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              writeName(note.name ?? "");
              event.currentTarget.blur();
            }
          }}
          className="focus-attention font-heading placeholder:text-muted-foreground w-full rounded-md bg-transparent text-3xl leading-tight @max-[36rem]:text-2xl font-semibold tracking-tight"
        />
        <p role="status" className="text-muted-foreground mt-1 mb-5 text-xs font-medium">
          {failed ? "Not saved" : dirty ? "Saving…" : "Saved"}
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
 * What a note can do, beside its own words, in a bar at the foot of the page.
 *
 * Read aloud reads the selected words, or the whole note when nothing is
 * selected. Present gives the note the whole screen for the person in the
 * room. Suggestions opens the writing tools without a typed key. Export and
 * Delete are in the More menu, because they are used less often, and Delete
 * is last because it is the one action that cannot be undone.
 */
export function NoteReadingBar({
  note,
  handle,
  onDelete,
}: {
  note: Note;
  handle: MutableRefObject<NoteDocumentHandle | null>;
  onDelete: () => void;
}) {
  const speaking = useSpeaking();
  const notice = useVoiceFallback();
  const [presenting, setPresenting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [part, setPart] = useState(false);
  const id = `note-${note.id}`;
  const busy = speaking === id;
  const words = note.content.trim().length > 0;

  // The label says what a press reads: the selection, or the whole note.
  useEffect(() => {
    const onSelection = () => setPart(Boolean(handle.current?.selection().trim()));
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, [handle]);

  const read = () => {
    if (busy) return stopSpeaking();
    const chosen = handle.current?.selection().trim();
    const text = markdownToVoiceText(chosen || handle.current?.text() || note.content);
    if (text) void speak(text, id);
  };

  const bar =
    "focus-attention key-disabled inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold @max-[36rem]:px-3.5 transition-colors [&_svg]:size-[18px]";

  return (
    <>
      <div
        role="toolbar"
        aria-label="Note actions"
        // A press keeps the selection in the note, so Read selection reads it.
        onMouseDown={(event) => event.preventDefault()}
        className="bg-background/95 absolute inset-x-0 bottom-4 z-10 mx-auto flex w-fit max-w-[calc(100%-1rem)] items-center gap-1.5 overflow-x-auto rounded-full border p-1.5 shadow-lg backdrop-blur [scrollbar-width:none]"
      >
        <button
          type="button"
          aria-disabled={!words && !part}
          onClick={read}
          className={cn(bar, busy ? "bg-foreground text-background" : "bg-primary text-primary-foreground")}
        >
          {busy ? <Square aria-hidden /> : <Volume2 aria-hidden />}
          {busy ? "Stop" : part ? "Read selection" : "Read aloud"}
        </button>
        <button
          type="button"
          aria-label="Present this note"
          aria-disabled={!words}
          onClick={() => words && setPresenting(true)}
          className={cn(bar, "hover:bg-accent")}
        >
          <Play aria-hidden />
          <span className="@max-[36rem]:sr-only">Present</span>
        </button>
        <button
          type="button"
          aria-label="Suggestions"
          onClick={() => handle.current?.openTools()}
          className={cn(bar, "hover:bg-accent")}
        >
          <PenLine aria-hidden />
          <span className="@max-[36rem]:sr-only">Suggestions</span>
          <kbd className="bg-muted text-muted-foreground rounded px-1.5 text-xs font-medium @max-[36rem]:hidden">⌘J</kbd>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More note actions"
              className={cn(bar, "hover:bg-accent w-12 justify-center px-0")}
            >
              <Ellipsis aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="min-w-52">
            <DropdownMenuItem
              aria-disabled={!words}
              onSelect={() => words && setExporting(true)}
              className="min-h-12 aria-disabled:opacity-50"
            >
              <Download aria-hidden />
              Export…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={onDelete}
              className="min-h-12"
            >
              <Trash2 aria-hidden />
              Delete note…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {notice ? (
        <p role="status" className="absolute inset-x-0 bottom-20 text-center text-sm">
          {notice}
        </p>
      ) : null}

      {presenting ? (
        <PresentOverlay
          name={note.name}
          content={handle.current?.text() ?? note.content}
          onClose={() => setPresenting(false)}
        />
      ) : null}

      <ExportDialog
        note={note}
        open={exporting}
        onClose={() => setExporting(false)}
      />
    </>
  );
}

const ARTIFACT_ICON: Record<ExportKind, typeof FileText> = {
  text: FileText,
  audio: Volume2,
  video: Film,
};

/** How far the film has come, and what it is doing. */
const VIDEO_STAGE: Record<VideoStage, { label: string; value: number }> = {
  voice: { label: "Generating voice", value: 25 },
  frames: { label: "Rendering slides", value: 60 },
  video: { label: "Creating video", value: 90 },
};

/**
 * The note as a file: the words, the voice, or a story film.
 *
 * A row that cannot run says why in the place of its own description, and
 * keeps its target. A row that is missing teaches the user nothing.
 */
function ExportDialog({
  note,
  open,
  onClose,
}: {
  note: Note;
  open: boolean;
  onClose: () => void;
}) {
  const [tone, setTone] = useState<PresentToneKey>(() => currentPresent().tone);
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [stage, setStage] = useState<VideoStage | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const chooseTone = (next: PresentToneKey) => {
    setTone(next);
    // One tone for the stage and the film, so a note looks the same either way.
    void rememberPresent({ ...currentPresent(), tone: next });
  };

  const run = (kind: ExportKind) => {
    if (busy || exportUnavailable(kind)) return;
    setFailed(null);
    setBusy(kind);

    if (kind === "text") {
      saveNoteText(note.name, note.content);
      setBusy(null);
      return;
    }

    const work =
      kind === "audio"
        ? saveNoteAudio(note.name, note.content)
        : saveNoteVideo(note.name, note.content, tone, setStage);

    void work
      .catch((reason: unknown) =>
        setFailed(reason instanceof Error ? reason.message : String(reason)),
      )
      .finally(() => {
        setBusy(null);
        setStage(null);
      });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>
            Save &ldquo;{note.name || UNTITLED_NOTE}&rdquo; as a file. It is made
            on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {EXPORT_ARTIFACTS.map((artifact) => {
            const reason = exportUnavailable(artifact.kind);
            const working = busy === artifact.kind;
            const Icon = ARTIFACT_ICON[artifact.kind];

            return (
              <div key={artifact.kind} className="rounded-surface border p-4">
                <div className="flex items-center gap-4">
                  <span className="bg-muted text-muted-foreground grid size-11 shrink-0 place-items-center rounded-full">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {artifact.name}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {reason ?? artifact.hint}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="lg"
                    variant={artifact.kind === "text" ? "default" : "outline"}
                    className="shrink-0 rounded-full"
                    aria-disabled={Boolean(reason) || busy !== null}
                    aria-label={`Save the ${artifact.name.toLowerCase()} file`}
                    onClick={() => run(artifact.kind)}
                  >
                    {working ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <Download aria-hidden />
                    )}
                    .{artifact.extension}
                  </Button>
                </div>

                {artifact.kind === "video" && !reason ? (
                  <div
                    role="group"
                    aria-label="Tone"
                    className="mt-3 flex flex-wrap items-center gap-2"
                  >
                    {PRESENT_TONES.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        aria-label={option.name}
                        aria-pressed={option.key === tone}
                        onClick={() => chooseTone(option.key)}
                        // The chosen tone has a 4px line, so the choice is not
                        // a color alone.
                        className={`focus-attention size-12 rounded-full ${
                          option.key === tone
                            ? "border-brand border-4"
                            : "border-input border-2"
                        }`}
                        style={{ backgroundColor: option.background }}
                      />
                    ))}
                  </div>
                ) : null}

                {working && stage ? (
                  <div className="mt-3 flex flex-col gap-1">
                    <Progress value={VIDEO_STAGE[stage].value} />
                    <span className="text-muted-foreground text-xs">
                      {VIDEO_STAGE[stage].label}…
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {failed ? (
          <p role="alert" className="text-destructive text-sm">
            {failed}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
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
function SpaceAbout({
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
  const remote = space.context ?? "";
  const [text, setText] = useState(remote);
  // The words in the field, and the words that reached local storage. The save as
  // the tab closes runs after the state is gone, so it reads these instead.
  const held = useRef({ text, saved: text });
  held.current.text = text;

  // The agent is a second writer. With nothing unsaved here, the screen takes
  // the words it wrote, so the next save does not write over them.
  if (text === held.current.saved && remote !== text) {
    setText(remote);
    held.current = { text: remote, saved: remote };
  }

  const save = () => {
    const { text: written, saved } = held.current;
    if (written === saved) return;
    held.current.saved = written;
    void patch.mutateAsync({ id: space.id, context: written });
  };

  // ponytail: the note saves when the document loses focus, and again as the
  // tab closes. No timer. Bring a delay back when a user asks to keep the
  // focus and still be saved.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => save, [space.id]);

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
        <NoteDocument
          value={text}
          onChange={setText}
          onBlur={save}
          label="About this space"
          placeholder="Who I speak to here, and what we talk about"
          spaceId={space.id}
          context={text}
          onPin={onPin}
          onTools={onTools}
          handle={handle}
        />
      </div>
    </div>
  );
}

/** A list this long gets a search field. */
const SEARCH_FROM = 5;

/**
 * The notes of a space, as a list of large rows.
 *
 * About comes first, because it decides the words that every other screen
 * offers. Each note shows its name, its first line of words, and the time of
 * its last change, so a name is never the only clue. The list is a column
 * beside the note on a wide screen, and the whole screen on a narrow one.
 */
function NoteList({
  space,
  notes,
  current,
  about,
  onAbout,
  onOpen,
  onCreate,
  isCreating,
  className,
}: {
  space: Space;
  notes: Note[];
  current?: Note;
  about: boolean;
  onAbout: () => void;
  onOpen: (note: Note) => void;
  onCreate: () => void;
  isCreating: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const words = query.trim();
  const shown = words
    ? notes.filter((one) => matchesWords(`${one.name ?? ""}\n${one.content}`, words))
    : notes;

  const row = (selected: boolean) =>
    cn(
      "focus-attention flex min-h-14 w-full flex-col justify-center gap-0.5 rounded-control px-3 py-2 text-left transition-colors",
      selected ? "bg-primary/10 ring-brand ring-1" : "hover:bg-accent",
    );

  return (
    <nav aria-label="Notes" className={cn("flex min-h-0 min-w-0 flex-col gap-2", className)}>
      <div className="flex shrink-0 items-center gap-2 px-1">
        <h2 className="text-base font-semibold">Notes</h2>
        <Button
          type="button"
          size="lg"
          className="ml-auto rounded-full"
          aria-disabled={isCreating}
          onClick={() => !isCreating && onCreate()}
        >
          <Plus aria-hidden />
          New note
        </Button>
      </div>

      {notes.length >= SEARCH_FROM ? (
        <Input
          type="search"
          value={query}
          aria-label="Search notes"
          placeholder="Search notes"
          onChange={(event) => setQuery(event.target.value)}
          className="shrink-0"
        />
      ) : null}

      <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto">
        {words ? null : (
          <li>
            <button
              type="button"
              data-note-row
              aria-current={about ? "page" : undefined}
              onClick={onAbout}
              className={row(about)}
            >
              <span className="text-brand flex items-center gap-2 font-semibold">
                <Info className="size-4 shrink-0" aria-hidden />
                About this space
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {notePreview(space.context ?? "", "") || "Who you speak to here, and why"}
              </span>
            </button>
          </li>
        )}
        {shown.map((one) => {
          const selected = !about && one.id === current?.id;
          return (
            <li key={one.id}>
              <button
                type="button"
                data-note-row
                aria-current={selected ? "page" : undefined}
                onClick={() => onOpen(one)}
                className={row(selected)}
              >
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {one.name || UNTITLED_NOTE}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {messageTime(one.updated_at)}
                  </span>
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {notePreview(one.content, one.name) || "Empty note"}
                </span>
              </button>
            </li>
          );
        })}
        {words && shown.length === 0 ? (
          <li className="text-muted-foreground px-3 py-4 text-sm">No note has these words.</li>
        ) : null}
      </ul>
    </nav>
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
            This deletes the note and its words. You cannot undo this.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Keep it</AlertDialogCancel>
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
