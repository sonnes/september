import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Delete,
  MessagesSquare,
  Plus,
  Search,
  Trash2,
  Undo2,
  Volume2,
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

import { navFor } from "./app-nav";
import {
  useCreateSpace,
  useDeleteSpace,
  useMessages,
  useSendMessage,
  useSpaces,
  useUpdateSpace,
  type Message,
  type Space,
} from "./data";
import { Screen, ScreenHeader } from "./shell";
import { speak } from "./speech";
import {
  deleteLastWord,
  filterSpaces,
  newSpaceTitle,
  spaceFromSlug,
  spaceSlug,
  timeAgo,
  transcriptPage,
} from "./spaces";

const talkParams = (space: Pick<Space, "title">) => ({
  to: "/spaces/$slug/talk" as const,
  params: { slug: spaceSlug(space.title) },
});

function Problem({ error }: { error: Error }) {
  return (
    <p className="text-destructive rounded-xl border border-dashed p-8 text-center text-sm">
      {error.message}
    </p>
  );
}

// ------------------------------------------------------------- space list

export function SpacesScreen() {
  const navigate = useNavigate();
  const { data: spaces, isPending, error } = useSpaces();
  const createSpace = useCreateSpace();

  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<Space | null>(null);

  const shown = useMemo(
    () => filterSpaces(spaces ?? [], search),
    [spaces, search],
  );

  const add = () =>
    createSpace
      .mutateAsync(newSpaceTitle((spaces ?? []).map((space) => space.title)))
      .then((space) => navigate(talkParams(space)));

  const newSpaceButton = (
    <Button type="button" onClick={add} disabled={createSpace.isPending}>
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
            <Button type="button" onClick={add} disabled={createSpace.isPending}>
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
                onClick={() => navigate(talkParams(space))}
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
  const send = useSendMessage(space.id);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [pageInput, setPageInput] = useState(0);

  const spoken = (messages ?? []).filter((message) => message.type === "user");
  const { page, pageCount, slice } = transcriptPage(spoken, pageInput);

  // The composer grows with its text, up to the height the class holds.
  useEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [draft]);

  // A new message goes to the newest page, so the user never sends from
  // behind an old page.
  const newest = spoken[spoken.length - 1]?.id;
  useEffect(() => setPageInput(0), [newest]);

  const write = (text: string) => {
    setUndoStack((stack) => [...stack.slice(-49), draft]);
    setDraft(text);
    inputRef.current?.focus();
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    setDraft(undoStack[undoStack.length - 1]);
    setUndoStack((stack) => stack.slice(0, -1));
    inputRef.current?.focus();
  };

  const onSpeak = () => {
    const text = draft.trim();
    if (!text) return;

    // The voice starts at once. The composer holds the text until SQLite
    // accepts the message, so a failed write loses no words.
    speak(text);
    send.mutate(text, {
      onSuccess: () => {
        setDraft("");
        setUndoStack([]);
        inputRef.current?.focus();
      },
    });
  };

  return (
    <>
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
                  Write a sentence below, then press Speak. What you say shows
                  here.
                </p>
              </div>
            ) : (
              slice.map((message) => (
                <Bubble key={message.id} message={message} />
              ))
            )}
          </div>

          <div className="bg-background focus-within:border-ring focus-within:ring-ring/20 shrink-0 rounded-2xl border p-3 shadow-sm transition-[box-shadow,border-color] focus-within:ring-[3px]">
              <textarea
              ref={inputRef}
              autoFocus
              rows={1}
              value={draft}
              aria-label="Message"
              placeholder="Write a message..."
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSpeak();
              }
              }}
              className="placeholder:text-muted-foreground/60 max-h-60 w-full resize-none overflow-y-auto bg-transparent text-xl leading-snug focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Undo"
                onClick={undo}
                disabled={undoStack.length === 0}
              >
                <Undo2 aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Delete last word"
                onClick={() => write(deleteLastWord(draft))}
                disabled={!draft}
              >
                <Delete aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Clear"
                onClick={() => write("")}
                disabled={!draft}
              >
                <Trash2 aria-hidden />
              </Button>
              </div>
              <Button
              type="button"
              size="lg"
              className="rounded-full px-6 font-semibold"
              onClick={onSpeak}
              disabled={!draft.trim() || send.isPending}
              >
              <Volume2 aria-hidden />
              Speak
              </Button>
            </div>
          </div>
        </div>

        <SpaceDock current={space} spaces={spaces} />
      </div>
    </>
  );
}

/** The name of the space. A new name changes the address of the space too. */
function SpaceTitle({ space }: { space: Space }) {
  const navigate = useNavigate();
  const update = useUpdateSpace();
  const [title, setTitle] = useState(space.title ?? "");

  useEffect(() => setTitle(space.title ?? ""), [space.id, space.title]);

  const save = () => {
    const next = title.trim();
    if (!next || next === space.title) {
      setTitle(space.title ?? "");
      return;
    }
    update.mutate(
      { ...space, title: next },
      { onSuccess: () => navigate({ ...talkParams({ title: next }), replace: true }) },
    );
  };

  return (
    <input
      value={title}
      aria-label="Space name"
      onChange={(event) => setTitle(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className="hover:bg-accent focus-visible:ring-ring min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
    />
  );
}

function Bubble({ message }: { message: Message }) {
  return (
    <div className="flex justify-end">
      <button
        type="button"
        aria-label="Speak this message again"
        onClick={() => speak(message.text)}
        className="bg-accent text-accent-foreground focus-visible:ring-ring flex max-w-[85%] items-start gap-2 rounded-2xl rounded-br-sm px-4 py-2.5 text-left transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
      >
        <Volume2 className="mt-1 size-4 shrink-0 opacity-60" aria-hidden />
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

/**
 * The bottom dock. It holds one tab for each space, and it makes a new one.
 *
 * ponytail: the row scrolls when the tabs no longer fit. The web app collapses
 * them into a menu — port that when a user keeps more spaces than fit.
 */
function SpaceDock({ current, spaces }: { current: Space; spaces: Space[] }) {
  const navigate = useNavigate();
  const createSpace = useCreateSpace();

  return (
    <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-t pt-2">
      {spaces.map((space) => (
        <button
          key={space.id}
          type="button"
          aria-current={space.id === current.id ? "page" : undefined}
          onClick={() => navigate(talkParams(space))}
          className={`focus-visible:ring-ring min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
            space.id === current.id
              ? "bg-primary text-primary-foreground border-transparent"
              : "hover:bg-accent"
          }`}
        >
          {space.title}
        </button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="New space"
        disabled={createSpace.isPending}
        onClick={() =>
          createSpace
            .mutateAsync(newSpaceTitle(spaces.map((space) => space.title)))
            .then((space) => navigate(talkParams(space)))
        }
      >
        <Plus aria-hidden />
      </Button>
    </div>
  );
}
