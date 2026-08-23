import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";

import { Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mic,
  Play,
  Plus,
  Square,
  Trash2,
  Upload,
  Volume2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { PickList } from "@/blocks/pick-list";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import { navFor } from "@/rules/app-nav";
import {
  listVoices,
  readConnections,
  saveSpeech,
  type Voice,
} from "@/services/os";
import { play } from "@/services/player";
import {
  cloneVoice,
  keepCreatedVoice,
  MediaRecorderManager,
  recentCreatedVoice,
  recordingFile,
  rememberCreatedVoice,
  SamplePlayer,
  validateVoiceClone,
  type CreatedVoice,
  type RecordingStatus,
} from "@/services/cloning";
import { Screen } from "@/blocks/screen";
import {
  speak,
  speechSettings,
  type VoiceService,
} from "@/services/speech";

const TRY_IT = "This is how I sound today.";

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

/** A voice made a moment ago, before ElevenLabs lists it. */
function optimisticCreatedVoice(): Voice | null {
  const created = recentCreatedVoice();
  return created ? { ...created, preview_url: null } : null;
}

/**
 * The voice screen: which voice speaks, and making one of your own.
 *
 * The service, the model, and the sliders moved into the Voice tab of the
 * rail beside a space, where a change is heard next to the sentence being
 * written. The voices stayed here: an account holds a hundred of them, each
 * one worth hearing before it is chosen, and that list wants a whole screen.
 */
export function VoiceScreen() {
  const [provider, setProvider] = useState(() => speechSettings().provider);
  const [voiceId, setVoiceId] = useState(() => speechSettings().voiceId ?? "");
  const [voices, setVoices] = useState<Voice[] | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const cloud = provider === "elevenlabs";

  useEffect(() => {
    void readConnections()
      .then((connections) => setConnected(connections.elevenlabs.connected))
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    if (!cloud || !connected) return;

    void listVoices()
      .then((fresh) =>
        setVoices(keepCreatedVoice(fresh, optimisticCreatedVoice())),
      )
      .catch(() => setVoices(keepCreatedVoice([], optimisticCreatedVoice())));
  }, [cloud, connected]);

  // One field of the setting changes at a time. The rest comes from the
  // store, so a slider moved in the rail card is not written back over.
  const chooseService = (next: VoiceService) => {
    setProvider(next);
    void saveSpeech({ ...speechSettings(), provider: next });
  };

  const chooseVoice = (next: string) => {
    setVoiceId(next);
    void saveSpeech({ ...speechSettings(), voiceId: next });
  };

  return (
    <Screen
      title="Voice"
      description={navFor("/voice").description}
      action={
        <Button type="button" onClick={() => void speak(TRY_IT)}>
          <Volume2 aria-hidden />
          Try it
        </Button>
      }
    >
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Who speaks</h2>
        <RadioGroup
          value={provider}
          onValueChange={(value) => chooseService(value as VoiceService)}
          className="grid gap-2"
        >
          <ServiceChoice
            value="system"
            title="This Mac"
            body="The voice of the operating system. It needs no account."
          />
          <ServiceChoice
            value="elevenlabs"
            title="ElevenLabs"
            body="Natural voices from a cloud service. It needs your key."
          />
        </RadioGroup>

        {cloud && connected === false ? (
          <p className="text-muted-foreground text-sm">
            No ElevenLabs key is stored, so this Mac speaks instead.{" "}
            <Link to="/settings" className="text-primary underline">
              Add a key in Settings
            </Link>
            .
          </p>
        ) : null}
      </section>

      {cloud && connected ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Which voice</h2>
          {voices === null ? (
            <Skeleton className="h-24 w-full" />
          ) : voices.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No voices came back from ElevenLabs.
            </p>
          ) : (
            <PickList
              rows={voices}
              value={voiceId}
              onPick={chooseVoice}
              label="Search voices"
              // The button stays in every row, so it always reads as part of
              // the voice on its left.
              after={(voice) => (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Hear ${voice.name}`}
                  disabled={!voice.preview_url}
                  // The sample is public, so it needs no key and no speech
                  // call.
                  onClick={() => void play(voice.preview_url!)}
                >
                  <Play aria-hidden />
                </Button>
              )}
            />
          )}
        </section>
      ) : cloud ? null : (
        <p className="text-muted-foreground text-sm">
          This Mac has one voice, so there is nothing to choose here.
        </p>
      )}

      <Link
        to="/voice/clone"
        className="focus-visible:ring-ring hover:bg-accent flex min-h-16 w-full items-center gap-3 rounded-surface border border-dashed border-primary/50 bg-primary/5 px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="text-primary flex size-11 shrink-0 items-center justify-center rounded-control border bg-background">
          <Mic className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Clone your voice</span>
          <span className="text-muted-foreground block text-sm">
            Record or upload a few samples to make a personal voice.
          </span>
        </span>
        <span className="text-primary flex shrink-0 items-center gap-2 text-sm font-semibold">
          <Plus className="size-4" aria-hidden />
          Clone
        </span>
      </Link>

      <p className="text-muted-foreground text-sm">
        The model and the sound are in the Voice tab of the rail beside a
        space, so a change is heard next to the sentence you are writing.{" "}
        <Link to="/spaces" className="text-primary underline">
          Open a space
        </Link>
        .
      </p>
    </Screen>
  );
}

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

function useVoiceCloneDraft(): VoiceCloneDraft {
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

export function VoiceCloneScreen() {
  const navigate = useNavigate();
  const [connected, setConnected] = useState<boolean | null>(null);
  const draft = useVoiceCloneDraft();

  useEffect(() => {
    void readConnections()
      .then((connections) =>
        setConnected(connections.elevenlabs.connected),
      )
      .catch(() => setConnected(false));
  }, []);

  const handleCreated = async (created: CreatedVoice) => {
    rememberCreatedVoice(created);
    await saveSpeech({
      ...speechSettings(),
      provider: "elevenlabs",
      voiceId: created.id,
    });
    await navigate({ to: "/voice", replace: true });
  };

  return (
    <Screen
      title="Clone your voice"
      description="Add clear samples with only your voice. September sends them to ElevenLabs when you create the voice."
      action={
        <Button asChild variant="outline" className="h-11">
          <Link to="/voice">
            <ChevronLeft aria-hidden />
            Back to Voice
          </Link>
        </Button>
      }
    >
      <VoiceCloneForm
        connected={connected}
        draft={draft}
        onCreated={handleCreated}
      />
    </Screen>
  );
}

function VoiceCloneForm({
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
        <div className="rounded-control border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Add an ElevenLabs key before you create a voice.{" "}
          <Link
            to="/settings/connections/$provider"
            params={{ provider: "elevenlabs" }}
            className="font-semibold underline"
          >
            Open ElevenLabs settings
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
        <div
          role="tablist"
          aria-label="Voice sample source"
          className="grid grid-cols-2 gap-2"
        >
          <Button
            type="button"
            role="tab"
            aria-selected={draft.mode === "upload"}
            variant={draft.mode === "upload" ? "default" : "outline"}
            className="h-11"
            onClick={() => {
              draft.pause();
              draft.setMode("upload");
            }}
          >
            <Upload aria-hidden />
            Upload audio
          </Button>
          <Button
            type="button"
            role="tab"
            aria-selected={draft.mode === "record"}
            variant={draft.mode === "record" ? "default" : "outline"}
            className="h-11"
            onClick={() => draft.setMode("record")}
          >
            <Mic aria-hidden />
            Record now
          </Button>
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
            Clear speech, one speaker, up to 25 MB per file and 100 MB total.
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
                <span className="text-primary flex items-center gap-1 text-xs font-medium">
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

function ServiceChoice({
  value,
  title,
  body,
}: {
  value: VoiceService;
  title: string;
  body: string;
}) {
  return (
    <Label
      htmlFor={value}
      className="hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-xl border p-4"
    >
      <RadioGroupItem id={value} value={value} className="mt-1" />
      <span className="space-y-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="text-muted-foreground block text-sm">{body}</span>
      </span>
    </Label>
  );
}
