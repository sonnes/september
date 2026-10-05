import {
  useCallback,
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
  Bot,
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
import { cn } from "@september/ui";
import { Button } from "@september/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@september/ui/components/dropdown-menu";
import {
  useCreateSpace,
  useSpaces,
  useUpdateSpace,
  type Space,
} from "@platform/services/data";
import { hasWritingService } from "@platform/services/ai";
import {
  chooseOutput,
  currentOutput,
  currentSetup,
  listOutputs,
  rememberModes,
  spaceModes,
  startVirtualMicrophone,
  stopVirtualMicrophone,
  virtualMicrophoneStatus,
} from "@platform/services/os";
import { Suggestions } from "@september/app-ui/blocks/suggestions";
import { useChrome, usePanel } from "@september/app-ui/blocks/chrome";
import { draftParts, tagBefore } from "@september/core/rules/audio-tags";
import { MOODS, type MoodKey } from "@september/core/rules/moods";
import { countsAsTypedKey } from "@september/core/rules/usage-summary";
import {
  composerAction,
  deleteLastWord,
  freeTitle,
  newSpaceMode,
  newSpaceTitle,
  rememberSpaceMode,
  spaceForSlug,
  spaceModeFrom,
  spaceSlug,
  type ComposerMode,
  type SeenSpace,
  type SpaceMode,
} from "@september/core/rules/spaces";

const talkParams = (space: Pick<Space, "title">) => ({
  to: "/spaces/$slug/talk" as const,
  params: { slug: spaceSlug(space.title) },
});

const notesParams = (space: Pick<Space, "title">) => ({
  to: "/spaces/$slug/notes" as const,
  params: { slug: spaceSlug(space.title) },
});

const agentParams = (space: Pick<Space, "title">) => ({
  to: "/spaces/$slug/agent" as const,
  params: { slug: spaceSlug(space.title) },
});

export const spaceParams = (space: Pick<Space, "title">, mode: SpaceMode) =>
  mode === "notes"
    ? notesParams(space)
    : mode === "agent"
      ? agentParams(space)
      : talkParams(space);

// The modes as they stand. The setting holds the same answers, and the two
// only differ while a write is in flight.
let modes = spaceModes;

/** Whether AI Assistance shows the agent. It is on unless the user turned it off. */
export const agentEnabled = (): boolean => currentSetup()?.agentEnabled !== false;

/** The mode a space was left in, for a screen that opens one. */
export const openParams = (space: Pick<Space, "title">) =>
  spaceParams(
    space,
    spaceModeFrom(modes, spaceSlug(space.title), agentEnabled()),
  );

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

export interface NewSpace {
  /** Makes a space and opens it. Gives false when the space could not be made. */
  create: () => Promise<boolean>;
  pending: boolean;
  error: Error | null;
}

/**
 * Makes a space and opens it.
 *
 * The space exists from the press. Nothing is asked first: a user who cannot
 * type quickly should not have to write a paragraph before September will give
 * them somewhere to write it, and the space is where that question is asked
 * now. With AI Assistance connected the agent asks it, and with none the space
 * opens in Talk, where the user can speak straight away.
 */
export function useNewSpace(): NewSpace {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { data: spaces } = useSpaces();
  const createSpace = useCreateSpace();
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(() => {
    setError(null);
    return createSpace
      .mutateAsync(newSpaceTitle((spaces ?? []).map((one) => one.title)))
      .then((space) => {
        // The screen this opens finds its space by slug, in this list. The
        // write that made the space asks for the list again but does not wait
        // for it, so arriving first would land on a space the destination
        // cannot see yet, and it would send the user straight back here. The
        // space is put in front of them instead; the read that follows sorts
        // the list out.
        client.setQueryData<Space[]>(["spaces"], (held) =>
          held?.some((one) => one.id === space.id)
            ? held
            : [space, ...(held ?? [])],
        );
        return navigate(
          spaceParams(space, newSpaceMode(hasWritingService(), agentEnabled())),
        );
      })
      .then(
        () => true,
        (reason: unknown) => {
          setError(reason instanceof Error ? reason : new Error(String(reason)));
          return false;
        },
      );
  }, [client, createSpace, navigate, spaces]);

  return { create, pending: createSpace.isPending, error };
}

export interface SpaceBySlug {
  /** The space the address names, or nothing while it is being found. */
  space: Space | undefined;
  spaces: Space[];
  isPending: boolean;
}

/**
 * The space a screen shows, by the name in its address.
 *
 * A title is an address, so a rename moves the space out from under the screen
 * showing it. The agent renames a new space on its first turn, while the user
 * is watching it happen, so the screen follows the space it was already
 * showing and writes the new address instead of leaving for the list.
 *
 * A slug that names no space and no space that was ever here is a stale link,
 * and that does go back to the list.
 */
export function useSpaceBySlug(slug: string, mode: SpaceMode): SpaceBySlug {
  const navigate = useNavigate();
  const { data: spaces, isPending, isFetching } = useSpaces();
  // The space this screen has been showing, and where it was showing it. A
  // rename is followed by the id, which is the one thing about a space that
  // never moves, and only while the address itself stands still.
  const seen = useRef<SeenSpace | null>(null);
  const found = spaceForSlug(slug, spaces ?? [], seen.current);

  useEffect(() => {
    if (found && !found.renamed) seen.current = { id: found.space.id, slug };
  });

  const renamedTo = found?.renamed ? found.space.title : null;
  // A list still being read says nothing about whether a space is there, and
  // a space that has just been made is exactly the one the held list is
  // oldest about.
  const gone = !isPending && !isFetching && !found;

  useEffect(() => {
    if (gone) navigate({ to: "/spaces", replace: true });
  }, [gone, navigate]);

  useEffect(() => {
    if (renamedTo === null) return;
    navigate({ ...spaceParams({ title: renamedTo }, mode), replace: true });
  }, [renamedTo, mode, navigate]);

  return { space: found?.space, spaces: spaces ?? [], isPending };
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
  suggestions = true,
  mood = null,
  onMood,
  cover,
}: {
  mode: ComposerMode;
  /** The space the stripe reads. */
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
  /** Agent keeps its prompt private from speech-oriented suggestions. */
  suggestions?: boolean;
  /** The mood of the conversation. Talk shows the mood keys. */
  mood?: MoodKey | null;
  /** Changes the mood. Without it, the mood keys do not show. */
  onMood?: (mood: MoodKey | null) => void;
  /** Takes the place of the field, for example while a sentence plays. */
  cover?: ReactNode;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  // The caret goes here after the draft that removed a tag is on the screen.
  const caret = useRef<number | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const action = composerAction(mode);
  const speaks = action.speaks;
  const panel = usePanel();
  // The panel decides the compact tier by its own width, so the composer and
  // the More menu of the panel always agree. The web app has no panel, and a
  // container query on the screen body decides there.
  const compact = panel ? panel.tier === "compact" : null;

  // The field grows with its text, up to the height the class holds.
  useEffect(() => {
    const box = field.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${box.scrollHeight}px`;
    if (caret.current !== null) {
      box.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
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
    if (!words || pending) return;
    onAction(words);
    setUndoStack([]);
    field.current?.focus();
  };

  // The panel header reaches the draft through this: Clear in the More menu,
  // a phrase from the Phrases sheet, Escape, and the mood keys.
  const composer = panel?.composer;
  useEffect(() => {
    if (!composer) return;
    const handle = {
      draft,
      clear: () => draft && write(""),
      insert: (text: string) =>
        write(!draft || /\s$/.test(draft) ? draft + text : `${draft} ${text}`),
      speaks,
      onMood: speaks ? onMood : undefined,
    };
    composer.current = handle;
    return () => {
      if (composer.current === handle) composer.current = null;
    };
  });

  return (
    <div className="flex shrink-0 flex-col gap-2.5">
      {before}

      {suggestions ? (
        <Suggestions
          spaceId={spaceId}
          context={context}
          text={draft}
          history={history}
          mood={mood}
          onTake={write}
          onSpeak={act}
          onPin={onPin}
        />
      ) : null}

      {cover ?? (
      <div className="bg-background ring-primary/45 focus-within:ring-primary/70 rounded-surface p-3 shadow-sm ring-[3px] transition-[box-shadow]">
        {/* The layer behind the field draws a chip under each audio tag. It
            has the same type and wrap as the field, and its text is clear, so
            only the chips show. The field on top keeps the caret, the
            selection, and what a screen reader hears. */}
        <div className="relative">
          <div
            ref={layer}
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden text-xl leading-snug break-words whitespace-pre-wrap text-transparent"
          >
            {draftParts(draft).map((part, index) =>
              part.tag ? (
                <span
                  key={index}
                  data-tag
                  className="bg-primary/15 ring-primary/20 rounded-md ring-2 [box-decoration-break:clone]"
                >
                  {part.text}
                </span>
              ) : (
                <span key={index}>{part.text}</span>
              ),
            )}
          </div>
          <textarea
            ref={field}
            autoFocus
            rows={1}
            value={draft}
            aria-label={action.field}
            placeholder={action.placeholder}
            onChange={(event) => onDraft(event.target.value)}
            onScroll={(event) => {
              if (layer.current) layer.current.scrollTop = event.currentTarget.scrollTop;
            }}
            onKeyDown={(event) => {
              if (countsAsTypedKey(event.key)) onTypedKey?.();
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                act(draft);
              }
              // A half tag is neither a word nor a direction, so Backspace
              // after a tag removes all of it.
              const box = event.currentTarget;
              if (event.key === "Backspace" && box.selectionStart === box.selectionEnd) {
                const tag = tagBefore(draft, box.selectionStart);
                if (tag) {
                  event.preventDefault();
                  caret.current = tag.start;
                  write(draft.slice(0, tag.start) + draft.slice(tag.end));
                }
              }
            }}
            className="placeholder:text-muted-foreground/60 relative max-h-60 w-full resize-none overflow-y-auto bg-transparent text-xl leading-snug focus:outline-none"
          />
        </div>
        {note ? (
          <p role="status" className="text-muted-foreground mt-2 text-sm">{note}</p>
        ) : null}
        {/* The row folds in the compact tier, under 560 points: one mood
            menu key for the five. */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Undo"
              onClick={undo}
              aria-disabled={undoStack.length === 0}
              className="size-11 aria-disabled:opacity-50"
            >
              <Undo2 aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Delete last word"
              onClick={() => draft && write(deleteLastWord(draft))}
              aria-disabled={!draft}
              className="size-11 aria-disabled:opacity-50"
            >
              <Delete aria-hidden />
            </Button>
            {/* In the compact panel, Clear lives in the More menu. */}
            {compact ? null : (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Clear"
                onClick={() => draft && write("")}
                aria-disabled={!draft}
                className="size-11 aria-disabled:opacity-50"
              >
                <Trash2 aria-hidden />
              </Button>
            )}
          </div>
          <div
            className={cn(
              "flex items-center gap-2",
              compact === null ? "@max-[35rem]:contents" : compact && "contents",
            )}
          >
            {speaks && onMood ? (
              compact === null ? (
                <>
                  <div className="@max-[35rem]:hidden">
                    <MoodKeys mood={mood} onMood={onMood} />
                  </div>
                  <div className="@min-[35rem]:hidden">
                    <MoodMenu mood={mood} onMood={onMood} keys={false} />
                  </div>
                </>
              ) : compact ? (
                <MoodMenu mood={mood} onMood={onMood} keys />
              ) : (
                <MoodKeys mood={mood} onMood={onMood} />
              )
            ) : null}
            {/* The sound output belongs beside the button that makes a sound.
                Notes makes none. */}
            {speaks ? <AudioSelector /> : null}
            <Button
              type="button"
              size="lg"
              className="h-11 rounded-full px-6 font-semibold aria-disabled:opacity-50"
              onClick={() => act(draft)}
              aria-disabled={!draft.trim() || pending}
            >
              <ActionIcon mode={mode} />
              {action.label}
            </Button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

/**
 * One key for the five moods, for a narrow screen. It shows the mood in use
 * and opens a menu of the moods and No mood. A second choice of the mood in
 * use clears it, the same as the mood keys.
 */
function MoodMenu({
  mood,
  onMood,
  keys,
}: {
  mood: MoodKey | null;
  onMood: (mood: MoodKey | null) => void;
  /** Shows Control and a digit beside each mood. Only the panel binds them. */
  keys: boolean;
}) {
  const current = MOODS.find((one) => one.key === mood);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Mood menu: ${current?.label ?? "no mood"}`}
          className={cn(
            "focus-visible:ring-ring bg-muted text-foreground inline-flex h-11 items-center gap-1.5 rounded-control px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
            current && "ring-primary/60 bg-accent ring-2 ring-inset",
          )}
        >
          <span aria-hidden className="text-lg leading-none">
            {current?.emoji ?? "🙂"}
          </span>
          {current?.label ?? "Mood"}
          <ChevronDown className="size-4 opacity-60" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56 rounded-surface p-1.5">
        <DropdownMenuRadioGroup value={mood ?? ""}>
          {MOODS.map((one, at) => (
            <DropdownMenuRadioItem
              key={one.key}
              value={one.key}
              className="min-h-13 text-base"
              onSelect={() => onMood(one.key === mood ? null : one.key)}
            >
              <span aria-hidden className="text-xl leading-none">
                {one.emoji}
              </span>
              <span className="flex-1">{one.label}</span>
              {keys ? (
                <DropdownMenuShortcut>⌃{at + 1}</DropdownMenuShortcut>
              ) : null}
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuRadioItem
            value=""
            className="min-h-13 text-base"
            onSelect={() => onMood(null)}
          >
            <span className="text-muted-foreground flex-1">No mood</span>
            {keys ? <DropdownMenuShortcut>⌃0</DropdownMenuShortcut> : null}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The five mood keys. One press chooses a mood, and a second press on the
 * same key clears it. The mood changes the tone of the suggestions.
 */
function MoodKeys({
  mood,
  onMood,
}: {
  mood: MoodKey | null;
  onMood: (mood: MoodKey | null) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Mood"
      className="bg-muted/60 flex items-center gap-0.5 rounded-full border p-0.5"
    >
      {MOODS.map((one) => {
        const on = one.key === mood;
        return (
          <button
            key={one.key}
            type="button"
            aria-label={`Mood: ${one.label}`}
            aria-pressed={on}
            title={one.label}
            onClick={() => onMood(on ? null : one.key)}
            className={cn(
              "focus-visible:ring-ring grid size-11 place-items-center rounded-full border border-transparent text-2xl leading-none transition-colors focus-visible:ring-2 focus-visible:outline-none",
              on
                ? "border-primary bg-primary/15"
                : "hover:bg-background hover:border-border",
            )}
          >
            <span aria-hidden>{one.emoji}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The mark on the action button. `composerAction` holds everything else. */
function ActionIcon({ mode }: { mode: ComposerMode }) {
  if (mode === "talk") return <Volume2 aria-hidden />;
  if (mode === "notes") return <FileText aria-hidden />;
  // Setting a space up is the agent reading the words, so it wears the mark
  // of the thing that answers.
  return <Bot aria-hidden />;
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
  const { data: spaces } = useSpaces();
  const [title, setTitle] = useState(space.title ?? "");
  // Why the last name was refused, or nothing. It clears as the user types.
  const [taken, setTaken] = useState("");

  useEffect(() => {
    setTitle(space.title ?? "");
    setTaken("");
  }, [space.id, space.title]);

  const save = () => {
    const next = title.trim();
    if (!next || next === space.title) {
      setTitle(space.title ?? "");
      setTaken("");
      return;
    }

    // One slug names one space. A name that another space holds would send
    // this address to that space, so nothing is written and the words of the
    // user stay in the field for them to change.
    const others = (spaces ?? [])
      .filter((one) => one.id !== space.id)
      .map((one) => one.title);

    if (!freeTitle(next, others)) {
      setTaken(`Another space is already called ${next}.`);
      return;
    }

    setTaken("");
    update.mutate(
      { id: space.id, title: next },
      {
        onSuccess: () =>
          navigate({ ...spaceParams({ title: next }, mode), replace: true }),
      },
    );
  };

  return (
    <span className="flex min-w-0 flex-1 flex-col justify-center">
      <input
        value={title}
        aria-label="Space name"
        aria-invalid={Boolean(taken)}
        onChange={(event) => {
          setTitle(event.target.value);
          setTaken("");
        }}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className="hover:bg-accent focus-visible:ring-ring min-w-0 rounded-md bg-transparent px-2 py-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
      />
      {taken ? (
        <span role="alert" className="text-destructive px-2 text-xs">
          {taken}
        </span>
      ) : null}
    </span>
  );
}
/**
 * Which speaker September plays through, and whether calls hear September.
 *
 * Both voices follow September's sound output. The microphone belongs beside
 * Speak because it carries what Speak makes.
 */
function AudioSelector() {
  const panel = usePanel();
  const client = useQueryClient();
  const outputs = useQuery({ queryKey: ["outputs"], queryFn: listOutputs });
  const chosen = useQuery({ queryKey: ["output"], queryFn: currentOutput });
  const microphone = useQuery({
    queryKey: ["virtual-microphone"],
    queryFn: virtualMicrophoneStatus,
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

  const devices = outputs.data ?? [];
  const selected = devices.find((device) => device.uid === chosen.data);
  const microphoneOn = microphone.data?.active ?? false;
  const microphoneAvailable = Boolean(
    microphone.data && microphone.data.uid !== "unavailable-in-browser",
  );

  return (
    <DropdownMenu
      // The More menu of the panel opens this menu too.
      open={panel?.outputOpen}
      onOpenChange={(open) => {
        panel?.setOutputOpen(open);
        if (!open) return;
        // A device plugged in while the app runs appears when the menu opens.
        void outputs.refetch();
        void chosen.refetch();
        void microphone.refetch();
      }}
    >
      <DropdownMenuTrigger asChild>
        {/* One key, so the tools row keeps its room. The name of the
            output is in the menu, and in the name that a screen reader says.
            A green dot shows that calls hear September. */}
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={`Sound output: ${selected?.name ?? "not chosen"}. September Microphone ${microphoneOn ? "on" : "off"}`}
          title={selected?.name ?? "Sound output"}
          className="relative size-11"
        >
          <Headphones aria-hidden />
          {microphoneOn ? (
            <span
              aria-hidden
              className="ring-background absolute top-2 right-2 size-2.5 rounded-full bg-emerald-500 ring-2"
            />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          September audio
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
          disabled={!microphoneAvailable || changeMicrophone.isPending}
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
              {microphoneAvailable
                ? (microphone.data?.detail ??
                  "Send spoken messages to calling apps")
                : "Unavailable on this device"}
            </span>
          </span>
        </DropdownMenuCheckboxItem>
        {changeMicrophone.error ? (
          <p className="text-destructive px-2 py-1.5 text-sm" role="alert">
            {String(changeMicrophone.error)}
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
export function SpaceDock(props: DockProps) {
  // The panel header holds the space button and the mode switch instead.
  return useChrome() === "panel" ? null : <Dock {...props} />;
}

interface DockProps {
  current: Space;
  spaces: Space[];
  mode: SpaceMode;
  onMode: (mode: SpaceMode) => void;
}

function Dock({ current, spaces, mode, onMode }: DockProps) {
  const navigate = useNavigate();
  const newSpace = useNewSpace();
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

  const add = newSpace.create;

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
  { key: "agent", label: "Agent", icon: Bot },
] as const;

/**
 * Talk, Notes, or Agent, as a segmented switch.
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
  // A user who turned the agent off in AI Assistance does not see it here.
  const shown = MODES.filter(({ key }) => key !== "agent" || agentEnabled());

  const onKey = (event: React.KeyboardEvent, at: number) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;

    event.preventDefault();
    buttons.current[(at + step + shown.length) % shown.length]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Space mode"
      className="bg-card flex items-center gap-0.5 rounded-full border p-0.5"
    >
      {shown.map(({ key, label, icon: Icon }, at) => (
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
