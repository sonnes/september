import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MessagesSquare, Plus, Search, Trash2 } from "lucide-react";
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
import { useDeleteSpace, useSpaces, type Space } from "@platform/services/data";
import { Screen } from "@september/app-ui/blocks/screen";
import { filterSpaces, timeAgo } from "@september/core/rules/spaces";

import { Problem, openParams } from "@september/app-ui/blocks/space";

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
