import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { useNavigate } from "@tanstack/react-router";
import { Button } from "@september/ui/components/button";
import { Input } from "@september/ui/components/input";
import { Label } from "@september/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@september/ui/components/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@september/ui/components/select";
import { Textarea } from "@september/ui/components/textarea";

import { useDraft } from "@september/app-ui/layouts/onboarding";
import {
  nextStep,
  previousStep,
  SETUP_MODES,
  SPEAKING_STYLES,
  stepFor,
  VOICE_SERVICES,
  WELCOME_POINTS,
  WRITING_SERVICES,
  type SetupMode,
  type StepPath,
} from "@platform/rules/onboarding";
import {
  BLANK_CONNECTIONS,
  forgetProvider,
  listVoices,
  readConnections,
  saveSpeech,
  saveSetup,
  type Connections,
  type Provider,
  type ProviderStatus,
  type Voice,
} from "@platform/services/os";
import {
  CloudStatus,
  KeyPanel,
  Mark,
  ModeCard,
  Status,
} from "@september/app-ui/blocks/services";
import { speechSettings } from "@platform/services/speech";
import { documentTitle } from "@september/core/rules/titles";

// DESIGN.md asks for a 44px target on primary actions; `lg` is 40px.
// Below `sm` it takes the whole row, which is the widest target available.
const ACTION = "h-11 w-full px-6 font-semibold sm:w-auto";

function Step({
  path,
  children,
  footer,
}: {
  path: StepPath;
  children: ReactNode;
  footer: ReactNode;
}) {
  const navigate = useNavigate();
  const { draft } = useDraft();
  const step = stepFor(path);
  const back = previousStep(path, draft);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-6">
      {/* The step indicator's short label, not the heading, which is a
          sentence and does not fit a tab. */}
      <title>{documentTitle(step.label, "Setup")}</title>
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl leading-tight font-bold md:text-3xl lg:text-4xl">
            {step.title}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-500 md:text-base">
            {step.subtitle}
          </p>
        </div>
        {back && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            title="Go back"
            onClick={() => navigate({ to: back })}
            aria-label="Go back"
            className="h-11 shrink-0 px-3 sm:px-4"
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">Back</span>
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>

      <div className="flex shrink-0 flex-col gap-4 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
        <p className="text-xs text-zinc-500">{step.helper}</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          {footer}
        </div>
      </div>
    </div>
  );
}

export function WelcomeStep() {
  const navigate = useNavigate();
  const { draft } = useDraft();

  return (
    <Step
      path="/welcome"
      footer={
        <Button
          type="button"
          size="lg"
          className={ACTION}
          onClick={() => navigate({ to: nextStep("/welcome", draft)! })}
        >
          {stepFor("/welcome").action}
        </Button>
      }
    >
      {/* ml-3 keeps the hanging markers clear of the scroll body, which clips. */}
      <ol className="ml-3 space-y-4 border-l border-zinc-200 pl-5">
        {WELCOME_POINTS.map((point, index) => (
          <li key={point.title} className="relative">
            <span className="absolute -left-[1.8125rem] top-0 flex size-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-indigo-600 ring-1 ring-zinc-200">
              {index + 1}
            </span>
            <div className="max-w-xl">
              <h3 className="text-base font-semibold">{point.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                {point.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Step>
  );
}

export function ProfileStep() {
  const navigate = useNavigate();
  const { draft, setDraft } = useDraft();
  const [name, setName] = useState(draft.name);
  const [speakingStyle, setSpeakingStyle] = useState(draft.speakingStyle);
  const [personalWords, setPersonalWords] = useState(draft.personalWords);
  const selected = SPEAKING_STYLES.find(
    (option) => option.value === speakingStyle,
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setDraft((current) => ({
      ...current,
      name: name.trim(),
      speakingStyle,
      personalWords,
    }));
    navigate({ to: nextStep("/profile", draft)! });
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <Step
        path="/profile"
        footer={
          <Button
            type="submit"
            size="lg"
            className={ACTION}
            disabled={!name.trim()}
          >
            {stepFor("/profile").action}
          </Button>
        }
      >
        <div className="space-y-6">
          <Field
            title="Name"
            description="Used in September's profile on this device."
            htmlFor="onboarding-name"
          >
            <Input
              id="onboarding-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
              className="h-11"
            />
          </Field>

          <Field
            title="Speaking style"
            description="Choose a style or write a brief note about how you speak."
            htmlFor="onboarding-speaking-style"
          >
            <div className="flex flex-wrap gap-2">
              {SPEAKING_STYLES.map((option) => (
                <Button
                  key={option.label}
                  type="button"
                  variant={
                    speakingStyle === option.value ? "default" : "outline"
                  }
                  aria-pressed={speakingStyle === option.value}
                  onClick={() => setSpeakingStyle(option.value)}
                  className="h-11 rounded-full px-4"
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">
              {selected?.description ?? "Edit the note below any time."}
            </p>
            <Textarea
              id="onboarding-speaking-style"
              value={speakingStyle}
              onChange={(event) => setSpeakingStyle(event.target.value)}
              rows={4}
              maxLength={1000}
              className="leading-relaxed"
            />
          </Field>

          <Field
            title="Personal words"
            description="Optional. Names, care phrases, routines, or topics September should know."
            htmlFor="onboarding-personal-words"
          >
            <Textarea
              id="onboarding-personal-words"
              value={personalWords}
              onChange={(event) => setPersonalWords(event.target.value)}
              rows={4}
              maxLength={5000}
              placeholder="Amma. Dr. Shah. I need a short rest. Please give me a moment."
              className="leading-relaxed"
            />
          </Field>
        </div>
      </Step>
    </form>
  );
}

function Field({
  title,
  description,
  htmlFor,
  children,
}: {
  title: string;
  description: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-5 border-l border-zinc-200 pl-4 sm:pl-5 lg:grid-cols-[15rem_1fr] lg:gap-8">
      <div>
        <Label htmlFor={htmlFor} className="text-sm font-semibold">
          {title}
        </Label>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function ModeStep() {
  const navigate = useNavigate();
  const { draft, setDraft } = useDraft();

  function choose(mode: SetupMode) {
    setDraft((current) => ({ ...current, mode }));
  }

  return (
    <Step
      path="/mode"
      footer={
        <Button
          type="button"
          size="lg"
          className={ACTION}
          disabled={!draft.mode}
          onClick={() => navigate({ to: nextStep("/mode", draft)! })}
        >
          {stepFor("/mode").action}
        </Button>
      }
    >
      <fieldset className="grid gap-4 lg:grid-cols-2">
        <legend className="sr-only">Setup mode</legend>
        {SETUP_MODES.map((option) => (
          <ModeCard
            key={option.id}
            option={option}
            selected={draft.mode === option.id}
            onChoose={() => choose(option.id)}
          />
        ))}
      </fieldset>
    </Step>
  );
}

export function FinishStep() {
  const { draft } = useDraft();
  const navigate = useNavigate();
  const mode = SETUP_MODES.find((option) => option.id === draft.mode);
  const style = SPEAKING_STYLES.find(
    (option) => option.value === draft.speakingStyle,
  );

  return (
    <Step
      path="/finish"
      footer={
        <Button
          type="button"
          size="lg"
          className={ACTION}
          onClick={() => {
            saveSetup(draft).then(() => navigate({ to: "/dashboard" }));
          }}
        >
          {stepFor("/finish").action}
        </Button>
      }
    >
      <div className="grid gap-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4 sm:grid-cols-[auto_1fr] sm:p-8">
        <span
          aria-hidden="true"
          className="grid size-11 place-items-center rounded-full bg-indigo-600 text-xl text-white sm:size-13 sm:text-2xl"
        >
          ✓
        </span>
        <div>
          <p className="text-xs font-bold text-indigo-600">Your setup</p>
          <h3 className="mt-1 text-base font-semibold">{mode?.title}</h3>
          <dl className="mt-5 grid gap-3">
            <SummaryRow label="Name" value={draft.name} />
            <SummaryRow
              label="Speaking style"
              value={style?.label ?? "Custom"}
            />
            <SummaryRow label="Services" value="Connect later in Settings" />
          </dl>
        </div>
      </div>
    </Step>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}

// ------------------------------------------------------------- connect step

export function ConnectStep() {
  const navigate = useNavigate();
  const { draft, setDraft } = useDraft();
  const [connections, setConnections] =
    useState<Connections>(BLANK_CONNECTIONS);
  const [checking, setChecking] = useState(true);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState("");

  useEffect(() => {
    let live = true;

    readConnections().then((found) => {
      if (!live) return;
      setConnections(found);
      setChecking(false);
      // The step answers itself, so a supported Mac needs no action.
      setDraft((current) => ({
        ...current,
        defaultModel: {
          ...current.defaultModel,
          service:
            current.defaultModel.service !== "none"
              ? current.defaultModel.service
              : found.apple.available
                ? "apple"
                : found.openrouter.connected
                  ? "openrouter"
                  : "none",
        },
        voiceService: found.elevenlabs.connected
          ? "elevenlabs"
          : current.voiceService,
      }));
    });

    return () => {
      live = false;
    };
  }, [setDraft]);

  const hasVoiceKey = connections.elevenlabs.connected;

  useEffect(() => {
    if (!hasVoiceKey) {
      setVoices([]);
      return;
    }
    let live = true;
    listVoices()
      .then((found) => live && setVoices(found))
      .catch(() => live && setVoices([]));
    return () => {
      live = false;
    };
  }, [hasVoiceKey]);

  useEffect(() => {
    if (!voiceId && voices.length > 0) setVoiceId(voices[0].id);
  }, [voiceId, voices]);

  function replace(status: ProviderStatus) {
    setConnections((current) => ({ ...current, [status.provider]: status }));
  }

  function forget(provider: Provider) {
    forgetProvider(provider).then(() =>
      replace({ provider, connected: false, label: null, detail: null }),
    );
  }

  function submit() {
    // `/voice` owns the voice, in the `speech` setting. Setup seeds it, so the
    // voice chosen here is the voice that speaks the first message.
    void saveSpeech({
      ...speechSettings(),
      provider: draft.voiceService,
      voiceId: draft.voiceService === "elevenlabs" ? voiceId || null : null,
    });
    navigate({ to: nextStep("/connect", draft)! });
  }

  const chosenVoice = voices.find((voice) => voice.id === voiceId);

  return (
    <Step
      path="/connect"
      footer={
        <Button type="button" size="lg" className={ACTION} onClick={submit}>
          {stepFor("/connect").action}
        </Button>
      }
    >
      <div className="space-y-6">
        <Section
          title="Writing help"
          description="September suggests words and finishes sentences while you type."
        >
          <RadioGroup
            aria-label="Writing help"
            className="gap-3"
            value={draft.defaultModel.service}
            onValueChange={(value) =>
              setDraft((current) => ({
                ...current,
                defaultModel: {
                  ...current.defaultModel,
                  service: value as typeof current.defaultModel.service,
                },
              }))
            }
          >
            {WRITING_SERVICES.filter(
              // A Mac that cannot run it never shows a control it must disable.
              (option) =>
                option.value !== "apple" || connections.apple.supported,
            ).map((option) => (
              <Choice
                key={option.value}
                value={option.value}
                label={option.label}
                description={option.description}
                selected={draft.defaultModel.service === option.value}
                disabled={
                  option.value === "apple" && !connections.apple.available
                }
                badge={
                  option.value === "apple" ? (
                    <Status
                      tone={connections.apple.available ? "ready" : "warn"}
                      text={
                        connections.apple.available
                          ? "Ready"
                          : "Turn it on in System Settings"
                      }
                    />
                  ) : option.value === "openrouter" ? (
                    <CloudStatus
                      checking={checking}
                      status={connections.openrouter}
                    />
                  ) : null
                }
              >
                {option.value === "apple" && !connections.apple.available
                  ? connections.apple.reason && (
                      <p className="text-xs leading-relaxed text-amber-700">
                        {connections.apple.reason}
                      </p>
                    )
                  : null}
                {option.value === "openrouter" && (
                  <KeyPanel
                    provider="openrouter"
                    name="OpenRouter"
                    status={connections.openrouter}
                    onConnected={replace}
                    onForget={forget}
                  />
                )}
              </Choice>
            ))}
          </RadioGroup>
        </Section>

        <Section
          title="Voice"
          description="The voice that speaks your messages out loud."
        >
          <RadioGroup
            aria-label="Voice"
            className="gap-3"
            value={draft.voiceService}
            onValueChange={(value) =>
              setDraft((current) => ({
                ...current,
                voiceService: value as typeof current.voiceService,
              }))
            }
          >
            {VOICE_SERVICES.map((option) => (
              <Choice
                key={option.value}
                value={option.value}
                label={option.label}
                description={option.description}
                selected={draft.voiceService === option.value}
                badge={
                  option.value === "system" ? (
                    <Status tone="ready" text="Ready" />
                  ) : (
                    <CloudStatus
                      checking={checking}
                      status={connections.elevenlabs}
                    />
                  )
                }
              >
                {option.value === "elevenlabs" && (
                  <>
                    <KeyPanel
                      provider="elevenlabs"
                      name="ElevenLabs"
                      status={connections.elevenlabs}
                      onConnected={replace}
                      onForget={forget}
                    />
                    {voices.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Select value={voiceId} onValueChange={setVoiceId}>
                          <SelectTrigger
                            aria-label="Voice"
                            className="h-11 w-full flex-1 sm:min-w-64"
                          >
                            <SelectValue placeholder="Pick a voice" />
                          </SelectTrigger>
                          <SelectContent>
                            {voices.map((voice) => (
                              <SelectItem key={voice.id} value={voice.id}>
                                {voice.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {chosenVoice?.preview_url && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 px-4"
                            // ponytail: the voice list carries a public sample,
                            // so a preview needs no key and no speech call.
                            onClick={() =>
                              void new Audio(chosenVoice.preview_url!).play()
                            }
                          >
                            ▶ Hear it
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </Choice>
            ))}
          </RadioGroup>
        </Section>
      </div>
    </Step>
  );
}

/** The Field layout without a Label: a radio group names itself instead. */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-5 border-l border-zinc-200 pl-4 sm:pl-5 lg:grid-cols-[15rem_1fr] lg:gap-8">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/**
 * One service inside a job.
 *
 * Selection changes the border and nothing else. The panel below belongs to
 * the state of the service, not to the choice, so the card keeps its height
 * and no choice below it moves down the page.
 */
function Choice({
  value,
  label,
  description,
  selected,
  disabled,
  badge,
  children,
}: {
  value: string;
  label: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className={`grid gap-4 rounded-xl border p-4 ${
        selected
          ? "border-indigo-600 ring-[3px] ring-indigo-500/30"
          : "border-zinc-200"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <label className="grid cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] sm:gap-4">
        <RadioGroupItem value={value} disabled={disabled} className="size-5" />
        <Mark service={value} />
        <span>
          <span className="text-sm font-semibold">{label}</span>
          <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
            {description}
          </span>
        </span>
        {/* The status has no column of its own on a phone, so it drops to the
            next row under the name instead of squeezing the description. */}
        {badge && (
          <span className="col-start-3 sm:col-start-4 sm:justify-self-end">
            {badge}
          </span>
        )}
      </label>
      {/* The indent lines the panel up with the service name. A phone has no
          70px to spare, so the panel starts at the edge of the card. */}
      <div className="grid gap-3 pl-0 empty:hidden sm:pl-[4.75rem]">
        {children}
      </div>
    </div>
  );
}
