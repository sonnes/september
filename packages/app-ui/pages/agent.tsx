import { useEffect, useMemo, useReducer, useRef, useState } from "react";
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
  agentOwesReply,
  INTRODUCTION_WAIT_MS,
  replyOwedUntil,
} from "@september/core/rules/agent/introduction";
import { AGENT_OPENERS, agentProposalIsDelete } from "@september/core/rules/agent/transcript";
import type { AgentMessage, Space } from "@september/core/rules/records";
import { documentTitle } from "@september/core/rules/titles";
import {
  NEW_SPACE_CONTEXT,
  NEW_SPACE_OPENERS,
  spaceNeedsSetup,
} from "@september/core/rules/spaces";

import { hasWritingService } from "@september/app-ui/services/ai";
import { askAgent, resolveAgentProposal } from "@september/app-ui/services/agent";
import {
  useAgentMessages,
  useAllMessages,
  useRefreshAgentSpace,
  useUpdateSpace,
} from "@september/app-ui/services/data";
import type { ComposerHandle } from "@september/app-ui/blocks/chrome";
import { RightPanel, ScreenHeader } from "@september/app-ui/blocks/screen";
import { PanelRail } from "@september/app-ui/blocks/space-panel";
import { Composer } from "@september/app-ui/blocks/composer";
import { Problem } from "@september/app-ui/blocks/states";
import { SpaceDock } from "@september/app-ui/blocks/space-dock";
import { agentEnabled, spaceParams, useRememberMode, useSpaceBySlug } from "@september/app-ui/blocks/space-routes";
import { SpaceTitle } from "@september/app-ui/blocks/space-title";
import {
  AgentLetter,
  Transcript,
  TranscriptEmpty,
} from "@september/app-ui/blocks/agent-transcript";

export function AgentScreen({ slug }: { slug: string }) {
  const { space, spaces } = useSpaceBySlug(slug, "agent");
  const navigate = useNavigate();
  // An address saved before the user turned the agent off opens Talk.
  const off = !agentEnabled();

  useEffect(() => {
    if (off && space) void navigate({ ...spaceParams(space, "talk"), replace: true });
  }, [off, space, navigate]);

  if (!space || off) return null;
  return <Agent key={space.id} space={space} spaces={spaces} />;
}

function Agent({ space, spaces }: { space: Space; spaces: Space[] }) {
  const navigate = useNavigate();
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
  const composer = useRef<ComposerHandle | null>(null);
  useRememberMode(space, "agent");

  const pending = rows.some((row) => row.tool_state === "pending");
  // A turn this screen did not start still belongs to it. The introduction
  // of a new space runs on past the screen that asked for it, so an owed
  // reply is how this one knows work is in flight.
  const working = busy || agentOwesReply(rows, Date.now());
  const owedUntil = replyOwedUntil(rows);
  const [, wake] = useReducer((count: number) => count + 1, 0);
  // The screen draws again when the wait ends, so it stops saying a reply is coming.
  useEffect(() => {
    const wait = owedUntil === null ? 0 : owedUntil - Date.now();
    if (wait <= 0) return;
    const timer = setTimeout(wake, wait);
    return () => clearTimeout(timer);
  }, [owedUntil]);

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

  const refresh = useRefreshAgentSpace(space.id);

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
      <ScreenHeader heading={`${space.title} · Agent`}>
        <SpaceTitle space={space} mode="agent" />
      </ScreenHeader>

      <div className="@container flex min-h-0 flex-1 flex-col gap-3 p-2 md:p-4">
        {/* The same order as Talk: the conversation and the stripes give way
            first, and the column scrolls last, so the field and the dock are
            never under other content. */}
        <div className="mx-auto flex min-h-0 w-full max-w-[calc(48rem+0.75rem)] flex-1 flex-col gap-2.5 overflow-y-auto px-1.5 pb-1">
          {error ? <Problem error={error} /> : null}
          {problem ? (
            <p
              role="alert"
              className="text-destructive rounded-xl border p-3 text-sm"
            >
              {problem}
            </p>
          ) : null}

          <div className="flex min-h-32 flex-1 flex-col gap-3 overflow-y-auto py-4">
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
            <div className="border-border bg-muted/40 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
              <p className="text-sm">
                Connect AI Assistance before asking the agent.
              </p>
              <Button
                type="button"
                variant="outline"
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
            handle={composer}
          />
        </div>

        <SpaceDock
          current={space}
          spaces={spaces}
          mode="agent"
        />
      </div>

      <RightPanel>
        <PanelRail
          spaceId={space.id}
          onInsert={(text) => composer.current?.insert(text)}
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
