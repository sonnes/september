import { useId, useState } from "react";
import { Info, Plus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@september/ui/components/alert-dialog";
import { cn } from "@september/ui";
import { Button } from "@september/ui/components/button";
import { Input } from "@september/ui/components/input";
import { Label } from "@september/ui/components/label";
import type { Note, Space } from "@september/core/rules/records";
import { UNTITLED_NOTE } from "@september/core/rules/notes";
import { messageTime } from "@september/core/rules/spaces";
import { notePreview } from "@september/core/rules/note-document";
import { matchesWords } from "@september/core/rules/pick";

/** A list this long gets a search field. */
const SEARCH_FROM = 5;

/**
 * The notes of a space, as a list of large rows.
 *
 * About comes first, because it decides the words that every other screen
 * offers. Each note shows its name, its first line of words, and the time of
 * its last change, so a name is never the only clue. The list is a column
 * beside the note on a wide screen, and the whole screen on a narrow one.
 */
export function NoteList({
  space,
  notes,
  current,
  about,
  onAbout,
  onOpen,
  onCreate,
  isCreating,
  className,
}: {
  space: Space;
  notes: Note[];
  current?: Note;
  about: boolean;
  onAbout: () => void;
  onOpen: (note: Note) => void;
  onCreate: () => void;
  isCreating: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const words = query.trim();
  const shown = words
    ? notes.filter((one) => matchesWords(`${one.name ?? ""}\n${one.content}`, words))
    : notes;

  const row = (selected: boolean) =>
    cn(
      "focus-attention flex min-h-14 w-full flex-col justify-center gap-0.5 rounded-control px-3 py-2 text-left transition-colors",
      selected ? "bg-primary/10 ring-brand ring-1" : "hover:bg-accent",
    );

  return (
    <nav aria-label="Notes" className={cn("flex min-h-0 min-w-0 flex-col gap-2", className)}>
      <div className="flex shrink-0 items-center gap-2 px-1">
        <h2 className="text-base font-semibold">Notes</h2>
        <Button
          type="button"
          size="lg"
          className="ml-auto rounded-full"
          aria-disabled={isCreating}
          onClick={() => !isCreating && onCreate()}
        >
          <Plus aria-hidden />
          New note
        </Button>
      </div>

      {notes.length >= SEARCH_FROM ? (
        <div className="flex shrink-0 flex-col gap-1.5">
          <Label htmlFor={searchId}>Search notes</Label>
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      ) : null}

      <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto">
        {words ? null : (
          <li>
            <button
              type="button"
              data-note-row
              aria-current={about ? "page" : undefined}
              onClick={onAbout}
              className={row(about)}
            >
              <span className="text-brand flex items-center gap-2 font-semibold">
                <Info className="size-4 shrink-0" aria-hidden />
                About this space
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {notePreview(space.context ?? "", "") || "Who you speak to here, and why"}
              </span>
            </button>
          </li>
        )}
        {shown.map((one) => {
          const selected = !about && one.id === current?.id;
          return (
            <li key={one.id}>
              <button
                type="button"
                data-note-row
                aria-current={selected ? "page" : undefined}
                onClick={() => onOpen(one)}
                className={row(selected)}
              >
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {one.name || UNTITLED_NOTE}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {messageTime(one.updated_at)}
                  </span>
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {notePreview(one.content, one.name) || "Empty note"}
                </span>
              </button>
            </li>
          );
        })}
        {words && shown.length === 0 ? (
          <li className="text-muted-foreground px-3 py-4 text-sm">No note has these words.</li>
        ) : null}
      </ul>
    </nav>
  );
}

export function DeleteNoteDialog({
  note,
  onClose,
  onConfirm,
}: {
  note: Note | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={note !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete &ldquo;{note?.name || UNTITLED_NOTE}&rdquo;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the note and its words. You cannot undo this.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Keep it</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90 text-white"
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
