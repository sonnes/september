import { useEffect, useRef, useState, type RefObject } from "react";
import { useAutosave } from "@september/app-ui/services/autosave";
import { useSaveTalkDraft, useTalkDraft, useTalkMood } from "@september/app-ui/services/talk";
import { useNavigate } from "@tanstack/react-router";
import { MessagesSquare, Square, Volume2 } from "lucide-react";
import { cn } from "@september/ui";
import { Button } from "@september/ui/components/button";
import { recordMessageUsage } from "@september/app-ui/services/usage";
import {
  useMessages,
  usePhrases,
  usePinPhrase,
  useSendMessage,
} from "@september/app-ui/services/data";
import type { Message, Space } from "@september/core/rules/records";
import {
  RightPanel,
  ScreenHeader,
} from "@september/app-ui/blocks/screen";
import { PanelRail } from "@september/app-ui/blocks/space-panel";
import { SpokenText } from "@september/app-ui/blocks/tagged-text";
import { SPACE_MODE_TITLES } from "@september/core/rules/navigation";
import { documentTitle } from "@september/core/rules/titles";
import { useSyncPhrases } from "@september/app-ui/services/phrase-sync";
import {
  speak,
  stopSpeaking,
  useSpeaking,
  useVoiceFallback,
} from "@september/app-ui/services/speech";
import { useChrome } from "@september/app-ui/blocks/chrome";
import { useEscape } from "@september/app-ui/blocks/keymap";
import { KEYMAP, keyLabel } from "@september/core/rules/keymap";
import {
  messageTime,
  recentThatFit,
  spokenToday,
  TRANSCRIPT_PAGE_SIZE,
  transcriptPage,
} from "@september/core/rules/spaces";

import { Composer } from "@september/app-ui/blocks/composer";
import { Problem } from "@september/app-ui/blocks/states";
import { SpaceDock } from "@september/app-ui/blocks/space-dock";
import { spaceParams, useRememberMode, useSpaceBySlug } from "@september/app-ui/blocks/space-routes";
import { SpaceTitle } from "@september/app-ui/blocks/space-title";

export function TalkScreen({ slug }: { slug: string }) {
  const { space, spaces } = useSpaceBySlug(slug, "talk");
  const saved = useTalkDraft(space?.id);

  if (!space) return null;
  if (saved.error) return <Problem error={saved.error} />;
  if (saved.isPending) return <p role="status">Loading your unfinished words…</p>;

  // The key restarts the composer and the page when the space changes.
  return <Talk key={space.id} space={space} spaces={spaces} initialDraft={saved.data} />;
}

function Talk({ space, spaces, initialDraft }: { space: Space; spaces: Space[]; initialDraft: string }) {
  const { data: messages, error } = useMessages(space.id);
  const { data: phrases } = usePhrases(space.id);
  const send = useSendMessage(space.id);
  const navigate = useNavigate();

  // A model writes the phrases of this space, and writes them again as the
  // conversation grows. It never touches a row the user kept.
  useSyncPhrases({ space, phrases, messages });
  useRememberMode(space, "talk");

  const fallback = useVoiceFallback();
  const draft = useAutosave(initialDraft, useSaveTalkDraft(space.id));
  const { mood, choose: chooseMood, problem: moodProblem } = useTalkMood(space.id);
  const keysTyped = useRef(0);
  const [pageInput, setPageInput] = useState(0);
  // See all shows the pages of the transcript in place of the suggestions.
  const [transcript, setTranscript] = useState(false);
  const speaking = useSpeaking();
  const chrome = useChrome();
  // The sentence that Speak sent, and whether the user went back to the field
  // while it plays.
  const [sentence, setSentence] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const playing = speaking === "composer" && sentence !== null;
  const field = useRef<HTMLTextAreaElement>(null);

  const spoken = (messages ?? []).filter((message) => message.type === "user");
  const { page, pageCount, slice } = transcriptPage(spoken, pageInput);
  // The history shows the newest messages that fit whole in its space, and
  // See all opens the rest.
  const recent = spoken.slice(-TRANSCRIPT_PAGE_SIZE);
  const historyArea = useRef<HTMLDivElement>(null);
  const historyLabel = useRef<HTMLDivElement>(null);
  const historyCopy = useRef<HTMLDivElement>(null);
  const fit = useRecentFit(
    historyArea,
    historyLabel,
    historyCopy,
    !transcript && recent.length > 0,
    recent.map((message) => message.id).join(" "),
  );
  const count = fit ?? Math.min(RECENT, recent.length);
  const shown = transcript ? slice : recent.slice(recent.length - count);
  const today = spokenToday(spoken);

  useEscape(transcript ? () => setTranscript(false) : null);

  // A new message goes to the newest page, so the user never sends from
  // behind an old page.
  const newest = spoken[spoken.length - 1]?.id;
  useEffect(() => setPageInput(0), [newest]);

  const keep = usePinPhrase(space.id);
  const saveProblem = send.isError
    ? "Could not save the message to history."
    : keep.failed
      ? "Could not keep the phrase."
      : null;

  // The voice starts at once. The composer holds the text until local storage
  // accepts the message, so a failed write loses no words.
  const say = (sentence: string) => {
    const typed = keysTyped.current;
    const sent = draft.current();
    setSentence(sentence);
    setWriting(false);
    field.current?.focus();
    void speak(sentence);
    send.mutate(sentence, {
      onSuccess: () => {
        void recordMessageUsage(sentence, typed, space.id);
        if (draft.current() === sent) {
          draft.write("");
          keysTyped.current = 0;
        }
      },
    });
  };

  return (
    <>
      <title>{documentTitle(space.title, SPACE_MODE_TITLES.talk)}</title>
      <ScreenHeader heading={`${space.title} · ${SPACE_MODE_TITLES.talk}`}>
        <SpaceTitle space={space} />
      </ScreenHeader>
      {/* The status is on the page before it has words, so a screen reader
          reads each new sentence. */}
      <p role="status" className="sr-only">
        {playing && sentence ? `Speaking: ${sentence}` : ""}
      </p>

      <div className="@container bg-muted/40 flex min-h-0 flex-1 flex-col gap-3 p-2 md:p-4">
        {/* The history gives way first: it drops rows down to its label. The
            stripes never shrink or scroll. If the screen is still too short,
            the column itself scrolls, so the field, its keys, and the dock
            are never under other content. The padding keeps edge focus rings
            inside the scroll. */}
        <div className="mx-auto flex min-h-0 w-full max-w-[calc(48rem+0.75rem)] flex-1 flex-col gap-2.5 overflow-y-auto px-1.5 pb-1">
          {error ? <Problem error={error} /> : null}

          {/* The history sits at the foot of its space. All messages
              scroll, so a long list still reaches its first message. The
              label row always has room. */}
          {/* The side padding keeps a focus ring inside the scroll. */}
          <div
            className={cn(
              "-mx-1.5 flex min-h-13 flex-1 flex-col px-1.5 pt-2",
              transcript || spoken.length === 0 ? "overflow-y-auto" : "overflow-hidden",
            )}
          >
            {spoken.length === 0 ? (
              <div className="flex flex-1 flex-col items-center gap-3 text-center [justify-content:safe_center]">
                <div className="bg-background text-muted-foreground flex size-12 items-center justify-center rounded-full">
                  <MessagesSquare className="size-6" aria-hidden />
                </div>
                <p className="text-muted-foreground max-w-xs text-sm">
                  Write a message below, then press Speak. What you say shows
                  here.
                </p>
                {/* A space that was skipped has a made-up name and no note.
                    Talk reads that note for every suggestion and every
                    phrase, so a space without one is worth the asking. */}
                {space.context?.trim() ? null : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      navigate(spaceParams(space, "notes"))
                    }
                  >
                    Tell September what this space is for
                  </Button>
                )}
              </div>
            ) : (
              <div
                ref={historyArea}
                className={cn(
                  "relative flex flex-col",
                  transcript ? "mt-auto" : "min-h-0 flex-1 justify-end",
                )}
              >
                {/* The group holds only the label and the messages, so the
                    scan band marks them and not the empty space above. */}
                <section aria-label="Messages" data-scan-group className="flex flex-col gap-1">
                  <div
                    ref={historyLabel}
                    className="text-muted-foreground flex min-h-11 shrink-0 items-center gap-1.5 pl-1.5 text-xs font-semibold"
                  >
                    {transcript ? "All messages" : today ? "Said today" : "Said before"}
                    <span className="text-muted-foreground font-medium">
                      {transcript ? spoken.length : today || null}
                    </span>
                    {transcript ? (
                      <LabelButton onClick={() => setTranscript(false)}>
                        Back to suggestions
                      </LabelButton>
                    ) : spoken.length > shown.length ? (
                      <LabelButton
                        onClick={() => {
                          setPageInput(0);
                          setTranscript(true);
                        }}
                      >
                        {/* With no row in view, the key says how many wait. */}
                        {shown.length === 0 ? `See all (${spoken.length})` : "See all"}
                      </LabelButton>
                    ) : null}
                  </div>
                  {transcript || shown.length > 0 ? (
                    <div className="bg-card divide-muted overflow-hidden rounded-2xl shadow-sm divide-y">
                      {transcript && page < pageCount - 1 ? (
                        <PageRow onClick={() => setPageInput(page + 1)}>
                          Earlier messages
                        </PageRow>
                      ) : null}
                      {shown.map((message, at) => (
                        <MessageRow
                          key={message.id}
                          message={message}
                          newest={!transcript && at === shown.length - 1}
                        />
                      ))}
                      {transcript && page > 0 ? (
                        <PageRow onClick={() => setPageInput(page - 1)}>
                          Newer messages
                        </PageRow>
                      ) : null}
                    </div>
                  ) : null}
                </section>
                {/* A copy of the recent rows that nobody sees or reaches. Its
                    rows give the heights that decide how many rows fit. */}
                {transcript ? null : (
                  <div
                    ref={historyCopy}
                    aria-hidden
                    inert
                    className="bg-card divide-muted pointer-events-none invisible absolute inset-x-0 top-0 divide-y"
                  >
                    {recent.map((message, at) => (
                      <MessageRow
                        key={message.id}
                        message={message}
                        newest={at === recent.length - 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* The sentence that plays shows below the messages, outside their
              scroll, so the card and its keys always show in full. The field
              stays, so the user can write the next sentence. */}
          {playing && sentence ? (
            <SpeakingCard
              text={sentence}
              onWrite={(key) => {
                setWriting(true);
                if (key) draft.write(draft.value + key);
                field.current?.focus();
              }}
            />
          ) : null}

          {draft.state === "failed" ? (
            <div role="alert">
              <p>Your unfinished words could not be saved. Keep this page open and retry.</p>
              <Button onClick={draft.retry}>Retry saving</Button>
            </div>
          ) : draft.state === "saving" ? <p role="status">Saving…</p> : null}
          <Composer
            mode="talk"
            spaceId={space.id}
            context={space.context ?? ""}
            draft={draft.value}
            onDraft={draft.write}
            onAction={say}
            onTypedKey={() => {
              keysTyped.current += 1;
            }}
            onPin={keep.pin}
            pending={send.isPending}
            note={fallback ?? moodProblem ?? saveProblem ?? undefined}
            mood={mood}
            onMood={chooseMood}
            suggestions={!transcript}
            fieldRef={field}
          />
          <KeyHints
            items={
              playing && !writing
                ? [["Esc", "stops"], ["", "typing starts the next sentence"]]
                : transcript
                  ? [["Esc", "goes back to the suggestions"]]
                  : [
                      ["Return", "speaks"],
                      ["Shift-Return", "starts a new line"],
                      ...(chrome === "panel" ? [[keyLabel(KEYMAP.spaces), "spaces"] as const] : []),
                    ]
            }
          />
        </div>

        <SpaceDock
          current={space}
          spaces={spaces}
          mode="talk"
        />
      </div>

      <RightPanel>
        <PanelRail spaceId={space.id} />
      </RightPanel>
    </>
  );
}
/** The number of messages that Talk shows before it measures its space. */
const RECENT = 3;

/** The gap between the label of the history and its card. */
const HISTORY_GAP = 4;

/**
 * Counts the recent messages that fit whole in the space of the history. It
 * counts again only when a size changes or the messages change, so a row does
 * not move while a gaze dwells on it.
 */
function useRecentFit(
  area: RefObject<HTMLElement | null>,
  label: RefObject<HTMLElement | null>,
  copy: RefObject<HTMLElement | null>,
  enabled: boolean,
  rows: string,
): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const box = area.current;
    const list = copy.current;
    if (!enabled || !box || !list || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const heights = [...list.children]
        .map((row) => (row as HTMLElement).offsetHeight)
        .reverse();
      const space = box.clientHeight - (label.current?.offsetHeight ?? 0) - HISTORY_GAP;
      setCount(recentThatFit(heights, space));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(list);
    return () => observer.disconnect();
  }, [area, label, copy, enabled, rows]);

  return count;
}

/**
 * A message of the history. A press speaks it again. The name is the action,
 * then the words, so a screen reader says what the user said. The newest
 * message is larger, because it is the one a partner reads.
 */
function MessageRow({ message, newest }: { message: Message; newest: boolean }) {
  const speaking = useSpeaking() === message.id;

  return (
    <button
      type="button"
      onClick={() =>
        speaking ? stopSpeaking() : void speak(message.text, message.id)
      }
      className="focus-attention-inset hover:bg-muted/60 flex min-h-13 w-full items-center gap-2.5 py-1 pr-1 pl-3.5 text-left transition-colors"
    >
      <span className="sr-only">{speaking ? "Stop: " : "Speak again: "}</span>
      <span
        className={cn(
          "min-w-0 flex-1 leading-snug",
          newest ? "text-xl font-medium" : "text-base",
        )}
      >
        <SpokenText id={message.id} text={message.text} />
      </span>
      <span className="text-muted-foreground shrink-0 text-xs">
        {messageTime(message.created_at)}
      </span>
      <span className="text-muted-foreground grid size-11 shrink-0 place-items-center">
        {speaking ? (
          <Square className="size-5" aria-hidden />
        ) : (
          <Volume2 className="size-5" aria-hidden />
        )}
      </span>
    </button>
  );
}

/** A row at an end of a transcript page that opens the next page. */
function PageRow({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-attention-inset text-brand hover:bg-muted/60 flex min-h-13 w-full items-center justify-center text-sm font-medium"
    >
      {children}
    </button>
  );
}

/** The action at the end of the label of the history. */
function LabelButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-attention text-brand ml-auto min-h-12 rounded-full px-3 text-sm font-medium"
    >
      {children}
    </button>
  );
}

/**
 * The card below the messages while a sentence plays. The focus stays in the
 * field. Write next, or a typed letter in the card, moves to the field while
 * the voice goes on.
 */
function SpeakingCard({
  text,
  onWrite,
}: {
  text: string;
  onWrite: (key?: string) => void;
}) {
  useEscape(stopSpeaking);

  return (
    <div
      role="region"
      aria-label="Speaking"
      onKeyDown={(event) => {
        if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) {
          return;
        }
        event.preventDefault();
        onWrite(event.key);
      }}
      className="bg-primary text-primary-foreground rounded-surface shrink-0 p-3.5"
    >
      <p className="flex items-center gap-1.5 text-xs font-medium">
        <span aria-hidden className="size-2 rounded-full bg-emerald-400" />
        Speaking
      </p>
      <p className="mt-1.5 text-xl leading-snug">{text}</p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => stopSpeaking()}
          className="focus-attention bg-background text-brand inline-flex min-h-12 items-center gap-2 rounded-full px-4 font-semibold"
        >
          <Square className="size-4 fill-current" aria-hidden />
          Stop
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => onWrite()}
          className="focus-attention inline-flex min-h-12 items-center rounded-full bg-white/15 px-4 font-medium hover:bg-white/25"
        >
          Write next
        </button>
      </div>
    </div>
  );
}

/**
 * The keys that work now, under the composer. A touch screen has no keys, so
 * the line shows only with a fine pointer.
 */
function KeyHints({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <p className="text-muted-foreground hidden shrink-0 px-4 text-xs pointer-fine:block">
      {items.map(([key, action], at) => (
        <span key={at}>
          {at > 0 ? " · " : null}
          {key ? (
            <kbd className="text-foreground font-sans font-semibold">{key}</kbd>
          ) : null}
          {key ? " " : null}
          {action}
        </span>
      ))}
    </p>
  );
}
