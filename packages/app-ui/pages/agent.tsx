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
  INTRODUCTION_WAIT_MS,
  type AgentMessage,
} from "@september/core/rules/agent";
import { documentTitle } from "@september/core/rules/titles";
import {
  NEW_SPACE_CONTEXT,
  NEW_SPACE_OPENERS,
  spaceNeedsSetup,
} from "@september/core/rules/spaces";

import { hasWritingService } from "@platform/services/ai";
import { askAgent, resolveAgentProposal } from "@platform/services/agent";
import {
  useAgentMessages,
  useAllMessages,
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
  useRememberMode,
  useSpaceBySlug,
} from "@september/app-ui/blocks/space";
import {
  AgentLetter,
  Transcript,
  TranscriptEmpty,
} from "@september/app-ui/blocks/agent-transcript";

export function AgentScreen({ slug }: { slug: string }) {
  const { space, spaces } = useSpaceBySlug(slug, "agent");

  if (!space) return null;
  return <Agent key={space.id} space={space} spaces={spaces} />;
}

function Agent({ space, spaces }: { space: Space; spaces: Space[] }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { data: messages, error } = useAgentMessages(space.id);
  const rows = messages ?? [];
  // A space that has still to be told what it is for. Its first turn is its
  // setup: the agent names it, describes it, and writes its first phrases.
  const needsSetup = spaceNeedsSetup(space, rows);
  // Whether the screen is *showing* that first turn, which outlasts needing
  // it: the description reaches the space before the model answers, so the
  // space stops needing setup while the turn setting it up is still running.
  // A console that changed its words under a user who is waiting on it would
  // read as though the press had gone somewhere else.
  const [settingUp, setSettingUp] = useState(false);
  const setup = needsSetup || settingUp;
  // The words the stripe reads while a space is being set up, and nothing to
  // read at all once it is: an ordinary turn keeps its prompt away from
  // speech-oriented suggestions.
  const { data: everyMessage } = useAllMessages(setup);
  const patch = useUpdateSpace();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [partial, setPartial] = useState("");
  const [problem, setProblem] = useState("");
  const [confirming, setConfirming] = useState<AgentMessage | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useRememberMode(space, "agent");

  const pending = rows.some((row) => row.tool_state === "pending");
  // A turn this screen did not start still belongs to it. The introduction
  // of a new space runs on past the screen that asked for it, so an owed
  // reply is how this one knows work is in flight.
  const working = busy || agentOwesReply(rows, Date.now());

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [rows.length, partial]);

  // This space has none of its own words yet, so the stripe reads what the
  // user has said everywhere else: the words a user writes with one person
  // help the words they write with another.
  const history = useMemo(
    () =>
      (everyMessage ?? [])
        .filter((message) => message.type === "user")
        .map((message) => message.text),
    [everyMessage],
  );

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["agent-messages", space.id] }),
      client.invalidateQueries({ queryKey: ["spaces"] }),
      client.invalidateQueries({ queryKey: ["messages", space.id] }),
      client.invalidateQueries({ queryKey: ["notes", space.id] }),
      client.invalidateQueries({ queryKey: ["phrases"] }),
    ]);
  };

  /**
   * Sends what the user wrote, and sets the space up when it is the first
   * thing said in it.
   *
   * The words become the space's description before a model reads them, so a
   * writing service that never answers still leaves a space that says what it
   * is for. The turn that follows runs under the introduction prompt: it reads
   * the space, names it, writes its description, and writes its first phrases,
   * as ordinary tool calls in this transcript. The user asked for the space,
   * and that press is the approval.
   */
  const ask = async (text: string) => {
    if (busy || pending) return;
    setBusy(true);
    setProblem("");
    setPartial("");
    try {
      if (needsSetup) {
        setSettingUp(true);
        await patch.mutateAsync({ id: space.id, context: text });
      }
      await askAgent(space, text, {
        onPartial: setPartial,
        intro: needsSetup,
        // The setup turn is a chain of calls, not one, so it is given the
        // longer wait that an introduction is allowed.
        signal: needsSetup
          ? AbortSignal.timeout(INTRODUCTION_WAIT_MS)
          : undefined,
      });
      setDraft("");
    } catch (reason) {
      setProblem(reason instanceof Error ? reason.message : String(reason));
    } finally {
      await refresh();
      setPartial("");
      setSettingUp(false);
      setBusy(false);
    }
  };

  /**
   * Puts an opener in the field.
   *
   * It starts the first sentence, and after that it starts the next one, so a
   * user who has said who they speak to can press again to say what about.
   */
  const addOpener = (opener: string) =>
    setDraft((current) =>
      current.trim() ? `${current.trim()} ${opener}` : opener,
    );

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
            {/* A turn in flight is drawn even before its first row is
                stored: the transcript is where this screen says it is
                working, and a first turn that drew nothing would look like a
                press that went nowhere for as long as the model took. */}
            {rows.length === 0 && !working && !partial ? (
              setup ? (
                // A space nobody has said anything about yet asks the one
                // question that fills it. The openers stop mid-sentence, so a
                // press costs nothing and the words that follow are the
                // user's.
                <TranscriptEmpty
                  icon={<MessagesSquare className="size-6" aria-hidden />}
                  title="What is this space for?"
                  openers={NEW_SPACE_OPENERS}
                  onOpener={addOpener}
                >
                  Your words tell September what this space is for. Talk reads
                  them for every suggestion and every phrase.
                </TranscriptEmpty>
              ) : (
                <TranscriptEmpty
                  icon={<AgentLetter className="text-xl" />}
                  title="What shall we change?"
                  openers={AGENT_OPENERS}
                  onOpener={addOpener}
                >
                  The agent reads this space on its own, and changes it when
                  you ask. Only deleting waits for your approval.
                </TranscriptEmpty>
              )
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
                Connect AI Assistance before asking the agent.
              </p>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => navigate({ to: "/settings/writing" })}
              >
                Open AI Assistance settings
              </Button>
            </div>
          ) : null}

          {/* Setting a space up is writing a description, and the stripe is
              what makes that cheap: this space has no words of its own yet, so
              it reads the words the user has written everywhere else. An
              ordinary turn keeps its prompt away from speech suggestions. */}
          <Composer
            mode={setup ? "setup" : "agent"}
            spaceId={space.id}
            context={setup ? NEW_SPACE_CONTEXT : (space.context ?? "")}
            draft={draft}
            onDraft={setDraft}
            onAction={(text) => void ask(text)}
            onPin={() => undefined}
            pending={working || pending || !hasWritingService()}
            history={setup ? history : undefined}
            suggestions={setup}
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
