import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Camera,
  ChevronDown,
  Delete,
  FileText,
  Headphones,
  Mic,
  MessagesSquare,
  Plus,
  Trash2,
  Undo2,
  Volume2,
} from "lucide-react";
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
import {
  useUpdateSpace,
  type Space,
} from "@/services/data";
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
} from "@/services/os";
import { Suggestions } from "@/blocks/suggestions";
import { countsAsTypedKey } from "@/rules/usage-summary";
import {
  deleteLastWord,
  rememberSpaceMode,
  spaceModeFrom,
  spaceSlug,
  type SpaceMode,
} from "@/rules/spaces";

export const talkParams = (space: Pick<Space, "title">) => ({
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

export function Problem({ error }: { error: Error }) {
  return (
    <p className="text-destructive rounded-xl border border-dashed p-8 text-center text-sm">
      {error.message}
    </p>
  );
}
export function Composer({
  mode,
  spaceId,
  context,
  draft,
  onDraft,
  onAction,
  onTypedKey,
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
  /** Counts direct keyboard work. Inserted suggestions do not call it. */
  onTypedKey?: () => void;
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
            if (countsAsTypedKey(event.key)) onTypedKey?.();
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

  // A space is not made until the user says what it is for.
  const add = () => navigate({ to: "/spaces/new" });

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
