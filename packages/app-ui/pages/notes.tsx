import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, FileText, Plus } from "lucide-react";
import { Button } from "@september/ui/components/button";
import { useCreateNote, useDeleteNote, useNotes, usePinPhrase } from "@september/app-ui/services/data";
import type { Note, Space } from "@september/core/rules/records";
import { noteFromSlug } from "@september/core/rules/notes";
import type { NoteDocumentHandle } from "@september/app-ui/blocks/note-document";
import { PanelRail } from "@september/app-ui/blocks/space-panel";
import { RightPanel, ScreenHeader } from "@september/app-ui/blocks/screen";
import { documentTitle } from "@september/core/rules/titles";
import { SpaceDock } from "@september/app-ui/blocks/space-dock";
import { noteParams, spaceParams, useRememberMode, useSpaceBySlug } from "@september/app-ui/blocks/space-routes";
import { EmptyState, Problem } from "@september/app-ui/blocks/states";
import { SpaceTitle } from "@september/app-ui/blocks/space-title";
import { NoteEditor, SpaceAbout } from "@september/app-ui/blocks/note-editor";
import { NoteReadingBar } from "@september/app-ui/blocks/note-reading-bar";
import { DeleteNoteDialog, NoteList } from "@september/app-ui/blocks/note-list";

export function NotesScreen({
  slug,
  noteSlug: wanted,
}: {
  slug: string;
  noteSlug?: string;
}) {
  const { space, spaces } = useSpaceBySlug(slug, "notes");

  if (!space) return null;

  return <Notes key={space.id} space={space} spaces={spaces} wanted={wanted} />;
}

function Notes({
  space,
  spaces,
  wanted,
}: {
  space: Space;
  spaces: Space[];
  wanted?: string;
}) {
  const navigate = useNavigate();
  const { data: notes, error } = useNotes(space.id);
  const create = useCreateNote(space.id);
  const handle = useRef<NoteDocumentHandle | null>(null);
  const [tools, setTools] = useState(false);
  // On a narrow screen, the list and the note take turns. The note comes
  // first, because a user who writes one note at a time needs no extra press.
  const [pane, setPane] = useState<"list" | "note">("note");
  // The About tab is state, not an address. Give it an address when a user
  // asks to open the app on it.
  //
  // A space with no note of its own opens here, because a space reaches that
  // state by being skipped, and About is the one thing it still needs. An
  // address that names a note wins, so a deep link is never taken over.
  const [about, setAbout] = useState(!wanted && !space.context?.trim());
  useRememberMode(space, "notes");
  const remove = useDeleteNote(space.id);

  const rows = notes ?? [];
  // The address names the note. Without a name in it, the newest note opens,
  // because `note_list` gives the most recently changed row first.
  const note = about ? undefined : wanted ? noteFromSlug(wanted, rows) : rows[0];
  const [toDelete, setToDelete] = useState<Note | null>(null);

  const open = (row: Note) => {
    setAbout(false);
    setPane("note");
    return navigate(noteParams(space, row.name));
  };

  const add = () => create.mutateAsync().then(open);

  const keep = usePinPhrase(space.id);

  return (
    <>
      <title>
        {note
          ? documentTitle(note.name, space.title)
          : documentTitle(space.title, "Notes")}
      </title>
      <ScreenHeader
        heading={note ? `${note.name} · ${space.title}` : `${space.title} · Notes`}
      >
        <SpaceTitle space={space} mode="notes" />
      </ScreenHeader>

      <DeleteNoteDialog
        note={toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() =>
          remove
            .mutateAsync(toDelete!.id)
            .then(() =>
              navigate({ ...spaceParams(space, "notes"), replace: true }),
            )
            .finally(() => setToDelete(null))
        }
      />

      <div className="@container flex min-h-0 flex-1 flex-col gap-3 p-2 md:p-4">
        {/* From 52rem the list is a column beside the note. Below it, one
            of the two fills the screen. */}
        <div data-pane={pane} className="group/notes flex min-h-0 flex-1 gap-4">
          <NoteList
            space={space}
            notes={rows}
            current={note}
            about={about}
            onAbout={() => {
              setAbout(true);
              setPane("note");
            }}
            onOpen={open}
            onCreate={add}
            isCreating={create.isPending}
            className="@max-[52rem]:flex-1 @max-[52rem]:group-data-[pane=note]/notes:hidden @min-[52rem]:w-72 @min-[52rem]:shrink-0 @min-[52rem]:border-r @min-[52rem]:pr-4"
          />
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col @max-[52rem]:group-data-[pane=list]/notes:hidden">
            <div className="shrink-0 @min-[52rem]:hidden">
              <button
                type="button"
                onClick={() => setPane("list")}
                className="focus-attention text-brand hover:bg-primary/10 inline-flex min-h-12 items-center gap-1 rounded-full pr-4 pl-2 text-sm font-semibold"
              >
                <ChevronLeft className="size-5" aria-hidden />
                All notes
              </button>
            </div>
            {error ? <Problem error={error} /> : null}

            {about ? (
              <SpaceAbout key={space.id} space={space} onPin={keep} handle={handle} onTools={setTools} />
            ) : note ? (
              <NoteEditor
                key={note.id}
                note={note}
                spaceId={space.id}
                context={space.context ?? ""}
                onPin={keep}
                handle={handle}
                onTools={setTools}
                onRenamed={(name) => navigate({ ...noteParams(space, name), replace: true })}
              />
            ) : (
              <EmptyState
                icon={FileText}
                body="A note holds long text. Write it now, and hear it in your voice when you are ready."
                action={
                  <Button type="button" size="lg" onClick={add} disabled={create.isPending}>
                    <Plus aria-hidden />
                    New note
                  </Button>
                }
              />
            )}

            {/* The bar steps away while the writing tools are open, so one
                floating panel is on the page at a time. */}
            {note && !about && !tools ? (
              <NoteReadingBar
                note={note}
                handle={handle}
                onDelete={() => setToDelete(note)}
              />
            ) : null}
          </div>
        </div>

        <SpaceDock
          current={space}
          spaces={spaces}
          mode="notes"
        />
      </div>

      <RightPanel>
        <PanelRail
          spaceId={space.id}
          onInsert={(text) => handle.current?.insert(text)}
        />
      </RightPanel>
    </>
  );
}
