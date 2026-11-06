import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Bot, ChevronDown, Delete, Trash2, Undo2, Volume2 } from "lucide-react";

import { cn } from "@september/ui";
import { Button } from "@september/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@september/ui/components/dropdown-menu";

import { AudioOutput } from "@september/app-ui/blocks/audio-output";
import { useActiveEditor, usePanel, type EditorHandle } from "@september/app-ui/blocks/chrome";
import { Suggestions } from "@september/app-ui/blocks/suggestions";
import { draftParts, tagBefore } from "@september/core/rules/audio-tags";
import { MOODS, type MoodKey } from "@september/core/rules/moods";
import { composerAction, deleteLastWord, type ComposerMode } from "@september/core/rules/spaces";
import { insertAtEnd } from "@september/core/rules/stripes";
import { countsAsTypedKey } from "@september/core/rules/usage-summary";

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
  suggestions = true,
  mood = null,
  onMood,
  fieldRef,
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
  /** The words the suggestion engine reads. Agent setup gives it the words of every space. */
  history?: string[];
  /** Agent keeps its prompt private from speech-oriented suggestions. */
  suggestions?: boolean;
  /** The mood of the conversation. Talk shows the mood keys. */
  mood?: MoodKey | null;
  /** Changes the mood. Without it, the mood keys do not show. */
  onMood?: (mood: MoodKey | null) => void;
  /** The field, so a screen can move the focus to it. */
  fieldRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const ownField = useRef<HTMLTextAreaElement>(null);
  const field = fieldRef ?? ownField;
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
  }, [draft, field]);

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

  const editor = useActiveEditor();
  useEffect(() => {
    const current: EditorHandle = {
      draft,
      clear: () => draft && write(""),
      insert: (text: string) => write(insertAtEnd(draft, text)),
      speaks,
      onMood: speaks ? onMood : undefined,
    };
    editor.current = current;
    return () => {
      if (editor.current === current) editor.current = null;
    };
  });

  return (
    // The parts of the composer are items of the screen column. The stripes,
    // the field, and its keys keep their full height, so the history gives
    // way when the screen is short. The stripes never scroll up and down.
    <div className="contents">

      {suggestions ? (
        <div className="shrink-0 empty:hidden">
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
        </div>
      ) : null}

      {/* The ring is indigo. It is full strength while the composer has the
          focus, a change of 3.8:1 from the resting ring. */}
      <div className="bg-background ring-primary/30 focus-within:ring-primary rounded-surface shrink-0 p-3 shadow-sm ring-[3px] transition-[box-shadow]">
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
            className="placeholder:text-muted-foreground relative max-h-60 w-full resize-none overflow-y-auto bg-transparent text-xl leading-snug focus:outline-none"
          />
        </div>
        {note ? (
          <p role="status" className="text-muted-foreground mt-2 text-sm">{note}</p>
        ) : null}
        {/* The row folds in the compact tier, under 560 points: one mood
            menu key for the five. When the row wraps, the voice keys and
            Speak go together to the right, and Speak stays at the right end. */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {/* Each key shows its label, and its name starts with that label.
              The edit keys are one scan group, and the voice keys another. */}
          <div role="group" aria-label="Edit" data-scan-group className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Undo"
              onClick={undo}
              aria-disabled={undoStack.length === 0}
            >
              <Undo2 aria-hidden />
              Undo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Delete last word"
              onClick={() => draft && write(deleteLastWord(draft))}
              aria-disabled={!draft}
            >
              <Delete aria-hidden />
              Delete
            </Button>
            {/* In the compact panel, Clear lives in the More menu. */}
            {compact ? null : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Clear"
                onClick={() => draft && write("")}
                aria-disabled={!draft}
              >
                <Trash2 aria-hidden />
                Clear
              </Button>
            )}
          </div>
          <div
            role="group"
            aria-label="Voice"
            data-scan-group
            className="ml-auto flex flex-wrap items-center justify-end gap-2"
          >
            <div className="flex items-center gap-2">
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
              {speaks ? <AudioOutput /> : null}
            </div>
            {/* A gap and a line keep Speak apart from the keys before it, so
                a near miss does not speak. Speak is the largest key. */}
            <div className="flex items-center gap-2">
              <span aria-hidden className="bg-border mx-1 h-8 w-px shrink-0" />
              <Button
                type="button"
                size="lg"
                className="min-h-14 rounded-full px-7 text-base font-semibold"
                onClick={() => act(draft)}
                aria-disabled={!draft.trim() || pending}
              >
                <ActionIcon mode={mode} />
                {action.label}
              </Button>
            </div>
          </div>
        </div>
      </div>
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
            "focus-attention bg-muted text-foreground inline-flex min-h-12 items-center gap-1.5 rounded-control px-3 text-sm font-medium transition-colors",
            current && "ring-primary/60 bg-accent ring-2 ring-inset",
          )}
        >
          <span aria-hidden className="text-lg leading-none">
            {current?.emoji ?? "🙂"}
          </span>
          {current?.label ?? "Mood"}
          <ChevronDown className="size-4" aria-hidden />
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
            // The mood in use shows its name, so the choice is not an
            // emoji alone.
            className={cn(
              "focus-attention inline-flex min-h-12 min-w-12 items-center justify-center gap-1.5 rounded-full border border-transparent leading-none transition-colors",
              on
                ? "border-primary bg-primary/15 pr-3 pl-2 text-sm font-semibold"
                : "hover:bg-background hover:border-border",
            )}
          >
            <span aria-hidden className="text-2xl">{one.emoji}</span>
            {on ? one.label : null}
          </button>
        );
      })}
    </div>
  );
}

/** The mark on the action button. `composerAction` holds everything else. */
function ActionIcon({ mode }: { mode: ComposerMode }) {
  if (mode === "talk") return <Volume2 aria-hidden />;
  // Setting a space up is the agent reading the words, so it wears the mark
  // of the thing that answers.
  return <Bot aria-hidden />;
}
