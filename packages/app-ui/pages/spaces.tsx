import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Check,
  Circle,
  Loader2,
  MessagesSquare,
  Minus,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
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
import { Input } from "@september/ui/components/input";
import { Skeleton } from "@september/ui/components/skeleton";
import { navFor } from "@platform/rules/app-nav";
import {
  useAllMessages,
  useCreateSpace,
  useDeleteSpace,
  useSpaces,
  useUpdateSpace,
  type Space,
} from "@platform/services/data";
import { describeSpace, hasWritingService } from "@platform/services/ai";
import { seedPhrases } from "@platform/services/phrase-sync";
import { appendToNote } from "@september/core/rules/notes";
import { newSpaceDraft, rememberDraft } from "@platform/services/os";
import { Screen, ScreenHeader } from "@september/app-ui/blocks/screen";
import { documentTitle } from "@september/core/rules/titles";
import {
  createSteps,
  filterSpaces,
  freeTitle,
  isAutoTitle,
  MODEL_WAIT_MS,
  newSpaceTitle,
  NEW_SPACE_CONTEXT,
  NEW_SPACE_OPENERS,
  timeAgo,
  type CreateProgress,
  type StepState,
} from "@september/core/rules/spaces";

import { Composer, Problem, openParams, talkParams } from "@september/app-ui/blocks/space";
// -------------------------------------------------------------- new space

/**
 * One model call that the screen will not wait on for ever.
 *
 * A user who cannot press a second time must never be held by a service that
 * hangs, so the call is given up when it takes too long, and again when the
 * user leaves the screen.
 */
async function callWithin<T>(
  work: (signal: AbortSignal) => Promise<T>,
  parent: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const stop = () => controller.abort();
  const timer = setTimeout(stop, MODEL_WAIT_MS);
  parent.addEventListener("abort", stop);

  try {
    return await work(controller.signal);
  } finally {
    clearTimeout(timer);
    parent.removeEventListener("abort", stop);
  }
}

/** Why a model step did not land, in words the screen can show. */
function whyStopped(reason: unknown): string {
  if (reason instanceof Error && reason.name === "AbortError") {
    return "Took too long — you can add this later";
  }
  return reason instanceof Error ? reason.message : "Did not answer";
}

const MARKS: Record<StepState, { icon: typeof Check; className: string }> = {
  waiting: { icon: Circle, className: "text-muted-foreground/40" },
  running: { icon: Loader2, className: "text-primary animate-spin" },
  done: { icon: Check, className: "text-primary" },
  skipped: { icon: Minus, className: "text-muted-foreground/60" },
  failed: { icon: TriangleAlert, className: "text-destructive" },
};

/**
 * The three writes of a new space, while they run.
 *
 * The work is on the screen in words, and the region is read out as each step
 * changes. A label inside the button that the press had just made unavailable
 * said one thing at a time and was never announced at all.
 */
function Steps({ progress }: { progress: CreateProgress }) {
  return (
    <ol
      role="status"
      aria-live="polite"
      className="mx-auto flex w-full max-w-sm flex-col gap-3"
    >
      {createSteps(progress).map((step) => {
        const mark = MARKS[step.state];
        const Icon = mark.icon;

        return (
          <li key={step.id} className="flex items-start gap-3">
            <Icon className={`mt-0.5 size-5 shrink-0 ${mark.className}`} aria-hidden />
            <span className="min-w-0">
              <span
                className={`block text-sm font-medium ${
                  step.state === "waiting" ? "text-muted-foreground" : ""
                }`}
              >
                {step.label}
              </span>
              {step.note ? (
                <span className="text-muted-foreground block text-xs">
                  {step.note}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The screen that a new space starts on.
 *
 * A space is not made until the user says what it is for. The words become
 * the note of the space. A model reads them for the title, and a second model
 * writes the first phrases from them.
 *
 * The space opens only after every write lands. A stripe that filled a moment
 * later would move under the hand of a user who was already reaching for it.
 *
 * A user who has nothing to say yet presses Skip. That space takes the
 * made-up title, and waits for no model.
 */
export function NewSpaceScreen() {
  const navigate = useNavigate();
  const { data: spaces, isPending } = useSpaces();
  const { data: everyMessage } = useAllMessages();
  const client = useQueryClient();
  const createSpace = useCreateSpace();
  const patch = useUpdateSpace();

  const [words, setWords] = useState(newSpaceDraft);
  // How far the run has reached, or nothing while it waits for the user.
  const [progress, setProgress] = useState<CreateProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);
  // The space this screen already made. A run that failed after the space
  // reached local storage must patch it, never make a second one beside it.
  const [made, setMade] = useState<Space | null>(null);
  // Cancel with words in the field asks before it throws them away.
  const [discarding, setDiscarding] = useState(false);
  const giveUp = useRef<AbortController | null>(null);

  const hasWriting = hasWritingService();
  const busy = progress !== null && progress.at !== "done";

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

  const open = (space: Pick<Space, "title">) => {
    // The words live on the space now, so the draft has nothing left to hold.
    void rememberDraft("");
    return navigate(talkParams(space));
  };

  /** The space, made once. A retry patches the space the first try made. */
  const create = async () => {
    if (made) return made;

    const space = await createSpace.mutateAsync(
      newSpaceTitle((spaces ?? []).map((one) => one.title)),
    );
    setMade(space);
    return space;
  };

  const held = (reason: unknown) => {
    setError(reason instanceof Error ? reason : new Error(String(reason)));
    setProgress(null);
  };

  const skip = async () => {
    setError(null);
    // Skip waits for no model, so both model steps read as skipped.
    setProgress({ at: "space", hasWriting: false });
    try {
      return open(await create());
    } catch (reason) {
      return held(reason);
    }
  };

  const make = async (said: string) => {
    setError(null);
    const controller = new AbortController();
    giveUp.current = controller;
    setProgress({ at: "space", hasWriting });

    try {
      const space = await create();

      // The words of the user reach local storage before any model answers, so a
      // service that hangs cannot lose them.
      await patch.mutateAsync({ id: space.id, context: said });
      if (controller.signal.aborted) return open(space);

      setProgress({ at: "models", hasWriting });

      // Both calls read the words of the user, so neither waits on the
      // other. The phrase writer does not need the note that the title model
      // produces: `decidePhraseSync` already treats a note with no messages
      // as enough to write from. The user waits for the slower call, not for
      // the sum of the two.
      const [named, seeded] = await Promise.allSettled([
        hasWriting
          ? callWithin(
              (signal) => describeSpace(said, { signal }),
              controller.signal,
            )
          : Promise.resolve(null),
        hasWriting
          ? callWithin(
              (signal) =>
                seedPhrases({ ...space, context: said }, { signal }),
              controller.signal,
            )
          : Promise.resolve(undefined),
      ]);

      // A model that did not answer is a note beside its step, not an error:
      // the space is already made and the words are already saved.
      const failed: CreateProgress["failed"] = {};
      if (named.status === "rejected") failed.name = whyStopped(named.reason);
      if (seeded.status === "rejected") {
        failed.phrases = whyStopped(seeded.reason);
      }

      const answer = named.status === "fulfilled" ? named.value : null;

      // The note of the model goes under the words of the user, after a
      // blank line. The words of the user stay at the top, and nothing
      // writes over them.
      const context = answer?.context
        ? appendToNote(said, answer.context)
        : said;

      // A title that another space already holds would send this address to
      // that space, so the made-up name stays instead.
      const renamed =
        answer?.title && isAutoTitle(space.title)
          ? freeTitle(
              answer.title,
              (spaces ?? [])
                .filter((one) => one.id !== space.id)
                .map((one) => one.title),
            )
          : null;
      const title = renamed ?? space.title;

      if (context !== said || title !== space.title) {
        await patch.mutateAsync({ id: space.id, context, title });
      }

      // `seedPhrases` writes through `call`, so these caches still hold the
      // rows from before it ran. Talk reads the count from the space, and
      // would seed the space a second time while that count reads empty.
      await Promise.all([
        client.invalidateQueries({ queryKey: ["phrases"] }),
        client.invalidateQueries({ queryKey: ["spaces"] }),
      ]);

      setProgress({ at: "done", hasWriting, failed });
      return open({ ...space, title });
    } catch (reason) {
      return held(reason);
    } finally {
      giveUp.current = null;
    }
  };

  /**
   * Leaves, at any moment.
   *
   * The words are in local storage before the first model runs, so a space that
   * exists has lost nothing and simply opens.
   */
  const cancel = () => {
    giveUp.current?.abort();
    if (made) return open(made);
    if (words.trim()) return setDiscarding(true);
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

          <div className="flex min-h-0 flex-1 flex-col justify-center gap-6 overflow-y-auto py-4">
            {progress ? (
              <>
                <Steps progress={progress} />
                <div className="flex items-center justify-center gap-2">
                  <Button type="button" variant="ghost" onClick={cancel}>
                    Cancel
                  </Button>
                  {made ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => open(made)}
                    >
                      Open the space anyway
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
                  <MessagesSquare className="size-6" aria-hidden />
                </div>
                <h2 className="text-title font-semibold">
                  What is this space for?
                </h2>
                <p className="text-muted-foreground max-w-md text-sm">
                  Your words tell September what this space is for. Talk reads
                  them for every suggestion and every phrase.
                </p>
                {/* A way in, above the way out. The row stays while the
                    question does, so a press never unmounts the button that
                    was pressed and drops the focus to the body. */}
                <div className="flex flex-wrap justify-center gap-2">
                  {NEW_SPACE_OPENERS.map((opener) => (
                    <button
                      key={opener}
                      type="button"
                      onClick={() => addOpener(opener)}
                      className="border-primary/30 bg-card text-foreground hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-ring flex h-11 items-center gap-1.5 rounded-full border px-5 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {opener.trim()}
                      <span className="text-muted-foreground" aria-hidden>
                        …
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={skip}
                    aria-disabled={isPending}
                    className="aria-disabled:opacity-50"
                  >
                    Skip for now
                  </Button>
                  <Button type="button" variant="ghost" onClick={cancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
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


// ------------------------------------------------------------- space list

export function SpacesScreen() {
  const navigate = useNavigate();
  const { data: spaces, isPending, error } = useSpaces();

  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<Space | null>(null);

  const shown = useMemo(
    () => filterSpaces(spaces ?? [], search),
    [spaces, search],
  );

  // A space is not made until the user says what it is for.
  const add = () => navigate({ to: "/spaces/new" });

  const newSpaceButton = (
    <Button type="button" onClick={add}>
      <Plus aria-hidden />
      New space
    </Button>
  );

  return (
    <Screen
      title="Spaces"
      description={navFor("/spaces").description}
      action={spaces?.length ? newSpaceButton : undefined}
    >
      {error ? <Problem error={error} /> : null}

      {isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}

      {spaces?.length ? (
        <div className="relative">
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            value={search}
            aria-label="Search spaces"
            placeholder="Search your spaces…"
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
      ) : null}

      {spaces && spaces.length === 0 ? (
        <Empty
          title="No spaces yet"
          body="A space keeps the words you use with one person or in one place."
          action={
            <Button type="button" onClick={add}>
              <Plus aria-hidden />
              Create your first space
            </Button>
          }
        />
      ) : null}

      {spaces?.length && shown.length === 0 ? (
        <Empty title="No spaces found" body="No title holds those words." />
      ) : null}

      {shown.length ? (
        <ul className="flex flex-col divide-y rounded-xl border">
          {shown.map((space) => (
            <li key={space.id} className="flex items-center gap-2 px-2">
              <button
                type="button"
                onClick={() => navigate(openParams(space))}
                className="hover:text-primary focus-visible:ring-ring min-w-0 flex-1 rounded-md px-2 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="block truncate text-base font-medium">
                  {space.title}
                </span>
                <span className="text-muted-foreground text-sm">
                  Last message {timeAgo(space.updated_at)}
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${space.title}`}
                className="text-destructive hover:text-destructive"
                onClick={() => setToDelete(space)}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <DeleteSpaceDialog space={toDelete} onClose={() => setToDelete(null)} />
    </Screen>
  );
}

function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-10 text-center">
      <MessagesSquare className="text-muted-foreground size-8" aria-hidden />
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-muted-foreground text-sm">{body}</p>
      </div>
      {action}
    </div>
  );
}

/** Deleting a space deletes its messages too, so the user says yes first. */
function DeleteSpaceDialog({
  space,
  onClose,
}: {
  space: Space | null;
  onClose: () => void;
}) {
  const deleteSpace = useDeleteSpace();

  return (
    <AlertDialog open={Boolean(space)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {space?.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the space and every message in it. You cannot undo
            this.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteSpace.isPending}>
            Keep it
          </AlertDialogCancel>
          <AlertDialogAction
            // The button that erases the messages must not look like the
            // button that keeps them.
            variant="destructive"
            disabled={deleteSpace.isPending}
            onClick={(event) => {
              event.preventDefault();
              if (space) deleteSpace.mutate(space.id, { onSuccess: onClose });
            }}
          >
            {deleteSpace.isPending ? "Deleting…" : "Delete space"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
