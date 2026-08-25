import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  MessagesSquare,
  Square,
  Volume2,
} from "lucide-react";
import { Button } from "@september/ui/components/button";
import { recordMessageUsage } from "@platform/services/usage";
import {
  useMessages,
  usePhrases,
  usePutPhrase,
  useSendMessage,
  useSpaces,
  type Message,
  type Space,
} from "@platform/services/data";
import {
  RightPanel,
  ScreenHeader,
} from "@september/app-ui/blocks/screen";
import { PanelRail } from "@september/app-ui/blocks/space-panel";
import { pinnedPhrase } from "@september/core/rules/phrases";
import { documentTitle } from "@september/core/rules/titles";
import { useSyncPhrases } from "@platform/services/phrase-sync";
import {
  speak,
  stopSpeaking,
  useSpeaking,
  useVoiceFallback,
} from "@platform/services/speech";
import { spaceFromSlug, spaceSlug, transcriptPage } from "@september/core/rules/spaces";

import {
  Composer,
  Problem,
  SpaceDock,
  SpaceTitle,
  spaceParams,
  useRememberMode,
} from "@september/app-ui/blocks/space";
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
  const navigate = useNavigate();

  // A model writes the phrases of this space, and writes them again as the
  // conversation grows. It never touches a row the user kept.
  useSyncPhrases({ space, phrases, messages });
  useRememberMode(space, "talk");

  const fallback = useVoiceFallback();
  const [draft, setDraft] = useState("");
  const keysTyped = useRef(0);
  const [pageInput, setPageInput] = useState(0);

  const spoken = (messages ?? []).filter((message) => message.type === "user");
  const { page, pageCount, slice } = transcriptPage(spoken, pageInput);

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
    void speak(sentence);
    send.mutate(sentence, {
      onSuccess: () => {
        void recordMessageUsage(sentence, typed, space.id);
        setDraft("");
        keysTyped.current = 0;
      },
    });
  };

  const write = (text: string) => setDraft(text);


  // The voice starts at once. The composer holds the text until local storage
  // accepts the message, so a failed write loses no words.

  return (
    <>
      <title>{documentTitle(space.title, "Talk")}</title>
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
            onTypedKey={() => {
              keysTyped.current += 1;
            }}
            onPin={keep}
            pending={send.isPending}
            note={
              fallback
                ? `The chosen voice did not answer, so this device spoke instead (${fallback}).`
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
