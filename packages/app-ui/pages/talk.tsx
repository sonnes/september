import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  guardUnsavedChanges,
  readTalkDraft,
  readTalkMood,
  saveTalkDraft,
  saveTalkMood,
} from "@platform/services/os";
import type { MoodKey } from "@september/core/rules/moods";
import { useNavigate } from "@tanstack/react-router";
import { MessagesSquare, Square, Volume2 } from "lucide-react";
import { Button } from "@september/ui/components/button";
import { recordMessageUsage } from "@platform/services/usage";
import {
  useMessages,
  usePhrases,
  usePutPhrase,
  useSendMessage,
  type Message,
  type Space,
} from "@platform/services/data";
import {
  RightPanel,
  ScreenHeader,
} from "@september/app-ui/blocks/screen";
import { PanelRail } from "@september/app-ui/blocks/space-panel";
import { TaggedText } from "@september/app-ui/blocks/suggestions";
import { pinnedPhrase } from "@september/core/rules/phrases";
import { documentTitle } from "@september/core/rules/titles";
import { useSyncPhrases } from "@platform/services/phrase-sync";
import {
  speak,
  stopSpeaking,
  useSpeaking,
  useVoiceFallback,
} from "@platform/services/speech";
import { useChrome } from "@september/app-ui/blocks/chrome";
import {
  messageTime,
  spaceSlug,
  spokenToday,
  transcriptPage,
} from "@september/core/rules/spaces";

import {
  Composer,
  Problem,
  SpaceDock,
  SpaceTitle,
  spaceParams,
  useRememberMode,
  useSpaceBySlug,
} from "@september/app-ui/blocks/space";
// ------------------------------------------------------------------- talk

export function TalkScreen({ slug }: { slug: string }) {
  const { space, spaces } = useSpaceBySlug(slug, "talk");
  const saved = useQuery({
    queryKey: ["talk-draft", space?.id],
    queryFn: () => readTalkDraft(space!.id),
    enabled: !!space,
  });

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
  const putPhrase = usePutPhrase();
  const navigate = useNavigate();

  // A model writes the phrases of this space, and writes them again as the
  // conversation grows. It never touches a row the user kept.
  useSyncPhrases({ space, phrases, messages });
  useRememberMode(space, "talk");

  const fallback = useVoiceFallback();
  const [draft, setDraft] = useState(initialDraft);
  const heldDraft = useRef(initialDraft);
  const draftRevision = useRef(0);
  const client = useQueryClient();
  const draftSave = useMutation({
    scope: { id: `talk-draft:${space.id}` },
    mutationFn: (words: string) => saveTalkDraft(space.id, words),
    onSuccess: (_result, words) => client.setQueryData(["talk-draft", space.id], words),
  });
  useEffect(() => {
    if (!draftSave.isPending && !draftSave.isError) return;
    return guardUnsavedChanges();
  }, [draftSave.isPending, draftSave.isError]);
  // The mood stays with the space until the user presses its key again.
  const savedMood = useQuery({
    queryKey: ["talk-mood", space.id],
    queryFn: () => readTalkMood(space.id),
  });
  const mood = savedMood.data ?? null;
  const chooseMood = (next: MoodKey | null) => {
    client.setQueryData(["talk-mood", space.id], next);
    void saveTalkMood(space.id, next);
  };
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
  const playing = speaking === "composer" && sentence !== null && !writing;

  const spoken = (messages ?? []).filter((message) => message.type === "user");
  const { page, pageCount, slice } = transcriptPage(spoken, pageInput);
  const shown = transcript ? slice : spoken.slice(-RECENT);
  const today = spokenToday(spoken);

  // Escape closes the transcript before the panel uses the key.
  useEffect(() => {
    if (!transcript) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      setTranscript(false);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [transcript]);

  // A new message goes to the newest page, so the user never sends from
  // behind an old page.
  const newest = spoken[spoken.length - 1]?.id;
  useEffect(() => setPageInput(0), [newest]);

  /** Keeps a row of the stripe, so a regeneration cannot take it away. */
  const keep = (text: string) => {
    const row = pinnedPhrase(text, space.id, phrases ?? []);
    if (row) putPhrase.mutate(row);
  };

  const say = (sentence: string) => {
    const typed = keysTyped.current;
    const sentRevision = draftRevision.current;
    setSentence(sentence);
    setWriting(false);
    void speak(sentence);
    send.mutate(sentence, {
      onSuccess: () => {
        void recordMessageUsage(sentence, typed, space.id);
        if (draftRevision.current === sentRevision) {
          write("");
          keysTyped.current = 0;
        }
      },
    });
  };

  const write = (text: string) => {
    draftRevision.current += 1;
    heldDraft.current = text;
    setDraft(text);
    draftSave.mutate(text);
  };


  // The voice starts at once. The composer holds the text until local storage
  // accepts the message, so a failed write loses no words.

  return (
    <>
      <title>{documentTitle(space.title, "Talk")}</title>
      <ScreenHeader>
        <SpaceTitle space={space} />
      </ScreenHeader>


      <div className="@container bg-muted/40 flex min-h-0 flex-1 flex-col gap-3 p-2 md:p-4">
        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-2.5">
          {error ? <Problem error={error} /> : null}

          <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto pt-2">
            {spoken.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
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
                      navigate({
                        to: "/spaces/$slug/notes",
                        params: { slug: spaceSlug(space.title) },
                      })
                    }
                  >
                    Tell September what this space is for
                  </Button>
                )}
              </div>
            ) : (
              <section aria-label="Messages" className="flex flex-col gap-1">
                <div className="text-muted-foreground flex min-h-11 items-center gap-1.5 pl-1.5 text-xs font-semibold">
                  {transcript ? "All messages" : today ? "Said today" : "Said before"}
                  <span className="text-muted-foreground/70 font-medium">
                    {transcript ? spoken.length : today || null}
                  </span>
                  {transcript ? (
                    <LabelButton onClick={() => setTranscript(false)}>
                      Back to suggestions
                    </LabelButton>
                  ) : spoken.length > RECENT ? (
                    <LabelButton
                      onClick={() => {
                        setPageInput(0);
                        setTranscript(true);
                      }}
                    >
                      See all
                    </LabelButton>
                  ) : null}
                </div>
                <div className="bg-card divide-muted overflow-hidden rounded-2xl shadow-sm divide-y">
                  {transcript && page < pageCount - 1 ? (
                    <PageRow onClick={() => setPageInput(page + 1)}>
                      Earlier messages
                    </PageRow>
                  ) : null}
                  {shown.map((message) => (
                    <MessageRow key={message.id} message={message} />
                  ))}
                  {transcript && page > 0 ? (
                    <PageRow onClick={() => setPageInput(page - 1)}>
                      Newer messages
                    </PageRow>
                  ) : null}
                </div>
              </section>
            )}
          </div>

          {draftSave.isError ? (
            <div role="alert">
              <p>Your unfinished words could not be saved. Keep this page open and retry.</p>
              <Button onClick={() => draftSave.mutate(heldDraft.current)}>Retry saving</Button>
            </div>
          ) : draftSave.isPending ? <p role="status">Saving…</p> : null}
          <Composer
            mode="talk"
            spaceId={space.id}
            context={space.context ?? ""}
            draft={draft}
            onDraft={write}
            onAction={say}
            onTypedKey={() => {
              keysTyped.current += 1;
            }}
            onPin={keep}
            pending={send.isPending}
            note={fallback ?? undefined}
            mood={mood}
            onMood={chooseMood}
            suggestions={!transcript}
            cover={
              playing ? (
                <SpeakingCard
                  text={sentence}
                  onWrite={(key) => {
                    setWriting(true);
                    if (key) write(draft + key);
                  }}
                />
              ) : undefined
            }
          />
          <KeyHints
            items={
              playing
                ? [["Esc", "stops"], ["", "typing starts the next sentence"]]
                : transcript
                  ? [["Esc", "goes back to the suggestions"]]
                  : [
                      ["Return", "speaks"],
                      ["Shift-Return", "starts a new line"],
                      ...(chrome === "panel" ? [["⌘K", "spaces"] as const] : []),
                    ]
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
/** The number of messages that Talk shows over the suggestions. */
const RECENT = 3;

/** A message of the history. A press speaks it again. */
function MessageRow({ message }: { message: Message }) {
  const speaking = useSpeaking() === message.id;

  return (
    <button
      type="button"
      aria-label={speaking ? "Stop" : "Speak this message again"}
      onClick={() =>
        speaking ? stopSpeaking() : void speak(message.text, message.id)
      }
      className="hover:bg-muted/60 focus-visible:ring-ring flex min-h-13 w-full items-center gap-2.5 py-1 pr-1 pl-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
    >
      <span className="min-w-0 flex-1 text-base leading-snug">
        <TaggedText text={message.text} />
      </span>
      <span className="text-muted-foreground/80 shrink-0 text-xs">
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
      className="text-primary hover:bg-muted/60 focus-visible:ring-ring flex min-h-13 w-full items-center justify-center text-sm font-medium focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
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
      className="text-primary focus-visible:ring-ring ml-auto min-h-11 rounded-full px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
    >
      {children}
    </button>
  );
}

/**
 * The card that takes the place of the field while a sentence plays. Stop is
 * the first key. Write next, or a typed letter, gives the field back while the
 * voice goes on.
 */
function SpeakingCard({
  text,
  onWrite,
}: {
  text: string;
  onWrite: (key?: string) => void;
}) {
  const stop = useRef<HTMLButtonElement>(null);
  useEffect(() => stop.current?.focus(), []);

  return (
    <div
      role="region"
      aria-label="Speaking"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          // The panel does not also hide on this press.
          event.preventDefault();
          stopSpeaking();
          return;
        }
        if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) {
          return;
        }
        event.preventDefault();
        onWrite(event.key);
      }}
      className="bg-primary text-primary-foreground rounded-surface p-3.5"
    >
      <p className="flex items-center gap-1.5 text-xs font-medium opacity-85">
        <span aria-hidden className="size-2 rounded-full bg-emerald-400" />
        Speaking
      </p>
      <p className="mt-1.5 text-xl leading-snug">{text}</p>
      <div className="mt-3 flex items-center gap-2">
        <button
          ref={stop}
          type="button"
          onClick={() => stopSpeaking()}
          className="bg-background text-primary focus-visible:ring-ring inline-flex h-11 items-center gap-2 rounded-full px-4 font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-primary focus-visible:outline-none"
        >
          <Square className="size-4 fill-current" aria-hidden />
          Stop
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => onWrite()}
          className="focus-visible:ring-ring inline-flex h-11 items-center rounded-full bg-white/15 px-4 font-medium hover:bg-white/25 focus-visible:ring-2 focus-visible:outline-none"
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
    <p className="text-muted-foreground hidden px-4 text-xs pointer-fine:block">
      {items.map(([key, action], at) => (
        <span key={at}>
          {at > 0 ? " · " : null}
          {key ? (
            <kbd className="text-foreground/70 font-sans font-semibold">{key}</kbd>
          ) : null}
          {key ? " " : null}
          {action}
        </span>
      ))}
    </p>
  );
}
