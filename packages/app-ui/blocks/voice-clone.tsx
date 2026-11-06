import { type ChangeEvent, type DragEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronLeft, ChevronRight, Mic, Play, Square, Trash2, Upload } from "lucide-react";
import { Button } from "@september/ui/components/button";
import { ChoiceKey } from "@september/app-ui/blocks/pick-list";
import { Input } from "@september/ui/components/input";
import { Label } from "@september/ui/components/label";
import { Textarea } from "@september/ui/components/textarea";
import { cloneVoice, type CreatedVoice, MediaRecorderManager, recordingFile, type RecordingStatus, SamplePlayer } from "@september/app-ui/services/cloning";
import { CLONE_LIMITS_TEXT, validateVoiceClone } from "@september/core/rules/voice-clone";

const SAMPLE_TEXTS = [
  { id: "birch-canoe", text: "The birch canoe slid on the smooth planks." },
  { id: "glue-sheet", text: "Glue the sheet to the dark blue background." },
  { id: "chicken-leg", text: "These days a chicken leg is a rare dish." },
  { id: "lemon-juice", text: "The juice of lemons makes fine punch." },
  { id: "salt-breeze", text: "The salt breeze came across from the sea." },
  { id: "beauty-view", text: "The beauty of the view stunned the young boy." },
  { id: "pearl-ring", text: "The pearl was worn in a thin silver ring." },
  { id: "fruit-peel", text: "The fruit peel was cut in thick slices." },
  { id: "pound-sugar", text: "A pound of sugar costs more than eggs." },
  { id: "oak-shade", text: "Oak is strong and also gives shade." },
] as const;

type CloneMode = "upload" | "record";

interface VoiceCloneDraft {
  mode: CloneMode;
  setMode: (mode: CloneMode) => void;
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  uploaded: File[];
  recordings: Record<string, File>;
  recordingStatus: Record<string, RecordingStatus>;
  recordingErrors: Record<string, string | null>;
  uploadError: string | null;
  submitError: string | null;
  submitting: boolean;
  playingId: string | null;
  hasSamples: boolean;
  recording: boolean;
  addUploads: (files: File[]) => void;
  removeUpload: (file: File) => void;
  startRecording: (id: string) => void;
  stopRecording: (id: string) => void;
  removeRecording: (id: string) => void;
  playRecording: (id: string) => void;
  stopPlaying: () => void;
  pause: () => void;
  submit: (
    onCreated: (created: CreatedVoice) => void | Promise<void>,
  ) => Promise<void>;
}

export function useVoiceCloneDraft(): VoiceCloneDraft {
  const [mode, setMode] = useState<CloneMode>("upload");
  const [name, setNameState] = useState("");
  const [description, setDescriptionState] = useState("");
  const [uploaded, setUploaded] = useState<File[]>([]);
  const [recordings, setRecordings] = useState<Record<string, File>>({});
  const [recordingStatus, setRecordingStatus] = useState<
    Record<string, RecordingStatus>
  >({});
  const [recordingErrors, setRecordingErrors] = useState<
    Record<string, string | null>
  >({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorderManager | null>(null);
  if (!recorderRef.current) recorderRef.current = new MediaRecorderManager();
  const recorder = recorderRef.current;

  const playerRef = useRef<SamplePlayer | null>(null);
  if (!playerRef.current) {
    playerRef.current = new SamplePlayer(() => setPlayingId(null));
  }
  const player = playerRef.current;

  useEffect(() => {
    recorder.setCallbacks({
      onComplete: (id, blob) => {
        setRecordings((current) => ({
          ...current,
          [id]: recordingFile(id, blob),
        }));
        setRecordingErrors((current) => ({ ...current, [id]: null }));
      },
      onStatus: (id, status) =>
        setRecordingStatus((current) => ({ ...current, [id]: status })),
      onError: (id, message) =>
        setRecordingErrors((current) => ({ ...current, [id]: message })),
    });

    return () => {
      recorder.dispose();
      player.dispose();
    };
  }, [player, recorder]);

  const setName = (value: string) => {
    setNameState(value);
    setSubmitError(null);
  };
  const setDescription = (value: string) => {
    setDescriptionState(value);
    setSubmitError(null);
  };

  const addUploads = (files: File[]) => {
    for (const file of files) {
      const problem = validateVoiceClone({ files: [file], name: "Voice" });
      if (problem) {
        setUploadError(problem);
        return;
      }
    }

    setUploadError(null);
    setSubmitError(null);
    setUploaded((current) => {
      const next = [...current];
      for (const file of files) {
        if (
          !next.some(
            (saved) =>
              saved.name === file.name &&
              saved.size === file.size &&
              saved.lastModified === file.lastModified,
          )
        ) {
          next.push(file);
        }
      }
      return next;
    });
  };

  const removeUpload = (file: File) => {
    setUploaded((current) => current.filter((saved) => saved !== file));
    setSubmitError(null);
  };

  const startRecording = (id: string) => {
    player.stop();
    setRecordingErrors((current) => ({ ...current, [id]: null }));
    setSubmitError(null);
    void recorder.start(id);
  };

  const stopRecording = (id: string) => recorder.stop(id);

  const removeRecording = (id: string) => {
    if (playingId === id) player.stop();
    setRecordings((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setSubmitError(null);
  };

  const playRecording = (id: string) => {
    const file = recordings[id];
    if (!file) return;
    setRecordingErrors((current) => ({ ...current, [id]: null }));
    void player
      .play(id, file)
      .then((playing) => setPlayingId(playing ? id : null))
      .catch((reason) =>
        setRecordingErrors((current) => ({
          ...current,
          [id]: reason instanceof Error ? reason.message : "Could not play this sample.",
        })),
      );
  };

  const stopPlaying = () => player.stop();
  const pause = () => {
    recorder.stopAll();
    player.stop();
  };

  const submit = async (
    onCreated: (created: CreatedVoice) => void | Promise<void>,
  ) => {
    const files = [...uploaded, ...Object.values(recordings)];
    const problem = validateVoiceClone({ files, name });
    if (problem) {
      setSubmitError(problem);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await cloneVoice({ files, name, description });
      await onCreated(created);
      player.stop();
      setUploaded([]);
      setRecordings({});
      setRecordingStatus({});
      setRecordingErrors({});
      setNameState("");
      setDescriptionState("");
      setMode("upload");
    } catch (reason) {
      setSubmitError(
        reason instanceof Error ? reason.message : "Could not create this voice.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return {
    mode,
    setMode,
    name,
    setName,
    description,
    setDescription,
    uploaded,
    recordings,
    recordingStatus,
    recordingErrors,
    uploadError,
    submitError,
    submitting,
    playingId,
    hasSamples: uploaded.length > 0 || Object.keys(recordings).length > 0,
    recording: Object.values(recordingStatus).includes("recording"),
    addUploads,
    removeUpload,
    startRecording,
    stopRecording,
    removeRecording,
    playRecording,
    stopPlaying,
    pause,
    submit,
  };
}

export function VoiceCloneForm({
  connected,
  draft,
  onCreated,
}: {
  connected: boolean | null;
  draft: VoiceCloneDraft;
  onCreated: (created: CreatedVoice) => void | Promise<void>;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void draft.submit(onCreated);
  };

  return (
    <form onSubmit={submit} className="space-y-6 pb-12">
      {connected === false ? (
        <div className="rounded-control border border-input bg-muted text-foreground p-4 text-sm">
          Add an ElevenLabs key before you create a voice.{" "}
          <Link
            to="/settings/connections/$provider"
            params={{ provider: "elevenlabs" }}
            className="font-semibold underline"
          >
            Open ElevenLabs in Settings
          </Link>
          .
        </div>
      ) : null}

      <section className="space-y-4 rounded-surface border bg-card p-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Voice samples</h2>
          <p className="text-muted-foreground text-sm">
            Use an existing recording, record the prompts, or do both.
          </p>
        </div>
        {/* A choice of two, not tabs: the section under it changes in place. */}
        <div
          role="radiogroup"
          aria-label="Voice sample source"
          className="grid grid-cols-2 gap-2"
        >
          <ChoiceKey
            value="upload"
            checked={draft.mode === "upload"}
            tabbable={draft.mode === "upload"}
            onChoose={() => {
              draft.pause();
              draft.setMode("upload");
            }}
            className="text-sm font-medium"
          >
            <Upload className="size-4" aria-hidden />
            Upload audio
          </ChoiceKey>
          <ChoiceKey
            value="record"
            checked={draft.mode === "record"}
            tabbable={draft.mode === "record"}
            onChoose={() => draft.setMode("record")}
            className="text-sm font-medium"
          >
            <Mic className="size-4" aria-hidden />
            Record now
          </ChoiceKey>
        </div>

        {draft.mode === "upload" ? (
          <UploadSamples draft={draft} />
        ) : (
          <RecordSamples draft={draft} />
        )}
      </section>

      <section className="space-y-4 rounded-surface border bg-card p-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Voice details</h2>
          <p className="text-muted-foreground text-sm">
            Name the voice so you can find it in your list.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="clone-name">Name</Label>
          <Input
            id="clone-name"
            value={draft.name}
            onChange={(event) => draft.setName(event.target.value)}
            placeholder="My voice"
            className="h-11"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clone-description">Description</Label>
          <Textarea
            id="clone-description"
            value={draft.description}
            onChange={(event) => draft.setDescription(event.target.value)}
            placeholder="Calm, clear, and warm"
            rows={3}
          />
        </div>
      </section>

      {draft.submitError ? (
        <p
          role="alert"
          className="text-destructive rounded-control border border-destructive/30 p-4 text-sm"
        >
          {draft.submitError}
        </p>
      ) : null}

      <Button
        type="submit"
        className="h-11 w-full"
        disabled={
          connected !== true ||
          !draft.hasSamples ||
          draft.recording ||
          draft.submitting
        }
      >
        {connected === null
          ? "Checking ElevenLabs…"
          : connected === false
            ? "Add an ElevenLabs key first"
            : draft.recording
              ? "Stop recording first"
              : draft.submitting
                ? "Creating voice…"
                : "Create voice"}
      </Button>
      <p className="text-muted-foreground text-center text-xs" aria-live="polite">
        {draft.submitting
          ? "Your samples are being sent to ElevenLabs. Keep September open."
          : "Your samples stay in this screen until the voice is created."}
      </p>
    </form>
  );
}

function UploadSamples({ draft }: { draft: VoiceCloneDraft }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const addFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    draft.addUploads(Array.from(event.target.files ?? []));
    if (inputRef.current) inputRef.current.value = "";
  };
  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    draft.addUploads(Array.from(event.dataTransfer.files));
  };

  return (
    <div
      role="tabpanel"
      className="space-y-3 rounded-control border border-dashed p-4"
      onDragOver={(event) => event.preventDefault()}
      onDrop={drop}
    >
      <div className="flex flex-col items-center gap-3 py-3 text-center">
        <Upload className="text-muted-foreground size-8" aria-hidden />
        <div>
          <p className="text-sm font-medium">Choose audio or drop it here</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Clear speech, one speaker, {CLONE_LIMITS_TEXT}.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => inputRef.current?.click()}
        >
          Choose audio
        </Button>
        <input
          ref={inputRef}
          id="voice-sample-upload"
          aria-label="Audio files"
          type="file"
          accept="audio/*"
          multiple
          className="sr-only"
          onChange={addFromInput}
        />
      </div>

      {draft.uploadError ? (
        <p role="alert" className="text-destructive text-sm">
          {draft.uploadError}
        </p>
      ) : null}

      {draft.uploaded.length > 0 ? (
        <ul className="space-y-2">
          {draft.uploaded.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}-${index}`}
              className="bg-muted flex min-h-11 items-center gap-3 rounded-control px-3"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label={`Remove ${file.name}`}
                onClick={() => draft.removeUpload(file)}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function RecordSamples({ draft }: { draft: VoiceCloneDraft }) {
  const [index, setIndex] = useState(0);
  const sample = SAMPLE_TEXTS[index];
  const recorded = draft.recordings[sample.id];
  const status = draft.recordingStatus[sample.id] ?? "idle";
  const playing = draft.playingId === sample.id;

  const move = (next: number) => {
    draft.pause();
    setIndex((next + SAMPLE_TEXTS.length) % SAMPLE_TEXTS.length);
  };

  return (
    <div role="tabpanel" className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Read clearly in your usual voice. A quiet room gives the best result.
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0 rounded-full"
          aria-label="Previous sample"
          onClick={() => move(index - 1)}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <div className="min-w-0 flex-1 rounded-control border bg-muted/50 p-4">
          <p className="text-sm font-medium">{sample.text}</p>
          <div className="mt-3 flex min-h-11 items-center gap-2">
            {status === "recording" ? (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => draft.stopRecording(sample.id)}
              >
                <Square aria-hidden />
                Stop
              </Button>
            ) : recorded ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() =>
                    playing
                      ? draft.stopPlaying()
                      : draft.playRecording(sample.id)
                  }
                >
                  {playing ? <Square aria-hidden /> : <Play aria-hidden />}
                  {playing ? "Stop" : "Hear"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label="Delete this recording"
                  onClick={() => draft.removeRecording(sample.id)}
                >
                  <Trash2 aria-hidden />
                </Button>
                <span className="text-brand flex items-center gap-1 text-xs font-medium">
                  <CheckCircle2 className="size-4" aria-hidden />
                  Recorded
                </span>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => draft.startRecording(sample.id)}
              >
                <Mic aria-hidden />
                Record
              </Button>
            )}
          </div>
          {draft.recordingErrors[sample.id] ? (
            <p role="alert" className="text-destructive mt-2 text-sm">
              {draft.recordingErrors[sample.id]}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0 rounded-full"
          aria-label="Next sample"
          onClick={() => move(index + 1)}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
      <p className="text-muted-foreground text-center text-xs" aria-live="polite">
        Sample {index + 1} of {SAMPLE_TEXTS.length} ·{" "}
        {Object.keys(draft.recordings).length} recorded
      </p>
    </div>
  );
}
