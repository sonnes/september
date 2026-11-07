import { type MutableRefObject, useEffect, useState } from "react";
import { Download, Ellipsis, FileText, Film, Loader2, PenLine, Play, Square, Trash2, Volume2 } from "lucide-react";
import { cn } from "@september/ui";
import { Button } from "@september/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@september/ui/components/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@september/ui/components/dropdown-menu";
import { Progress } from "@september/ui/components/progress";
import type { Note } from "@september/core/rules/records";
import { markdownToVoiceText, UNTITLED_NOTE } from "@september/core/rules/notes";
import type { NoteDocumentHandle } from "@september/app-ui/blocks/note-document";
import { PresentOverlay } from "@september/app-ui/blocks/present";
import { EXPORT_ARTIFACTS, type ExportKind } from "@september/core/rules/present/export";
import { PRESENT_TONES, type PresentToneKey } from "@september/core/rules/present/stage";
import { exportUnavailable, saveNoteAudio, saveNoteText, saveNoteVideo } from "@september/app-ui/services/export";
import type { VideoStage } from "@september/app-ui/platform";
import { present, useSetting } from "@september/app-ui/services/settings";
import { speak, stopSpeaking, useSpeaking, useVoiceFallback } from "@september/app-ui/services/speech";
import { ariaShortcut, keyLabel, KEYMAP } from "@september/core/rules/keymap";

/**
 * What a note can do, beside its own words, in a bar at the foot of the page.
 *
 * Read aloud reads the selected words, or the whole note when nothing is
 * selected. Present gives the note the whole screen for the person in the
 * room. Suggestions opens the writing tools without a typed key. Export and
 * Delete are in the More menu, because they are used less often, and Delete
 * is last because it is the one action that cannot be undone.
 */
export function NoteReadingBar({
  note,
  handle,
  onDelete,
}: {
  note: Note;
  handle: MutableRefObject<NoteDocumentHandle | null>;
  onDelete: () => void;
}) {
  const speaking = useSpeaking();
  const notice = useVoiceFallback();
  const [presenting, setPresenting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [part, setPart] = useState(false);
  const id = `note-${note.id}`;
  const busy = speaking === id;
  const words = note.content.trim().length > 0;

  // The label says what a press reads: the selection, or the whole note.
  useEffect(() => {
    const onSelection = () => setPart(Boolean(handle.current?.selection().trim()));
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, [handle]);

  const read = () => {
    if (busy) return stopSpeaking();
    const chosen = handle.current?.selection().trim();
    const text = markdownToVoiceText(chosen || handle.current?.text() || note.content);
    if (text) void speak(text, id);
  };

  const bar =
    "focus-attention key-disabled inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold @max-[36rem]:px-3.5 transition-colors [&_svg]:size-[18px]";

  return (
    <>
      <div
        role="toolbar"
        aria-label="Note actions"
        // A press keeps the selection in the note, so Read selection reads it.
        onMouseDown={(event) => event.preventDefault()}
        className="bg-background/95 absolute inset-x-0 bottom-4 z-10 mx-auto flex w-fit max-w-[calc(100%-1rem)] items-center gap-1.5 overflow-x-auto rounded-full border p-1.5 shadow-lg backdrop-blur [scrollbar-width:none]"
      >
        <button
          type="button"
          aria-disabled={!words && !part}
          onClick={read}
          className={cn(bar, busy ? "bg-foreground text-background" : "bg-primary text-primary-foreground")}
        >
          {busy ? <Square aria-hidden /> : <Volume2 aria-hidden />}
          {busy ? "Stop" : part ? "Read selection" : "Read aloud"}
        </button>
        <button
          type="button"
          aria-label="Present this note"
          aria-disabled={!words}
          onClick={() => words && setPresenting(true)}
          className={cn(bar, "hover:bg-accent")}
        >
          <Play aria-hidden />
          <span className="@max-[36rem]:sr-only">Present</span>
        </button>
        {/* The name is the word on the key. The shortcut is in
            `aria-keyshortcuts`, so a screen reader does not read the glyph. */}
        <button
          type="button"
          aria-keyshortcuts={ariaShortcut(KEYMAP.tools)}
          onClick={() => handle.current?.openTools()}
          className={cn(bar, "hover:bg-accent")}
        >
          <PenLine aria-hidden />
          <span className="@max-[36rem]:sr-only">Suggestions</span>
          <kbd
            aria-hidden="true"
            className="bg-muted text-muted-foreground rounded px-1.5 text-xs font-medium @max-[36rem]:hidden"
          >
            {keyLabel(KEYMAP.tools)}
          </kbd>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More note actions"
              className={cn(bar, "hover:bg-accent w-12 justify-center px-0")}
            >
              <Ellipsis aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="min-w-52">
            <DropdownMenuItem
              aria-disabled={!words}
              onSelect={() => words && setExporting(true)}
              className="min-h-12 aria-disabled:opacity-50"
            >
              <Download aria-hidden />
              Export…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={onDelete}
              className="min-h-12"
            >
              <Trash2 aria-hidden />
              Delete note…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {notice ? (
        <p role="status" className="absolute inset-x-0 bottom-20 text-center text-sm">
          {notice}
        </p>
      ) : null}

      {presenting ? (
        <PresentOverlay
          name={note.name}
          content={handle.current?.text() ?? note.content}
          onClose={() => setPresenting(false)}
        />
      ) : null}

      <ExportDialog
        note={note}
        open={exporting}
        onClose={() => setExporting(false)}
      />
    </>
  );
}

const ARTIFACT_ICON: Record<ExportKind, typeof FileText> = {
  text: FileText,
  audio: Volume2,
  video: Film,
};

/** How far the film has come, and what it is doing. */
const VIDEO_STAGE: Record<VideoStage, { label: string; value: number }> = {
  voice: { label: "Generating voice", value: 25 },
  frames: { label: "Rendering slides", value: 60 },
  video: { label: "Creating video", value: 90 },
};

/**
 * The note as a file: the words, the voice, or a story film.
 *
 * A row that cannot run says why in the place of its own description, and
 * keeps its target. A row that is missing teaches the user nothing.
 */
function ExportDialog({
  note,
  open,
  onClose,
}: {
  note: Note;
  open: boolean;
  onClose: () => void;
}) {
  const { tone } = useSetting(present);
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [stage, setStage] = useState<VideoStage | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  // One tone for the stage and the film, so a note looks the same either way.
  const chooseTone = (next: PresentToneKey) => present.keep({ ...present.get(), tone: next });

  const run = (kind: ExportKind) => {
    if (busy || exportUnavailable(kind)) return;
    setFailed(null);
    setBusy(kind);

    if (kind === "text") {
      saveNoteText(note.name, note.content);
      setBusy(null);
      return;
    }

    const work =
      kind === "audio"
        ? saveNoteAudio(note.name, note.content)
        : saveNoteVideo(note.name, note.content, tone, setStage);

    void work
      .catch((reason: unknown) =>
        setFailed(reason instanceof Error ? reason.message : String(reason)),
      )
      .finally(() => {
        setBusy(null);
        setStage(null);
      });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>
            Save &ldquo;{note.name || UNTITLED_NOTE}&rdquo; as a file. It is made
            on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {EXPORT_ARTIFACTS.map((artifact) => {
            const reason = exportUnavailable(artifact.kind);
            const working = busy === artifact.kind;
            const Icon = ARTIFACT_ICON[artifact.kind];

            return (
              <div key={artifact.kind} className="rounded-surface border p-4">
                <div className="flex items-center gap-4">
                  <span className="bg-muted text-muted-foreground grid size-11 shrink-0 place-items-center rounded-full">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {artifact.name}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {reason ?? artifact.hint}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="lg"
                    variant={artifact.kind === "text" ? "default" : "outline"}
                    className="shrink-0 rounded-full"
                    aria-disabled={Boolean(reason) || busy !== null}
                    aria-label={`Save the ${artifact.name.toLowerCase()} file`}
                    onClick={() => run(artifact.kind)}
                  >
                    {working ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <Download aria-hidden />
                    )}
                    .{artifact.extension}
                  </Button>
                </div>

                {artifact.kind === "video" && !reason ? (
                  <div
                    role="group"
                    aria-label="Tone"
                    className="mt-3 flex flex-wrap items-center gap-2"
                  >
                    {PRESENT_TONES.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        aria-label={option.name}
                        aria-pressed={option.key === tone}
                        onClick={() => chooseTone(option.key)}
                        // The chosen tone has a 4px line, so the choice is not
                        // a color alone.
                        className={`focus-attention size-12 rounded-full ${
                          option.key === tone
                            ? "border-brand border-4"
                            : "border-input border-2"
                        }`}
                        style={{ backgroundColor: option.background }}
                      />
                    ))}
                  </div>
                ) : null}

                {working && stage ? (
                  <div className="mt-3 flex flex-col gap-1">
                    <Progress value={VIDEO_STAGE[stage].value} />
                    <span className="text-muted-foreground text-xs">
                      {VIDEO_STAGE[stage].label}…
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {failed ? (
          <p role="alert" className="text-destructive text-sm">
            {failed}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
