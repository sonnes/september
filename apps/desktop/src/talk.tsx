import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Delete,
  FileText,
  Headphones,
  Mic,
  MessagesSquare,
  Plus,
  MessageSquareQuote,
  Search,
  Square,
  Trash2,
  Undo2,
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { describeSpace } from "./ai";
import { navFor } from "./app-nav";
import {
  useCreateSpace,
  useDeleteSpace,
  useMessages,
  usePhrases,
  usePutPhrase,
  useSendMessage,
  useSpaces,
  useUpdateSpace,
  type Message,
  type Space,
} from "./data";
import {
  chooseOutput,
  currentOutput,
  listOutputs,
  rememberModes,
  spaceModes,
  startVirtualCamera,
  startVirtualMicrophone,
  stopVirtualCamera,
  stopVirtualMicrophone,
  updateVirtualCameraOverlay,
  virtualCameraStatus,
  virtualMicrophoneStatus,
} from "./os";
import { RightPanel, Screen, ScreenHeader } from "./shell";
import { PanelRail } from "./phrase-panel";
import { generateCode, type SavedPhrase } from "./phrases";
import { useSyncPhrases } from "./phrase-sync";
import { speak, stopSpeaking, useSpeaking, useVoiceFallback } from "./speech";
import { Suggestions } from "./suggestions";
import {
  deleteLastWord,
  filterSpaces,
  isAutoTitle,
  newSpaceTitle,
  rememberSpaceMode,
  spaceFromSlug,
  spaceModeFrom,
  spaceSlug,
  timeAgo,
  transcriptPage,
  type SpaceMode,
} from "./spaces";

const talkParams = (space: Pick<Space, "title">) => ({
  to: "/spaces/$slug/talk" as const,
  params: { slug: spaceSlug(space.title) },
});

const notesParams = (space: Pick<Space, "title">) => ({
  to: "/spaces/$slug/notes" as const,
  params: { slug: spaceSlug(space.title) },
});

export const spaceParams = (space: Pick<Space, "title">, mode: SpaceMode) =>
  mode === "notes" ? notesParams(space) : talkParams(space);

// The modes as they stand. The setting holds the same answers, and the two
// only differ while a write is in flight.
let modes = spaceModes;

/** The mode a space was left in, for a screen that opens one. */
export const openParams = (space: Pick<Space, "title">) =>
  spaceParams(space, spaceModeFrom(modes, spaceSlug(space.title)));

/**
 * Keeps the mode a space is open in, so it opens the same way next time.
 *
 * A user who writes notes in one space and talks in another should not have
 * to say so twice a day.
 */
export function useRememberMode(space: Space, mode: SpaceMode) {
  useEffect(() => {
    const slug = spaceSlug(space.title);
    if (spaceModeFrom(modes, slug) === mode) return;

    modes = rememberSpaceMode(modes, slug, mode);
    void rememberModes(modes);
  }, [space.title, mode]);
}

function Problem({ error }: { error: Error }) {
  return (
    <p className="text-destructive rounded-xl border border-dashed p-8 text-center text-sm">
      {error.message}
    </p>
  );
}

// ------------------------------------------------------------- space list

export function SpacesScreen() {
  const navigate = useNavigate();
  const { data: spaces, isPending, error } = useSpaces();
  const createSpace = useCreateSpace();

  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<Space | null>(null);

  const shown = useMemo(
    () => filterSpaces(spaces ?? [], search),
    [spaces, search],
  );

  const add = () =>
    createSpace
      .mutateAsync(newSpaceTitle((spaces ?? []).map((space) => space.title)))
      .then((space) => navigate(talkParams(space)));  // a new space starts in Talk

  const newSpaceButton = (
    <Button type="button" onClick={add} disabled={createSpace.isPending}>
      <Plus aria-hidden />
      New space
    </Button>
  );

  return (
    <Screen
      title="Spaces"
      description={navFor("/spaces").description}
      action={spaces?.length ? newSpaceButton : undefined}
    >
      {error ? <Problem error={error} /> : null}

      {isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}

      {spaces?.length ? (
        <div className="relative">
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            value={search}
            aria-label="Search spaces"
            placeholder="Search your spaces..."
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
      ) : null}

      {spaces && spaces.length === 0 ? (
        <Empty
          title="No spaces yet"
          body="A space keeps the words you use with one person or in one place."
          action={
            <Button type="button" onClick={add} disabled={createSpace.isPending}>
              <Plus aria-hidden />
              Make your first space
            </Button>
          }
        />
      ) : null}

      {spaces?.length && shown.length === 0 ? (
        <Empty title="No spaces found" body="No title holds those words." />
      ) : null}

      {shown.length ? (
        <ul className="flex flex-col divide-y rounded-xl border">
          {shown.map((space) => (
            <li key={space.id} className="flex items-center gap-2 px-2">
              <button
                type="button"
                onClick={() => navigate(openParams(space))}
                className="hover:text-primary focus-visible:ring-ring min-w-0 flex-1 rounded-md px-2 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="block truncate text-base font-medium">
                  {space.title}
                </span>
                <span className="text-muted-foreground text-sm">
                  Last message {timeAgo(space.updated_at)}
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${space.title}`}
                className="text-destructive hover:text-destructive"
                onClick={() => setToDelete(space)}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <DeleteSpaceDialog space={toDelete} onClose={() => setToDelete(null)} />
    </Screen>
  );
}

function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-10 text-center">
      <MessagesSquare className="text-muted-foreground size-8" aria-hidden />
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-muted-foreground text-sm">{body}</p>
      </div>
      {action}
    </div>
  );
}

/** Deleting a space deletes its messages too, so the user says yes first. */
function DeleteSpaceDialog({
  space,
  onClose,
}: {
  space: Space | null;
  onClose: () => void;
}) {
  const deleteSpace = useDeleteSpace();

  return (
    <AlertDialog open={Boolean(space)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {space?.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the space and every message in it. You cannot undo
            this action.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteSpace.isPending}>
            Keep it
          </AlertDialogCancel>
          <AlertDialogAction
            // The button that erases the messages must not look like the
            // button that keeps them.
            variant="destructive"
            disabled={deleteSpace.isPending}
            onClick={(event) => {
              event.preventDefault();
              if (space) deleteSpace.mutate(space.id, { onSuccess: onClose });
            }}
          >
            {deleteSpace.isPending ? "Deleting..." : "Delete space"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ------------------------------------------------------------------- talk

export function TalkScreen({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const { data: spaces, isPending } = useSpaces();
  const space = spaceFromSlug(slug, spaces ?? []);

  // A slug that names no space is a stale link, so it goes back to the list.
  useEffect(() => {
    if (!isPending && !space) navigate({ to: "/spaces", replace: true });
  }, [isPending, space, navigate]);

  if (!space) return null;

  // The key restarts the composer and the page when the space changes.
  return <Talk key={space.id} space={space} spaces={spaces ?? []} />;
}

function Talk({ space, spaces }: { space: Space; spaces: Space[] }) {
  const { data: messages, error } = useMessages(space.id);
  const { data: phrases } = usePhrases(space.id);
  const send = useSendMessage(space.id);
  const putPhrase = usePutPhrase();
  const update = useUpdateSpace();
  const navigate = useNavigate();

  // A model writes the phrases of this space, and writes them again as the
  // conversation grows. It never touches a row the user kept.
  useSyncPhrases({ space, phrases, messages });
  useRememberMode(space, "talk");

  const speaking = useSpeaking();
  const fallback = useVoiceFallback();
  const [draft, setDraft] = useState("");
  const [pageInput, setPageInput] = useState(0);

  const spoken = (messages ?? []).filter((message) => message.type === "user");
  const { page, pageCount, slice } = transcriptPage(spoken, pageInput);

  // A new message goes to the newest page, so the user never sends from
  // behind an old page.
  const newest = spoken[spoken.length - 1]?.id;
  useEffect(() => setPageInput(0), [newest]);

  /** Keeps a row of the stripe, so a regeneration cannot take it away. */
  const keep = (text: string) => {
    if (phrases?.some((row) => row.text.toLowerCase() === text.toLowerCase())) return;
    const at = Date.now();
    const codes = (phrases ?? [])
      .map((row) => row.code)
      .filter((code): code is string => Boolean(code));

    const row: SavedPhrase = {
      id: crypto.randomUUID(),
      space_id: space.id,
      text,
      kind: "phrase",
      code: generateCode(text, { existingCodes: codes }),
      pinned: true,
      created_at: at,
      updated_at: at,
    };
    putPhrase.mutate(row);
  };

  /**
   * The first message says who the space is for, so a model reads it once and
   * gives the space a name and a note. Every later message skips this.
   */
  const describe = (first: string) => {
    if (spoken.length > 0) return;

    void describeSpace(first)
      .then((answer) => {
        if (!answer) return;

        // A title the user typed stays, and so does a note the user wrote.
        const title =
          answer.title && isAutoTitle(space.title) ? answer.title : undefined;
        const context = space.context?.trim() ? undefined : answer.context;
        if (!title && !context) return;

        return update
          .mutateAsync({ id: space.id, title, context })
          .then(() => {
            // A new title makes a new slug, and the open address holds the
            // old one. Without this the screen goes blank.
            if (title) navigate({ ...talkParams({ title }), replace: true });
          });
      })
      // A service that fails leaves the made-up title. Nothing is lost.
      .catch(() => undefined);
  };

  const say = (sentence: string) => {
    void speak(sentence);
    send.mutate(sentence, {
      onSuccess: () => {
        describe(sentence);
        setDraft("");
      },
    });
  };

  const write = (text: string) => setDraft(text);


  // The voice starts at once. The composer holds the text until SQLite
  // accepts the message, so a failed write loses no words.

  return (
    <>
      <ScreenHeader>
        <SpaceTitle space={space} />
      </ScreenHeader>


      <div className="flex min-h-0 flex-1 flex-col gap-3 p-2 md:p-4">
        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
          {error ? <Problem error={error} /> : null}

          {pageCount > 1 ? (
            <nav
              aria-label="Transcript pages"
              className="flex shrink-0 items-center justify-between gap-2 pb-2"
            >
              <PageButton
                label="Older messages"
                onClick={() => setPageInput(page + 1)}
                disabled={page >= pageCount - 1}
              >
                <ChevronLeft className="size-4" aria-hidden />
                Older
              </PageButton>
              <span className="text-muted-foreground text-xs" aria-live="polite">
                Page {page + 1} of {pageCount}
              </span>
              <PageButton
                label="Newer messages"
                onClick={() => setPageInput(page - 1)}
                disabled={page === 0}
              >
                Newer
                <ChevronRight className="size-4" aria-hidden />
              </PageButton>
            </nav>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col justify-end gap-2.5 overflow-y-auto py-4">
            {spoken.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
                  <MessagesSquare className="size-6" aria-hidden />
                </div>
                <p className="text-muted-foreground max-w-xs text-sm">
                  Write a sentence below, then press Speak. What you say shows
                  here.
                </p>
              </div>
            ) : (
              slice.map((message) => (
                <Bubble key={message.id} message={message} />
              ))
            )}
          </div>

          <Composer
            mode="talk"
            spaceId={space.id}
            context={space.context ?? ""}
            draft={draft}
            onDraft={write}
            onAction={say}
            onPin={keep}
            pending={send.isPending}
            note={
              fallback
                ? `The chosen voice did not answer, so this Mac spoke instead (${fallback}).`
                : undefined
            }
          />
        </div>

        <SpaceDock
          current={space}
          spaces={spaces}
          mode="talk"
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


/**
 * The console the user writes in, in both modes.
 *
 * A user who cannot type reaches a sentence through the word tiles, the
 * phrase codes, undo, and delete last word. Notes needs every one of them as
 * much as Talk does, so there is one console, not two. Only the button at the
 * end differs: Talk speaks the sentence, Notes puts it under the note.
 */
export function Composer({
  mode,
  spaceId,
  context,
  draft,
  onDraft,
  onAction,
  onPin,
  pending,
  note,
  history,
  before,
}: {
  mode: SpaceMode;
  spaceId: string;
  context: string;
  draft: string;
  onDraft: (text: string) => void;
  onAction: (text: string) => void;
  onPin: (phrase: string) => void;
  pending?: boolean;
  /** A line under the field, for example why a voice did not answer. */
  note?: string;
  /** The words the suggestion engine reads. Notes gives it the note. */
  history?: string[];
  /** The working-set row above the suggestions. Notes puts its tabs here. */
  before?: ReactNode;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const speaks = mode === "talk";

  // The field grows with its text, up to the height the class holds.
  useEffect(() => {
    const box = field.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${box.scrollHeight}px`;
  }, [draft]);

  const write = (text: string) => {
    setUndoStack((stack) => [...stack.slice(-49), draft]);
    onDraft(text);
    field.current?.focus();
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    onDraft(undoStack[undoStack.length - 1]);
    setUndoStack((stack) => stack.slice(0, -1));
    field.current?.focus();
  };

  const act = (sentence: string) => {
    const words = sentence.trim();
    if (!words) return;
    onAction(words);
    setUndoStack([]);
    field.current?.focus();
  };

  return (
    <div className="bg-muted/40 flex shrink-0 flex-col gap-3 rounded-2xl p-3">
      {before}

      <Suggestions
        spaceId={spaceId}
        context={context}
        text={draft}
        history={history}
        onTake={write}
        onSpeak={act}
        onPin={onPin}
      />

      <div className="bg-background focus-within:border-ring focus-within:ring-ring/20 rounded-2xl border p-3 shadow-sm transition-[box-shadow,border-color] focus-within:ring-[3px]">
        <textarea
          ref={field}
          autoFocus
          rows={1}
          value={draft}
          aria-label={speaks ? "Message" : "Words for the note"}
          placeholder={
            speaks ? "Write a message..." : "Write words to add to this note..."
          }
          onChange={(event) => onDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              act(draft);
            }
          }}
          className="placeholder:text-muted-foreground/60 max-h-60 w-full resize-none overflow-y-auto bg-transparent text-xl leading-snug focus:outline-none"
        />
        {note ? (
          <p className="text-muted-foreground mt-2 text-xs">{note}</p>
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Undo"
              onClick={undo}
              disabled={undoStack.length === 0}
            >
              <Undo2 aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Delete last word"
              onClick={() => write(deleteLastWord(draft))}
              disabled={!draft}
            >
              <Delete aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Clear"
              onClick={() => write("")}
              disabled={!draft}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {/* The sound output belongs beside the button that makes a sound.
                Notes makes none. */}
            {speaks ? <AudioSelector overlayText={draft} /> : null}
            <Button
              type="button"
              size="lg"
              className="rounded-full px-6 font-semibold"
              onClick={() => act(draft)}
              disabled={!draft.trim() || pending}
            >
              {speaks ? <Volume2 aria-hidden /> : <FileText aria-hidden />}
              {speaks ? "Speak" : "Add to note"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The name of the space. A new name changes the address of the space too. */
export function SpaceTitle({
  space,
  mode = "talk",
}: {
  space: Space;
  mode?: SpaceMode;
}) {
  const navigate = useNavigate();
  const update = useUpdateSpace();
  const [title, setTitle] = useState(space.title ?? "");

  useEffect(() => setTitle(space.title ?? ""), [space.id, space.title]);

  const save = () => {
    const next = title.trim();
    if (!next || next === space.title) {
      setTitle(space.title ?? "");
      return;
    }
    update.mutate(
      { id: space.id, title: next },
      {
        onSuccess: () =>
          navigate({ ...spaceParams({ title: next }, mode), replace: true }),
      },
    );
  };

  return (
    <input
      value={title}
      aria-label="Space name"
      onChange={(event) => setTitle(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className="hover:bg-accent focus-visible:ring-ring min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
    />
  );
}

/**
 * Which speaker the Mac plays through, and what calling apps can receive.
 *
 * Both voices follow the sound output of the Mac, so this moves the Mac and
 * not September alone. The microphone stays here even with one output.
 */
function AudioSelector({ overlayText }: { overlayText: string }) {
  const client = useQueryClient();
  const outputs = useQuery({ queryKey: ["outputs"], queryFn: listOutputs });
  const chosen = useQuery({ queryKey: ["output"], queryFn: currentOutput });
  const microphone = useQuery({
    queryKey: ["virtual-microphone"],
    queryFn: virtualMicrophoneStatus,
  });
  const camera = useQuery({
    queryKey: ["virtual-camera"],
    queryFn: virtualCameraStatus,
    refetchInterval: (query) => (query.state.data?.pending ? 750 : false),
  });

  const move = useMutation({
    mutationFn: chooseOutput,
    onSuccess: () => client.invalidateQueries({ queryKey: ["output"] }),
  });
  const changeMicrophone = useMutation({
    mutationFn: (enabled: boolean) =>
      enabled ? startVirtualMicrophone() : stopVirtualMicrophone(),
    onSuccess: (status) =>
      client.setQueryData(["virtual-microphone"], status),
  });
  const changeCamera = useMutation({
    mutationFn: (enabled: boolean) =>
      enabled ? startVirtualCamera() : stopVirtualCamera(),
    onSuccess: (status) => client.setQueryData(["virtual-camera"], status),
  });

  const devices = outputs.data ?? [];
  const selected = devices.find((device) => device.uid === chosen.data);
  const microphoneOn = microphone.data?.active ?? false;
  const cameraOn = camera.data?.active ?? false;
  const cameraEnabled = cameraOn || (camera.data?.pending ?? false);

  // Text shaping happens in the extension only after the words change. The
  // video path reuses the resulting image for every frame in between.
  useEffect(() => {
    if (!cameraOn) return;
    const timer = window.setTimeout(() => {
      void updateVirtualCameraOverlay(overlayText, true).catch(() => undefined);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [cameraOn, overlayText]);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) return;
        // A device plugged in while the app runs appears when the menu opens.
        void outputs.refetch();
        void chosen.refetch();
        void microphone.refetch();
        void camera.refetch();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="max-w-56 rounded-full px-4 font-medium"
        >
          <Headphones aria-hidden />
          <span className="truncate">{selected?.name ?? "Audio"}</span>
          {microphoneOn ? <Mic className="text-primary" aria-hidden /> : null}
          {cameraOn ? <Camera className="text-primary" aria-hidden /> : null}
          <span className="sr-only">
            September Microphone {microphoneOn ? "on" : "off"}; September
            Camera {cameraOn ? "on" : "off"}
          </span>
          <ChevronDown className="opacity-50" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          Sound output for this Mac
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={chosen.data ?? ""}
          onValueChange={(uid) => move.mutate(uid)}
        >
          {devices.map((device) => (
            <DropdownMenuRadioItem
              key={device.uid}
              value={device.uid}
              className="min-h-11"
            >
              {device.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          Use voice in calls
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={microphoneOn}
          disabled={!microphone.data || changeMicrophone.isPending}
          className="min-h-11"
          onSelect={(event) => event.preventDefault()}
          onCheckedChange={(checked) =>
            changeMicrophone.mutate(checked === true)
          }
        >
          <Mic aria-hidden />
          <span className="flex flex-col">
            <span>September Microphone</span>
            <span className="text-muted-foreground text-xs font-normal">
              Send spoken messages to FaceTime
            </span>
          </span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={cameraEnabled}
          disabled={!camera.data || changeCamera.isPending}
          className="min-h-11"
          onSelect={(event) => event.preventDefault()}
          onCheckedChange={(checked) => changeCamera.mutate(checked === true)}
        >
          <Camera aria-hidden />
          <span className="flex flex-col">
            <span>September Camera</span>
            <span className="text-muted-foreground text-xs font-normal">
              {camera.data?.pending
                ? "Waiting for macOS approval"
                : "Show this text over FaceTime video"}
            </span>
          </span>
        </DropdownMenuCheckboxItem>
        {changeMicrophone.error ? (
          <p className="text-destructive px-2 py-1.5 text-sm" role="alert">
            {String(changeMicrophone.error)}
          </p>
        ) : null}
        {changeCamera.error || camera.data?.detail ? (
          <p className="text-destructive px-2 py-1.5 text-sm" role="alert">
            {String(changeCamera.error ?? camera.data?.detail)}
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Bubble({ message }: { message: Message }) {
  const speaking = useSpeaking() === message.id;

  return (
    <div className="flex justify-end">
      <button
        type="button"
        aria-label={speaking ? "Stop" : "Speak this message again"}
        onClick={() =>
          speaking ? stopSpeaking() : void speak(message.text, message.id)
        }
        className="bg-accent text-accent-foreground focus-visible:ring-ring flex max-w-[85%] items-start gap-2 rounded-2xl rounded-br-sm px-4 py-2.5 text-left transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
      >
        {speaking ? (
          <Square className="mt-1 size-4 shrink-0 opacity-60" aria-hidden />
        ) : (
          <Volume2 className="mt-1 size-4 shrink-0 opacity-60" aria-hidden />
        )}
        <p className="text-base leading-snug">{message.text}</p>
      </button>
    </div>
  );
}

function PageButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="bg-card text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:outline-none"
    >
      {children}
    </button>
  );
}

/**
 * The bottom dock. It holds one tab for each space, and it makes a new one.
 *
 * ponytail: the row scrolls when the tabs no longer fit. The web app collapses
 * them into a menu — port that when a user keeps more spaces than fit.
 */
export function SpaceDock({
  current,
  spaces,
  mode,
  onMode,
}: {
  current: Space;
  spaces: Space[];
  mode: SpaceMode;
  onMode: (mode: SpaceMode) => void;
}) {
  const navigate = useNavigate();
  const createSpace = useCreateSpace();
  const row = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);

  // The row stays where it is and turns invisible, so it can still be
  // measured. It overflows its box exactly when the tabs no longer fit.
  useEffect(() => {
    const tabs = row.current;
    if (!tabs) return;

    const measure = () => setFull(tabs.scrollWidth > tabs.clientWidth + 1);
    measure();
    const watcher = new ResizeObserver(measure);
    watcher.observe(tabs);
    return () => watcher.disconnect();
  }, [spaces.length]);

  // A space tab keeps the mode the user is in, so Notes stays Notes.
  const open = (space: Space) => navigate(spaceParams(space, mode));

  const add = () =>
    createSpace
      .mutateAsync(newSpaceTitle(spaces.map((space) => space.title)))
      .then(open);

  const tabClass = (space: Space) =>
    `focus-visible:ring-ring min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none ${
      space.id === current.id
        ? "bg-primary text-primary-foreground border-transparent"
        : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
    }`;

  return (
    <div className="bg-muted/40 flex shrink-0 items-center gap-2 border-t px-4 py-2.5">
      <div className="relative min-w-0 flex-1">
        <div
          ref={row}
          role="group"
          aria-label="Switch space"
          aria-hidden={full}
          className={`flex items-center gap-1.5 overflow-hidden ${
            full ? "pointer-events-none opacity-0" : ""
          }`}
        >
          {spaces.map((space) => (
            <button
              key={space.id}
              type="button"
              tabIndex={full ? -1 : undefined}
              aria-current={space.id === current.id ? "page" : undefined}
              onClick={() => open(space)}
              className={tabClass(space)}
            >
              {space.title}
            </button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="New space"
            tabIndex={full ? -1 : undefined}
            disabled={createSpace.isPending}
            onClick={add}
          >
            <Plus aria-hidden />
          </Button>
        </div>

        {full ? (
          <div className="absolute inset-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Switch space"
                  className="bg-card hover:bg-accent focus-visible:ring-ring flex h-full min-h-11 w-full items-center justify-between gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="truncate">{current.title}</span>
                  <ChevronDown
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-48">
                <DropdownMenuRadioGroup
                  value={current.id}
                  onValueChange={(id) => {
                    const space = spaces.find((one) => one.id === id);
                    if (space) open(space);
                  }}
                >
                  {spaces.map((space) => (
                    <DropdownMenuRadioItem key={space.id} value={space.id}>
                      <span className="truncate">{space.title}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void add()}>
                  <Plus aria-hidden />
                  New space
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>

      {/* A wide gap, so a press meant for a mode cannot land on a space. */}
      <div className="ml-auto shrink-0 pl-5">
        <ModeGroup mode={mode} onMode={onMode} />
      </div>
    </div>
  );
}

const MODES = [
  { key: "talk", label: "Talk", icon: MessagesSquare },
  { key: "notes", label: "Notes", icon: FileText },
] as const;

/**
 * Talk or Notes, as a segmented switch.
 *
 * Only the open tab is in the tab order. The arrow keys move between the
 * tabs, which is what a screen reader user expects of a `tablist`.
 */
function ModeGroup({
  mode,
  onMode,
}: {
  mode: SpaceMode;
  onMode: (mode: SpaceMode) => void;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (event: React.KeyboardEvent, at: number) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;

    event.preventDefault();
    buttons.current[(at + step + MODES.length) % MODES.length]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Space mode"
      className="bg-card flex items-center gap-0.5 rounded-full border p-0.5"
    >
      {MODES.map(({ key, label, icon: Icon }, at) => (
        <button
          key={key}
          ref={(element) => {
            buttons.current[at] = element;
          }}
          type="button"
          role="tab"
          aria-selected={key === mode}
          tabIndex={key === mode ? 0 : -1}
          onClick={() => onMode(key)}
          onKeyDown={(event) => onKey(event, at)}
          className={`focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
            key === mode
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
