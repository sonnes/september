import {
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  MessagesSquare,
  Plus,
  Search,
  Trash2,
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { navFor } from "@/rules/app-nav";
import {
  useCreateSpace,
  useDeleteSpace,
  useSpaces,
  useUpdateSpace,
  type Space,
} from "@/services/data";
import { describeSpace } from "@/services/ai";
import { appendToNote } from "@/rules/notes";
import { Screen } from "@/blocks/screen";
import {
  filterSpaces,
  isAutoTitle,
  newSpaceTitle,
  timeAgo,
} from "@/rules/spaces";

import { Problem, openParams, talkParams } from "@/blocks/space";
// -------------------------------------------------------------- new space

/**
 * The screen that a new space starts on.
 *
 * A space is not made until the user says what it is for. The words become
 * the note of the space. A model reads them for the title, and the phrase
 * sync writes the first phrases from them, so the stripe of a new space is
 * not empty before the first message.
 *
 * A user who has nothing to say yet presses Skip, and the space opens with
 * the made-up title, as it did before.
 */
export function NewSpaceScreen() {
  const navigate = useNavigate();
  const { data: spaces } = useSpaces();
  const createSpace = useCreateSpace();
  const patch = useUpdateSpace();
  const [words, setWords] = useState("");
  const [busy, setBusy] = useState(false);

  const make = async () => {
    setBusy(true);
    try {
      const space = await createSpace.mutateAsync(
        newSpaceTitle((spaces ?? []).map((one) => one.title)),
      );

      if (!words.trim()) return navigate(talkParams(space));

      // The words of the user reach SQLite before the model answers, so a
      // service that hangs cannot lose them.
      await patch.mutateAsync({ id: space.id, context: words });

      const answer = await describeSpace(words).catch(() => null);
      if (!answer) return navigate(talkParams(space));

      // The note of the model goes under the words of the user, after a blank
      // line. The words of the user stay at the top, and nothing writes over
      // them.
      const context = answer.context
        ? appendToNote(words, answer.context)
        : undefined;
      const title =
        answer.title && isAutoTitle(space.title) ? answer.title : undefined;
      if (context || title) {
        await patch.mutateAsync({ id: space.id, context, title });
      }

      return navigate(talkParams({ ...space, title: title ?? space.title }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="New space"
      description="A space keeps the words you use with one person or in one place."
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-title font-semibold">What is this space for?</h2>
        <p className="text-muted-foreground text-sm">
          Say who you speak to here, and why. The words become the note of the
          space. Talk reads the note for every suggestion and every phrase.
        </p>
      </div>

      <textarea
        autoFocus
        rows={6}
        value={words}
        aria-label="What is this space for?"
        placeholder={
          "I speak to my sister here.\nWe talk about the garden, and about her children."
        }
        onChange={(event) => setWords(event.target.value)}
        className="placeholder:text-muted-foreground/60 focus-within:border-ring focus-within:ring-ring/20 min-h-40 resize-none rounded-2xl border bg-transparent p-4 text-xl leading-relaxed shadow-sm transition-[box-shadow,border-color] focus:outline-none focus-within:ring-[3px]"
      />

      <div className="flex items-center gap-2">
        <Button type="button" size="lg" onClick={make} disabled={busy}>
          <Plus aria-hidden />
          {busy ? "Making the space..." : "Create space"}
        </Button>
        <Button type="button" variant="ghost" onClick={make} disabled={busy}>
          Skip
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="ml-auto"
          disabled={busy}
          onClick={() => navigate({ to: "/spaces" })}
        >
          Cancel
        </Button>
      </div>
    </Screen>
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
            placeholder="Search your spaces..."
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
              Make your first space
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
            this action.
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
            {deleteSpace.isPending ? "Deleting..." : "Delete space"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
