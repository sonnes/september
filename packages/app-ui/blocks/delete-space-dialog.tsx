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

import { useDeleteSpace } from "@september/app-ui/services/data";
import type { Space } from "@september/core/rules/records";

/** Deleting a space deletes its messages too, so the user says yes first. */
export function DeleteSpaceDialog({
  space,
  onClose,
  onDeleted,
}: {
  space: Space | null;
  onClose: () => void;
  /** Runs after the space is gone, before the dialog closes. */
  onDeleted?: () => void;
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
        {deleteSpace.error ? (
          <p role="alert" className="text-destructive text-sm">
            {deleteSpace.error.message}
          </p>
        ) : null}
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
              if (space)
                deleteSpace.mutate(space.id, {
                  onSuccess: () => {
                    onDeleted?.();
                    onClose();
                  },
                });
            }}
          >
            {deleteSpace.isPending ? "Deleting…" : "Delete space"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
