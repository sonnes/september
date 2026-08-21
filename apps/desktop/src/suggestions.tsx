import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ChevronsRight,
  CornerDownLeft,
  Ellipsis,
  History,
  Pin,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { generate, hasWritingService, itemsFrom, userContext } from "./ai";
import { useMessages, usePhrases } from "./data";
import {
  matchCode,
  topPhrases,
  topRows,
  trailingWord,
  type SavedPhrase,
} from "./phrases";
import { buildSuggestionPrompt } from "./prompts";
import { applySuggestion, useSuggestions } from "./suggest";
import {
  boardPhrases,
  boardWords,
  codeExpansionText,
  composeSuggestions,
  joinTokens,
  MAX_COMPOSED,
  stripeForText,
  TILE,
  tileScale,
  type SuggestionSource,
} from "./stripes";

/** Curated rows in the stripe, and how many of them may be starters. */
const SAVED_LIMIT = 5;
const STARTER_LIMIT = 2;
/** How long the app waits after a keystroke before it asks the model. */
const THINK_AFTER_MS = 200;

const PUNCTUATION = /^[.,!?;:]+$/;

interface Stripe {
  text: string;
  tokens: string[];
  hidden: number;
  source: SuggestionSource;
  code?: string;
}

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
    active: "border-primary bg-primary/10 text-primary",
  },
  // Words the user said before.
  history: {
    idle: "border-chart-2/45 bg-card text-foreground hover:border-chart-2/70 hover:bg-chart-2/5",
    active: "border-chart-2 bg-chart-2/10 text-chart-2",
  },
  // From a model. The quiet baseline, with no mark.
  llm: {
    idle: "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5",
    active: "border-primary bg-primary/10 text-primary",
  },
  // A phrase that a typed code brought up. The strongest tint.
  code: {
    idle: "border-primary/70 bg-primary/10 text-foreground hover:border-primary hover:bg-primary/15",
    active: "border-primary bg-primary/20 text-primary",
  },
  // An opening, not a whole thought. A broken line says so.
  starter: {
    idle: "border-dashed border-primary/50 bg-primary/5 text-foreground hover:border-primary/80 hover:bg-primary/10",
    active: "border-dashed border-primary bg-primary/10 text-primary",
  },
};

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
  onTake,
  onSpeak,
  onPin,
}: {
  spaceId: string;
  context: string;
  text: string;
  /** The words the engine reads. Notes gives it the note, not the messages. */
  history?: string[];
  onTake: (next: string) => void;
  onSpeak: (sentence: string) => void;
  onPin: (phrase: string) => void;
}) {
  const { data: spacePhrases } = usePhrases(spaceId);
  // A code works in every space, so the lookup reads them all.
  const { data: allPhrases } = usePhrases();
  const { data: messages } = useMessages(spaceId);
  const [hover, setHover] = useState<Hover>(null);

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
  const words = useSuggestions(spaceId, text);
  const fromModel = useCompletions({ text, context, history });
  const stripes = useStripes({
    text,
    spaceId,
    spacePhrases: spacePhrases ?? [],
    allPhrases: allPhrases ?? [],
    history,
    fromModel,
  });

  const chips = useMemo(() => {
    const board = boardWords(topPhrases(spacePhrases ?? [], SAVED_LIMIT));
    const lower = text.trim().toLowerCase();
    return board.filter(
      (word) => !lower || word.toLowerCase().startsWith(lower),
    );
  }, [spacePhrases, text]);

  const { ref, width } = useWidth();
  const scale = useMemo(
    () =>
      tileScale(
        stripes.map((stripe) => {
          const shown = stripe.tokens.slice(stripe.hidden);
          return { chars: shown.join("").length, tokens: shown.length };
        }),
        width,
      ),
    [stripes, width],
  );
  const size = (base: number) => base * scale;

  if (stripes.length === 0 && chips.length === 0 && words.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2.5" ref={ref}>
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((word) => (
            <button
              key={word}
              type="button"
              onClick={() =>
                onTake(
                  joinTokens([
                    ...text.trim().split(/\s+/).filter(Boolean),
                    word,
                  ]),
                )
              }
              className="border-primary/30 bg-card text-foreground hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-ring flex h-11 items-center gap-1.5 rounded-full border px-5 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Pin className="text-primary/60 size-3.5" aria-hidden />
              {word}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {stripes.map((stripe, row) => {
          const lane = LANE[stripe.source];
          return (
            <div
              key={stripe.text}
              data-source={stripe.source}
              // One line, never wrapped. A row longer than the shrink allows
              // scrolls, so no tile is out of reach. The bar stays hidden.
              className="flex flex-nowrap items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ gap: size(TILE.gapPx) }}
              onMouseLeave={() => setHover(null)}
            >
              <SourceMark
                source={stripe.source}
                code={stripe.code}
                onPin={() => onPin(stripe.text)}
              />

              {/* The words already typed are not shown again, so a tile always
                  adds something. A hover marks the tiles a press would take. */}
              {stripe.tokens.map((token, index) => {
                if (index < stripe.hidden) return null;
                const active =
                  hover !== null && hover.stripe === row && index <= hover.index;
                const punctuation = PUNCTUATION.test(token);

                return (
                  <button
                    key={index}
                    type="button"
                    onMouseEnter={() => setHover({ stripe: row, index })}
                    onFocus={() => setHover({ stripe: row, index })}
                    onClick={() =>
                      onTake(joinTokens(stripe.tokens.slice(0, index + 1)))
                    }
                    style={{
                      fontSize: size(TILE.fontPx),
                      paddingInline: size(
                        punctuation ? TILE.punctPadXPx : TILE.wordPadXPx,
                      ),
                      minHeight: size(TILE.minHeightPx),
                    }}
                    className={cn(
                      "rounded-chip focus-visible:ring-ring inline-flex shrink-0 items-center border transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      punctuation ? "" : "font-medium",
                      active ? lane.active : lane.idle,
                    )}
                  >
                    {token}
                  </button>
                );
              })}

              <EndKey
                stripe={stripe}
                scale={scale}
                onTake={onTake}
                onSpeak={onSpeak}
              />
            </div>
          );
        })}
      </div>

      {/* The word row sits nearest the composer, because it changes with each
          letter. `applySuggestion` knows a part-written word from a finished
          one, so the screen never splits the text itself. */}
      {words.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {words.map((word) => (
            <button
              key={word}
              type="button"
              onClick={() => onTake(applySuggestion(text, word))}
              className="border-chart-1/50 bg-card text-foreground hover:border-chart-1/70 hover:bg-chart-1/5 focus-visible:ring-ring min-h-12 rounded-lg border px-4 text-lg font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {word}
            </button>
          ))}
        </div>
      ) : null}
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
 * A starter takes its whole opening into the composer. Every other row speaks
 * its sentence, because it is a whole thought.
 */
function EndKey({
  stripe,
  scale,
  onTake,
  onSpeak,
}: {
  stripe: Stripe;
  scale: number;
  onTake: (next: string) => void;
  onSpeak: (sentence: string) => void;
}) {
  const box = {
    minHeight: TILE.minHeightPx * scale,
    paddingInline: TILE.wordPadXPx * scale,
  };
  const glyph = { width: TILE.fontPx * scale, height: TILE.fontPx * scale };

  if (stripe.source === "starter") {
    return (
      <button
        type="button"
        aria-label="Start with this opening"
        title="Start with this opening"
        onClick={() => onTake(joinTokens(stripe.tokens))}
        style={box}
        className="border-primary/40 text-primary/70 hover:bg-primary/10 hover:text-primary focus-visible:ring-ring rounded-control inline-flex shrink-0 items-center justify-center border border-dashed transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <Ellipsis style={glyph} aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label="Say this row"
      title="Say this row"
      onClick={() => onSpeak(joinTokens(stripe.tokens).trim())}
      style={box}
      className={cn(
        "rounded-control focus-visible:ring-ring inline-flex shrink-0 items-center justify-center border transition-colors focus-visible:ring-2 focus-visible:outline-none",
        stripe.source === "code"
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
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
  onPin,
}: {
  source: SuggestionSource;
  code?: string;
  onPin: () => void;
}) {
  if (source === "code") {
    return (
      <span
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
        className="text-primary/60 size-4 shrink-0"
        aria-label="An opening"
      />
    );
  }

  if (source === "history") {
    return (
      <History
        className="text-muted-foreground size-4 shrink-0"
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
        title="Keep this phrase"
        className="text-primary/60 hover:text-primary focus-visible:ring-ring size-4 shrink-0 cursor-pointer rounded focus-visible:ring-2 focus-visible:outline-none"
      >
        <Pin className="size-4" aria-hidden />
      </button>
    );
  }

  // A row from a model carries no mark. It is the quiet baseline.
  return <span className="w-4 shrink-0" aria-hidden />;
}

function useStripes({
  text,
  spaceId,
  spacePhrases,
  allPhrases,
  history,
  fromModel,
}: {
  text: string;
  spaceId: string;
  spacePhrases: SavedPhrase[];
  allPhrases: SavedPhrase[];
  history: string[];
  fromModel: string[];
}): Stripe[] {
  return useMemo(() => {
    const starters = topRows(spacePhrases, STARTER_LIMIT, "starter").map(
      (row) => row.text,
    );
    const saved = topPhrases(spacePhrases, SAVED_LIMIT - starters.length);

    const composed = composeSuggestions({
      typed: text,
      mdPhrases: boardPhrases(saved),
      starters,
      history,
      llm: fromModel,
    });

    const rows = composed
      .map((one) => ({ ...stripeForText(one.text, text), source: one.source }))
      .filter((one) => one.hidden < one.tokens.length);

    // A code at the caret is local and exact, so it never waits on the model.
    const word = trailingWord(text);
    const match = word ? matchCode(word, allPhrases, spaceId) : undefined;
    if (!match) return rows;

    const expanded = codeExpansionText(text, match.text);
    if (expanded.trim().toLowerCase() === text.trim().toLowerCase()) return rows;

    const codeStripe: Stripe = {
      ...stripeForText(expanded, text),
      source: "code",
      code: match.code,
    };
    return [
      codeStripe,
      ...rows.filter(
        (one) => one.text.toLowerCase() !== codeStripe.text.toLowerCase(),
      ),
    ].slice(0, MAX_COMPOSED);
  }, [text, spaceId, spacePhrases, allPhrases, history, fromModel]);
}

/** The last rows of the stripe, from the writing service. */
function useCompletions({
  text,
  context,
  history,
}: {
  text: string;
  context: string;
  history: string[];
}): string[] {
  const [rows, setRows] = useState<string[]>([]);
  const lines = history.slice(-20).map((one) => `Me: ${one}`);
  const key = `${text} ${lines.length}`;

  useEffect(() => {
    if (!hasWritingService()) {
      setRows([]);
      return;
    }

    const dropped = new AbortController();
    const timer = setTimeout(() => {
      const { system, user } = buildSuggestionPrompt({
        globalMd: userContext(),
        spaceMd: context,
        history: lines,
        typed: text,
      });

      generate(
        {
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        },
        dropped.signal,
      )
        .then((answer) => setRows(itemsFrom(answer, "suggestions")))
        // A service that fails leaves the rows that do not need it.
        .catch(() => setRows([]));
    }, THINK_AFTER_MS);

    return () => {
      clearTimeout(timer);
      dropped.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, context]);

  return rows;
}
