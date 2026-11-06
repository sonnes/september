import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ChevronsRight,
  CornerDownLeft,
  Ellipsis,
  History,
  Pin,
  Sparkles,
} from "lucide-react";

import { cn } from "@september/ui";

import { useSetup } from "@september/app-ui/services/settings";
import { useMessages, usePhrases } from "@september/app-ui/services/data";
import { isKept, topPhrases } from "@september/core/rules/phrases/rows";
import { SAVED_LIMIT, stripeRows, type Stripe } from "@september/core/rules/stripe-rows";
import {
  isTag,
  tagLabel,
  tagsSpoken,
  wordRow,
} from "@september/core/rules/audio-tags";
import { exampleTags, type MoodKey } from "@september/core/rules/moods";
import { useSpeechSettings } from "@september/app-ui/services/speech";
import { TagMark } from "@september/app-ui/blocks/tagged-text";
import { useReach } from "@september/app-ui/blocks/access";
import { applySuggestion } from "@september/core/autocomplete";
import { useCompletions, useSuggestions } from "@september/app-ui/services/suggest";
import {
  boardWords,
  joinTokens,
  takeTokens,
  TILE,
  tileScale,
  type SuggestionSource,
} from "@september/core/rules/stripes";

const PUNCTUATION = /^[.,!?;:]+$/;

/** An audio tag in a row: a direction to the voice, not a word. */
const TAG_TILE =
  "border-primary/30 bg-primary/10 text-brand hover:border-primary/60 gap-1.5";

/**
 * One colour lane for each source, ported from the web app.
 *
 * The lane is never the only sign of where a row came from. The mark in the
 * gutter says the same thing, for a user who does not read colour.
 */
const LANE: Record<SuggestionSource, { idle: string; active: string }> = {
  // From the phrases of the space.
  md: {
    idle: "border-primary/40 bg-card text-foreground hover:border-primary/70 hover:bg-primary/5",
    active: "border-primary bg-primary/10 text-brand",
  },
  // Words the user said before.
  history: {
    idle: "border-chart-2/45 bg-card text-foreground hover:border-chart-2/70 hover:bg-chart-2/5",
    active: "border-chart-2 bg-chart-2/10 text-chart-2",
  },
  // From a model. The quiet baseline, with a gray sparkle mark.
  llm: {
    idle: "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5",
    active: "border-primary bg-primary/10 text-brand",
  },
  // A phrase that a typed code brought up. The strongest tint.
  code: {
    idle: "border-primary/70 bg-primary/10 text-foreground hover:border-primary hover:bg-primary/15",
    active: "border-primary bg-primary/20 text-brand",
  },
  // An opening, not a whole thought. A broken line says so.
  starter: {
    idle: "border-dashed border-primary/50 bg-primary/5 text-foreground hover:border-primary/80 hover:bg-primary/10",
    active: "border-dashed border-primary bg-primary/10 text-brand",
  },
};

/** What a screen reader says a row came from. */
function sourceName(stripe: Stripe): string {
  if (stripe.source === "code") return `code ${stripe.code}`;
  return {
    md: "kept phrase",
    history: "said before",
    llm: "from AI Assistance",
    starter: "an opening",
  }[stripe.source];
}

type Hover = { stripe: number; index: number } | null;

/**
 * The rows of ready words above the composer.
 *
 * A press on a tile takes the sentence up to that word. This is the reason
 * the app exists: fewer keystrokes to full expression.
 */
export function Suggestions({
  spaceId,
  context,
  text,
  history: given,
  mood = null,
  document,
  finishLabel = "Speak",
  onTake,
  onSpeak,
  onPin,
}: {
  spaceId: string;
  context: string;
  text: string;
  /** The full note around the caret. Notes gives it, so the model reads the note. */
  document?: { before: string; after: string };
  /** The verb of the key that ends a row. Notes adds the row instead of speaking it. */
  finishLabel?: string;
  /** The mood of the conversation, from the keys of the composer. */
  mood?: MoodKey | null;
  /** The words the engine reads. Notes gives it the other lines of the note. */
  history?: string[];
  onTake: (next: string) => void;
  onSpeak: (sentence: string) => void;
  onPin: (phrase: string) => void;
}) {
  const setup = useSetup();
  const { data: spacePhrases } = usePhrases(spaceId);
  // A code works in every space, so the lookup reads them all.
  const { data: allPhrases } = usePhrases();
  const { data: messages } = useMessages(spaceId);
  const [hover, setHover] = useState<Hover>(null);
  const [selection, setSelection] = useState<{ stripe: Stripe; spaceId: string } | null>(null);
  const selected = (selection?.stripe.source !== "llm" || setup?.autoSuggestions !== false) &&
    selection?.spaceId === spaceId && text.trim() &&
    selection.stripe.text.toLowerCase().startsWith(text.trim().toLowerCase())
    ? selection.stripe : null;

  useEffect(() => {
    if (selection && !selected) setSelection(null);
  }, [selection, selected]);

  const take = (stripe: Stripe, next: string) => {
    setSelection({ stripe, spaceId });
    setHover(null);
    onTake(next);
  };

  const history = useMemo(
    () =>
      given ??
      (messages ?? [])
        .filter((message) => message.type === "user")
        .map((message) => message.text),
    [given, messages],
  );

  // The word engine answers from the words of the user, with no service and
  // no wait.
  // A space that does not exist yet names no lane of the engine.
  const found = useSuggestions(spaceId || undefined, text);
  const tagsOn = tagsSpoken(useSpeechSettings());
  const words = useMemo(
    () => wordRow(found, { tags: tagsOn, examples: exampleTags(mood), draft: text }),
    [found, tagsOn, mood, text],
  );
  const { rows: fromModel, writing, problem } = useCompletions({
    text,
    context,
    history,
    spaceId,
    setup,
    mood,
    document,
  });
  // The access profile sets how many stripes show, how many words a slice
  // holds, and the size of a word, a tile, and a gap.
  const reach = useReach();
  const stripes = useMemo(
    () =>
      stripeRows({
        text,
        spaceId,
        spacePhrases: spacePhrases ?? [],
        allPhrases: allPhrases ?? [],
        history,
        fromModel,
        selected,
        sliceWords: reach.slice,
      }).slice(0, reach.stripes),
    [text, spaceId, spacePhrases, allPhrases, history, fromModel, selected, reach.slice, reach.stripes],
  );

  const chips = useMemo(() => {
    const board = boardWords(topPhrases(spacePhrases ?? [], SAVED_LIMIT));
    const lower = text.trim().toLowerCase();
    return board.filter(
      (word) => !lower || word.toLowerCase().startsWith(lower),
    );
  }, [spacePhrases, text]);

  const { ref, width } = useWidth();
  const word = Math.max(TILE.fontPx, reach.wordPx);
  const tall = Math.max(TILE.minHeightPx, reach.targetPx);
  // The rows fit the width at the word size of the profile, so the fit reads
  // the width as if the words were at the base size.
  const grow = word / TILE.fontPx;
  const scale = useMemo(
    () =>
      tileScale(
        stripes.map((stripe) => {
          const shown = stripe.tokens.slice(stripe.hidden);
          return { chars: shown.join("").length, tokens: shown.length };
        }),
        width / grow,
      ),
    [stripes, width, grow],
  );
  const size = (base: number) => base * scale * grow;
  const gap = Math.max(size(TILE.gapPx), reach.gapPx);

  if (stripes.length === 0 && chips.length === 0 && words.length === 0 && !writing && !problem) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2.5" ref={ref}>
      {chips.length > 0 ? (
        <div role="group" aria-label="Phrases" data-scan-group className="flex flex-wrap gap-2">
          {chips.map((word) => {
            const kept = isKept(word, spacePhrases ?? []);
            return (
            <button
              key={word}
              type="button"
              // The phrase, then where it came from, as the pin shows it.
              aria-label={`${word}. ${kept ? "Kept phrase" : "Suggested phrase"}.`}
              onClick={() =>
                onTake(
                  joinTokens([
                    ...text.trim().split(/\s+/).filter(Boolean),
                    word,
                  ]),
                )
              }
              className="focus-attention border-primary/30 bg-card text-foreground hover:border-primary/60 hover:bg-primary/5 flex min-h-12 items-center gap-1.5 rounded-full border px-5 text-base font-medium transition-colors"
            >
              <Pin
                className={cn("text-brand size-3.5", kept && "fill-current")}
                aria-hidden
              />
              {word}
            </button>
            );
          })}
        </div>
      ) : null}

      {stripes.length > 0 || writing || problem ? (
      <section aria-label="Suggestions" className="flex flex-col gap-1">
      <div className="flex min-h-5 items-center gap-2 px-1.5">
        <h2 className="text-muted-foreground text-xs font-semibold">
          Suggestions
        </h2>
        {/* The model answers in a second or two. The rows that need no
            model are already here, and its rows join them. */}
        {writing ? (
          <span
            role="status"
            aria-label="AI Assistance is writing"
            className="text-brand inline-flex items-center gap-1 text-xs font-medium"
          >
            <Sparkles className="size-3.5 animate-pulse" aria-hidden />
            Writing
          </span>
        ) : problem ? (
          <span role="status" className="text-destructive text-xs font-medium">
            {problem}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        {stripes.map((stripe, row) => {
          const lane = LANE[stripe.source];
          return (
            <div
              key={stripe.text}
              data-source={stripe.source}
              role="group"
              data-scan-group
              aria-label={`Stripe ${row + 1} of ${stripes.length}, ${sourceName(stripe)}. ${stripe.text}`}
              className="flex flex-nowrap items-center"
              style={{ gap }}
              onMouseLeave={() => setHover(null)}
            >
              {/* One gutter for every mark, so the rows line up. The pin key
                  fills it, so the key is a full target. */}
              <span
                className="grid shrink-0 place-items-center"
                style={{ width: TILE.markPx, height: tall }}
              >
                <SourceMark
                  source={stripe.source}
                  code={stripe.code}
                  kept={Boolean(stripe.kept)}
                  onPin={() => onPin(stripe.text)}
                />
              </span>

              <StripeWords gap={gap}>
              {/* The words already typed are not shown again, so a tile always
                  adds something. A hover marks the tiles a press would take,
                  and the tile under the pointer is amber, the attention color. */}
              {stripe.tokens.map((token, index) => {
                if (index < stripe.hidden) return null;
                const active =
                  hover !== null &&
                  hover.stripe === row &&
                  index <= hover.index;
                const pointed = active && hover.index === index;
                const punctuation = PUNCTUATION.test(token);
                const tag = isTag(token);
                // The typed words inside the row, so the user sees why it is here.
                const found =
                  stripe.found !== undefined &&
                  index >= stripe.found[0] &&
                  index < stripe.found[1];

                return (
                  <button
                    key={index}
                    type="button"
                    onMouseEnter={() => setHover({ stripe: row, index })}
                    onFocus={() => setHover({ stripe: row, index })}
                    onBlur={() => setHover(null)}
                    onClick={() =>
                      take(stripe, joinTokens(takeTokens(stripe, index + 1)))
                    }
                    aria-label={
                      tag
                        ? `${tagLabel(token)}, audio tag`
                        : `${token}. Takes: ${joinTokens(takeTokens(stripe, index + 1)).trim()}`
                    }
                    // A word keeps its size and the tile its height. Only the
                    // padding shrinks to fit a row, and a longer row scrolls.
                    style={{
                      fontSize: word,
                      paddingInline: size(
                        punctuation ? TILE.punctPadXPx : TILE.wordPadXPx,
                      ),
                      minHeight: tall,
                    }}
                    className={cn(
                      "focus-attention rounded-chip inline-flex shrink-0 items-center border transition-colors",
                      punctuation ? "" : "font-medium",
                      found && "decoration-primary underline decoration-2 underline-offset-4",
                      pointed
                        ? "border-attention-foreground bg-attention text-attention-foreground"
                        : tag
                          ? cn(TAG_TILE, active && "border-primary bg-primary/20")
                          : active
                            ? lane.active
                            : lane.idle,
                    )}
                  >
                    {tag ? <TagMark label={tagLabel(token)} /> : token}
                  </button>
                );
              })}
              </StripeWords>

              <EndKey
                stripe={stripe}
                scale={scale}
                tall={tall}
                label={finishLabel}
                onTake={(next) => take(stripe, next)}
                onSpeak={onSpeak}
              />
            </div>
          );
        })}
      </div>
      </section>
      ) : null}

      {/* The word row sits nearest the composer, because it changes with each
          letter. `applySuggestion` knows a part-written word from a finished
          one, so the screen never splits the text itself. */}
      {words.length > 0 ? (
        <WordRow
          words={words}
          onWord={(word) => onTake(applySuggestion(text, word))}
        />
      ) : null}
    </div>
  );
}

/**
 * The words of one row, on one line. A row longer than the shrink allows
 * scrolls, so no tile is out of reach, and its end fades to show that more
 * words follow. The end key stays outside, so the whole row can always be
 * spoken.
 */
function StripeWords({ gap, children }: { gap: number; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  useLayoutEffect(() => {
    const words = box.current;
    if (!words) return;
    const measure = () =>
      setMore(words.scrollLeft + words.clientWidth < words.scrollWidth - 1);
    measure();
    words.addEventListener("scroll", measure);
    return () => words.removeEventListener("scroll", measure);
  });

  return (
    <div
      ref={box}
      // The ring of a focused tile needs room, so the box pads by 7 points.
      className={cn(
        "-my-[7px] flex min-w-0 flex-nowrap items-center overflow-x-auto px-[7px] py-[7px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        more &&
          "[mask-image:linear-gradient(90deg,#000_calc(100%-3rem),transparent)]",
      )}
      style={{ gap }}
    >
      {children}
    </div>
  );
}

/**
 * The words that finish the word being typed. The row shows two lines at
 * most, so it never pushes the field down. A word that the row clips leaves
 * the tab order, so the focus never lands on a word the user cannot see.
 */
function WordRow({
  words,
  onWord,
}: {
  words: string[];
  onWord: (word: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [clipped, setClipped] = useState<string[]>([]);

  useLayoutEffect(() => {
    const row = box.current;
    if (!row) return;
    const measure = () => {
      const bottom = row.getBoundingClientRect().bottom;
      const next = [...row.querySelectorAll<HTMLElement>("[data-word]")]
        .filter((key) => key.getBoundingClientRect().bottom > bottom + 1)
        .map((key) => key.dataset.word ?? "");
      setClipped((last) => (last.join("\n") === next.join("\n") ? last : next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const watcher = new ResizeObserver(measure);
    watcher.observe(row);
    return () => watcher.disconnect();
  }, [words]);

  return (
    <div
      ref={box}
      data-word-row
      role="group"
      aria-label="Words"
      data-scan-group
      className="flex max-h-[calc(6.375rem+6px)] flex-wrap gap-1.5 overflow-hidden p-[3px]"
    >
      {words.map((word) => (
        <button
          key={word}
          type="button"
          data-word={word}
          inert={clipped.includes(word) || undefined}
          onClick={() => onWord(word)}
          aria-label={isTag(word) ? `${tagLabel(word)}, audio tag` : undefined}
          className={cn(
            "focus-attention inline-flex min-h-12 items-center rounded-lg border px-4 text-lg font-medium transition-colors",
            isTag(word)
              ? TAG_TILE
              : "border-chart-1/50 bg-card text-foreground hover:border-chart-1/70 hover:bg-chart-1/5",
          )}
        >
          {isTag(word) ? <TagMark label={tagLabel(word)} /> : word}
        </button>
      ))}
    </div>
  );
}

/**
 * The width the rows have to fill, so the tiles can be fitted to it.
 *
 * A callback holds the box, not an effect: the rows are not on the screen at
 * the first render, so an effect would run before the box exists and would
 * never measure it.
 */
function useWidth() {
  const [width, setWidth] = useState(0);
  const watcher = useRef<ResizeObserver | null>(null);

  const ref = useCallback((box: HTMLDivElement | null) => {
    watcher.current?.disconnect();
    watcher.current = null;
    if (!box) return;

    setWidth(box.clientWidth);
    watcher.current = new ResizeObserver(() => setWidth(box.clientWidth));
    watcher.current.observe(box);
  }, []);

  return { ref, width };
}

/**
 * The key at the end of a row.
 *
 * An unfinished slice or starter inserts its visible words into the composer.
 * A final slice speaks the complete suggestion.
 */
function EndKey({
  stripe,
  scale,
  tall,
  label: finish,
  onTake,
  onSpeak,
}: {
  stripe: Stripe;
  scale: number;
  /** The height of a tile, from the access profile. */
  tall: number;
  label: string;
  onTake: (next: string) => void;
  onSpeak: (sentence: string) => void;
}) {
  const box = {
    minHeight: tall,
    minWidth: tall,
    paddingInline: TILE.wordPadXPx * scale,
  };
  const glyph = { width: TILE.fontPx, height: TILE.fontPx };
  // The name says what a press does with which words.
  const words = joinTokens(takeTokens(stripe, stripe.tokens.length)).trim();

  if (stripe.hasMore || stripe.source === "starter") {
    const verb = stripe.hasMore ? "Insert" : "Start with";
    return (
      <button
        type="button"
        aria-label={`${verb}: ${words}`}
        title={verb}
        onClick={() => onTake(joinTokens(takeTokens(stripe, stripe.tokens.length)))}
        style={box}
        className="focus-attention border-primary/50 text-brand hover:bg-primary/10 rounded-control inline-flex shrink-0 items-center justify-center border border-dashed transition-colors"
      >
        <Ellipsis style={glyph} aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={`${finish}: ${words}`}
      title={finish}
      onClick={() => onSpeak(words)}
      style={box}
      className={cn(
        "focus-attention rounded-control inline-flex shrink-0 items-center justify-center border transition-colors",
        stripe.source === "code"
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-primary/40 bg-primary/10 text-brand hover:bg-primary/20",
      )}
    >
      <CornerDownLeft style={glyph} aria-hidden />
    </button>
  );
}

/**
 * The mark in the gutter. It says where a row came from, for a user who does
 * not read colour.
 */
function SourceMark({
  source,
  code,
  kept,
  onPin,
}: {
  source: SuggestionSource;
  code?: string;
  /** A kept phrase wears a solid pin, the same as its row in the panel. */
  kept: boolean;
  onPin: () => void;
}) {
  if (source === "code") {
    return (
      <span
        role="img"
        aria-label={`Code ${code}`}
        title={`You typed the code ${code}`}
        className="bg-primary text-primary-foreground inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-xs font-bold"
      >
        {code}
      </span>
    );
  }

  if (source === "starter") {
    return (
      <ChevronsRight
        className="text-brand size-4 shrink-0"
        role="img"
        aria-label="An opening"
      />
    );
  }

  if (source === "history") {
    return (
      <History
        className="text-chart-2 size-4 shrink-0"
        role="img"
        aria-label="You said this before"
      />
    );
  }

  if (source === "md") {
    return (
      <button
        type="button"
        onClick={onPin}
        aria-label="Keep this phrase"
        aria-pressed={kept}
        title={kept ? "You keep this phrase" : "Keep this phrase"}
        className={cn(
          "focus-attention text-brand hover:bg-primary/10 grid size-full cursor-pointer place-items-center rounded-control",
        )}
      >
        <Pin className={cn("size-4", kept && "fill-current")} aria-hidden />
      </button>
    );
  }

  return (
    <Sparkles
      className="text-muted-foreground size-4 shrink-0"
      role="img"
      aria-label="From AI Assistance"
    />
  );
}

