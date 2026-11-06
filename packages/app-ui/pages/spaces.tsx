import { useId, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MessagesSquare, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@september/ui/components/button";
import { Input } from "@september/ui/components/input";
import { Label } from "@september/ui/components/label";
import { Skeleton } from "@september/ui/components/skeleton";
import { navFor } from "@september/core/rules/navigation";
import { useSpaces } from "@september/app-ui/services/data";
import type { Space } from "@september/core/rules/records";
import { Screen } from "@september/app-ui/blocks/screen";
import { filterSpaces, timeAgo } from "@september/core/rules/spaces";

import { EmptyState, Problem } from "@september/app-ui/blocks/states";
import { DeleteSpaceDialog } from "@september/app-ui/blocks/delete-space-dialog";
import { openParams, useNewSpace } from "@september/app-ui/blocks/space-routes";

// ------------------------------------------------------------- space list

export function SpacesScreen() {
  const navigate = useNavigate();
  const { data: spaces, isPending, error } = useSpaces();

  const [search, setSearch] = useState("");
  const searchId = useId();
  const [toDelete, setToDelete] = useState<Space | null>(null);
  // The space exists from the press, and the press opens it.
  const newSpace = useNewSpace();

  const shown = useMemo(
    () => filterSpaces(spaces ?? [], search),
    [spaces, search],
  );

  const add = newSpace.create;

  const newSpaceButton = (
    <Button
      type="button"
      onClick={add}
      aria-disabled={newSpace.pending}
    >
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
      {newSpace.error ? <Problem error={newSpace.error} /> : null}

      {isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}

      {spaces?.length ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={searchId}>Search spaces</Label>
          <div className="relative">
            <Search
              aria-hidden
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              id={searchId}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      ) : null}

      {spaces && spaces.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No spaces yet"
          body="A space keeps the words you use with one person or in one place."
          action={
            <Button
              type="button"
              onClick={add}
              aria-disabled={newSpace.pending}
            >
              <Plus aria-hidden />
              Create your first space
            </Button>
          }
        />
      ) : null}

      {spaces?.length && shown.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="No spaces found" body="No title holds those words." />
      ) : null}

      {shown.length ? (
        <ul className="flex flex-col divide-y rounded-xl border">
          {shown.map((space) => (
            <li key={space.id} className="flex items-center gap-2 px-2">
              <button
                type="button"
                onClick={() => navigate(openParams(space))}
                className="focus-attention hover:text-brand min-h-14 min-w-0 flex-1 rounded-md px-2 py-3 text-left transition-colors"
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
