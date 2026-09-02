import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { MessagesSquare } from "lucide-react";

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
import { Button } from "@september/ui/components/button";
import {
  AGENT_OPENERS,
  agentOwesReply,
  agentProposalIsDelete,
  agentSaidRow,
  INTRODUCTION_WAIT_MS,
  type AgentMessage,
} from "@september/core/rules/agent";
import { documentTitle } from "@september/core/rules/titles";
import {
  newSpaceTitle,
  NEW_SPACE_CONTEXT,
  NEW_SPACE_OPENERS,
  spaceFromSlug,
} from "@september/core/rules/spaces";

import { hasWritingService } from "@platform/services/ai";
import {
  askAgent,
  continueAgent,
  resolveAgentProposal,
  writeAgentMessage,
} from "@platform/services/agent";
import { newSpaceDraft, rememberDraft } from "@platform/services/os";
import {
  useAgentMessages,
  useAllMessages,
  useCreateSpace,
  useSpaces,
  useUpdateSpace,
  type Space,
} from "@platform/services/data";
import { RightPanel, ScreenHeader } from "@september/app-ui/blocks/screen";
import { PanelRail } from "@september/app-ui/blocks/space-panel";
import {
  Composer,
  Problem,
  SpaceDock,
  SpaceTitle,
  spaceParams,
  talkParams,
  useRememberMode,
} from "@september/app-ui/blocks/space";
import {
  AgentLetter,
  Transcript,
  TranscriptEmpty,
} from "@september/app-ui/blocks/agent-transcript";

export function AgentScreen({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const { data: spaces, isPending } = useSpaces();
  const space = spaceFromSlug(slug, spaces ?? []);

  useEffect(() => {
    if (!isPending && !space) navigate({ to: "/spaces", replace: true });
  }, [isPending, space, navigate]);

  if (!space) return null;
  return <Agent key={space.id} space={space} spaces={spaces ?? []} />;
}

function Agent({ space, spaces }: { space: Space; spaces: Space[] }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { data: messages, error } = useAgentMessages(space.id);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [partial, setPartial] = useState("");
  const [problem, setProblem] = useState("");
  const [confirming, setConfirming] = useState<AgentMessage | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useRememberMode(space, "agent");

  const rows = messages ?? [];
  const pending = rows.some((row) => row.tool_state === "pending");
  // A turn this screen did not start still belongs to it. The introduction
  // of a new space runs on past the screen that asked for it, so an owed
  // reply is how this one knows work is in flight.
  const working = busy || agentOwesReply(rows, Date.now());

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [rows.length, partial]);

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["agent-messages", space.id] }),
      client.invalidateQueries({ queryKey: ["spaces"] }),
      client.invalidateQueries({ queryKey: ["messages", space.id] }),
      client.invalidateQueries({ queryKey: ["notes", space.id] }),
      client.invalidateQueries({ queryKey: ["phrases"] }),
    ]);
  };

  const ask = async (text: string) => {
    if (busy || pending) return;
    setBusy(true);
    setProblem("");
    setPartial("");
    try {
      await askAgent(space, text, { onPartial: setPartial });
      setDraft("");
    } catch (reason) {
      setProblem(reason instanceof Error ? reason.message : String(reason));
    } finally {
      await refresh();
      setPartial("");
      setBusy(false);
    }
  };

  const resolve = async (proposal: AgentMessage, approve: boolean) => {
    if (busy) return;
    setBusy(true);
    setProblem("");
    setPartial("");
    setConfirming(null);
    try {
      await resolveAgentProposal(space, proposal, approve, {
        onPartial: setPartial,
      });
    } catch (reason) {
      setProblem(reason instanceof Error ? reason.message : String(reason));
    } finally {
      await refresh();
      setPartial("");
      setBusy(false);
    }
  };

  return (
    <>
      <title>{documentTitle(space.title, "Agent")}</title>
      <ScreenHeader>
        <SpaceTitle space={space} mode="agent" />
      </ScreenHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-2 md:p-4">
        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
          {error ? <Problem error={error} /> : null}
          {problem ? (
            <p
              role="alert"
              className="text-destructive rounded-xl border p-3 text-sm"
            >
              {problem}
            </p>
          ) : null}

          <div
            aria-live="polite"
            aria-busy={working}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-4"
          >
            {rows.length === 0 ? (
              <TranscriptEmpty
                icon={<AgentLetter className="text-xl" />}
                title="What shall we change?"
                openers={AGENT_OPENERS}
                onOpener={(opener) =>
                  setDraft((current) =>
                    current.trim() ? `${current.trim()} ${opener}` : opener,
                  )
                }
              >
                The agent reads this space on its own, and changes it when
                you ask. Only deleting waits for your approval.
              </TranscriptEmpty>
            ) : (
              <Transcript
                rows={rows}
                busy={working}
                partial={partial}
                space={space}
                onApprove={(row) =>
                  agentProposalIsDelete(row)
                    ? setConfirming(row)
                    : void resolve(row, true)
                }
                onReject={(row) => void resolve(row, false)}
              />
            )}
            <div ref={end} />
          </div>

          {!hasWritingService() ? (
            <div className="border-border bg-muted/40 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
              <p className="text-sm">
                Connect writing help before asking the agent.
              </p>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => navigate({ to: "/settings/writing" })}
              >
                Open Writing settings
              </Button>
            </div>
          ) : null}

          <Composer
            mode="agent"
            spaceId={space.id}
            context={space.context ?? ""}
            draft={draft}
            onDraft={setDraft}
            onAction={(text) => void ask(text)}
            onPin={() => undefined}
            pending={working || pending || !hasWritingService()}
            suggestions={false}
            note={
              pending
                ? "Approve or reject the proposed change before asking again."
                : undefined
            }
          />
        </div>

        <SpaceDock
          current={space}
          spaces={spaces}
          mode="agent"
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

      <DeleteProposalDialog
        proposal={confirming}
        onClose={() => setConfirming(null)}
        onConfirm={() => confirming && void resolve(confirming, true)}
      />
    </>
  );
}

function DeleteProposalDialog({
  proposal,
  onClose,
  onConfirm,
}: {
  proposal: AgentMessage | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={proposal !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this item?</AlertDialogTitle>
          <AlertDialogDescription>
            The agent will delete it from this space. You cannot undo this.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Keep it</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// -------------------------------------------------------------- new space

/**
 * Sets a new space up from what its user just said it is for.
 *
 * This is the space's own agent, on its own first turn: it reads the space,
 * names it, writes its description, and writes its first phrases. Those are
 * ordinary tool calls, in the ordinary transcript, and they apply without a
 * press because a space made one second ago holds nothing that approval
 * protects. The user pressed Create space, and that press is the approval.
 *
 * It runs on past the screen that started it. The user is already inside the
 * space by the time the first model answers, so there is no progress to hand
 * over and nothing to cancel.
 *
 * The model never decides whether to create. The space and the words of the
 * user are on disk before this runs, so the worst a dead service can do is
 * leave a space with a made-up name.
 */
async function introduce(space: Space, hasWriting: boolean) {
  if (!hasWriting) {
    await writeAgentMessage(
      agentSaidRow(
        space.id,
        "assistant",
        "Your words are this space's note. Connect writing help in Settings, and I can name this space and write its first phrases.",
      ),
    );
    return;
  }

  try {
    await continueAgent(space, {
      intro: true,
      signal: AbortSignal.timeout(INTRODUCTION_WAIT_MS),
    });
  } catch (reason) {
    // The reply lands whatever happened, so an owed one always means the
    // work is still going.
    await writeAgentMessage(
      agentSaidRow(
        space.id,
        "assistant",
        `I could not finish setting this space up: ${
          reason instanceof Error ? reason.message : "the writing service did not answer"
        }. Your words are saved as its note, and you can rename it in the header.`,
      ),
    ).catch(() => undefined);
  }
}

/**
 * The screen that a new space starts on.
 *
 * It is a doorway and not a destination. A space is not made until the user
 * says what it is for; the moment they do, the space exists and they are
 * inside it, watching their own words open its Agent conversation.
 *
 * Nothing here waits for a model. The old screen held the user in front of
 * three ticking rows until every write landed, because opening Talk early
 * would have filled the suggestion stripe under a hand already reaching for
 * it. Agent has no stripe, so that reason is gone, and the phrases are ready
 * by the time anyone presses Talk.
 *
 * A user who has nothing to say yet presses Skip. That space takes the
 * made-up title, asks no model, and opens in Talk — there is no introduction
 * to watch.
 */
export function NewSpaceScreen() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { data: spaces, isPending } = useSpaces();
  const { data: everyMessage } = useAllMessages();
  const createSpace = useCreateSpace();
  const patch = useUpdateSpace();

  const [words, setWords] = useState(newSpaceDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Cancel with words in the field asks before it throws them away.
  const [discarding, setDiscarding] = useState(false);

  const hasWriting = hasWritingService();
  const written = words.trim();

  // The words the engine reads. This space has none of its own yet, so it
  // reads what the user has said everywhere else: the words a user writes
  // with one person help the words they write with another.
  const history = useMemo(
    () =>
      (everyMessage ?? [])
        .filter((message) => message.type === "user")
        .map((message) => message.text),
    [everyMessage],
  );

  // The words are kept as they are written. A mis-hit, a crash, or a restart
  // must not take a paragraph that took minutes to type.
  useEffect(() => {
    const timer = setTimeout(() => void rememberDraft(words), 400);
    return () => clearTimeout(timer);
  }, [words]);

  /**
   * Puts an opener in the field.
   *
   * It starts the first sentence, and after that it starts the next one, so a
   * user who has said who they speak to can press again to say what about.
   */
  const addOpener = (opener: string) =>
    setWords((current) =>
      current.trim() ? `${current.trim()} ${opener}` : opener,
    );

  const create = () =>
    createSpace.mutateAsync(
      newSpaceTitle((spaces ?? []).map((one) => one.title)),
    );

  const held = (reason: unknown) => {
    setError(reason instanceof Error ? reason : new Error(String(reason)));
    setBusy(false);
  };

  const skip = async () => {
    setError(null);
    setBusy(true);
    try {
      const space = await create();
      void rememberDraft("");
      // Nothing was said, so there is no introduction to watch.
      return navigate({ ...talkParams(space), replace: true });
    } catch (reason) {
      return held(reason);
    }
  };

  /**
   * Makes the space and steps out of the way.
   *
   * Only local writes are awaited: the space, the words of the user, and the
   * turn that opens its conversation. Every one of them is on disk before the
   * address changes, so a service that hangs cannot lose a paragraph and
   * cannot hold a user in front of a spinner.
   */
  const make = async (said: string) => {
    setError(null);
    setBusy(true);

    try {
      const space = await create();
      await patch.mutateAsync({ id: space.id, context: said });
      await writeAgentMessage(agentSaidRow(space.id, "user", said));
      void rememberDraft("");

      // The work runs on without this screen. It writes its reply into the
      // transcript and then drops these caches, and the Agent screen the user
      // is now looking at reads the answer from there.
      void introduce(space, hasWriting).then(
        () => {
          void client.invalidateQueries({
            queryKey: ["agent-messages", space.id],
          });
          void client.invalidateQueries({ queryKey: ["spaces"] });
          void client.invalidateQueries({ queryKey: ["phrases"] });
        },
      );

      return navigate({ ...spaceParams(space, "agent"), replace: true });
    } catch (reason) {
      return held(reason);
    }
  };

  const cancel = () => {
    if (written) return setDiscarding(true);
    return navigate({ to: "/spaces" });
  };

  const discard = () => {
    void rememberDraft("");
    setDiscarding(false);
    return navigate({ to: "/spaces" });
  };

  return (
    <>
      <title>{documentTitle("New space")}</title>
      <ScreenHeader>
        <span className="text-sm font-medium">New space</span>
      </ScreenHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-2 md:p-4">
        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
          {error ? <Problem error={error} /> : null}

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-4">
            <TranscriptEmpty
              icon={<MessagesSquare className="size-6" aria-hidden />}
              title="What is this space for?"
              openers={NEW_SPACE_OPENERS}
              onOpener={addOpener}
              footer={
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={skip}
                    aria-disabled={isPending || busy}
                    className="aria-disabled:opacity-50"
                  >
                    Skip for now
                  </Button>
                  <Button type="button" variant="ghost" onClick={cancel}>
                    Cancel
                  </Button>
                </div>
              }
            >
              Your words tell September what this space is for. Talk reads
              them for every suggestion and every phrase.
            </TranscriptEmpty>
          </div>

          <Composer
            mode="new"
            spaceId=""
            context={NEW_SPACE_CONTEXT}
            draft={words}
            onDraft={setWords}
            onAction={(said) => void make(said)}
            onPin={() => undefined}
            pending={busy || isPending}
            history={history}
            note={
              hasWriting
                ? undefined
                : "September will keep your words. Connect writing help in Settings to have it name the space and write the first phrases."
            }
          />
        </div>
      </div>

      <AlertDialog open={discarding} onOpenChange={setDiscarding}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete these words?</AlertDialogTitle>
            <AlertDialogDescription>
              September has not made the space yet, so nothing here is saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep writing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={discard}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
