import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { useNavigate } from "@tanstack/react-router";
import { Ban, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useDraft } from "./app";
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
} from "./onboarding";
import {
  BLANK_CONNECTIONS,
  connectProvider,
  forgetProvider,
  listVoices,
  readConnections,
  saveServices,
  saveSetup,
  type Connections,
  type Provider,
  type ProviderStatus,
  type Voice,
} from "./os";

// DESIGN.md asks for a 44px target on primary actions; `lg` is 40px.
const ACTION = "h-11 px-6 font-semibold";

const MODE_ACCENT = {
  amber: { edge: "border-t-amber-600", badge: "bg-amber-100 text-amber-700" },
  sky: { edge: "border-t-sky-600", badge: "bg-sky-100 text-sky-700" },
} as const;

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
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl leading-tight font-bold lg:text-4xl">
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
            className="h-11 shrink-0 px-4"
          >
            ← Back
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>

      <div className="flex shrink-0 flex-col gap-4 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
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
          <Button type="submit" size="lg" className={ACTION} disabled={!name.trim()}>
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
            description="A short note helps September learn how you talk."
            htmlFor="onboarding-speaking-style"
          >
            <div className="flex flex-wrap gap-2">
              {SPEAKING_STYLES.map((option) => (
                <Button
                  key={option.label}
                  type="button"
                  variant={speakingStyle === option.value ? "default" : "outline"}
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
    <div className="grid gap-5 border-l border-zinc-200 pl-5 lg:grid-cols-[15rem_1fr] lg:gap-8">
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
        {SETUP_MODES.map((option) => {
          const isSelected = draft.mode === option.id;
          const accent = MODE_ACCENT[option.accent];

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => choose(option.id)}
              className={`relative grid content-start gap-4 rounded-xl border border-t-4 bg-white p-6 text-left shadow-sm focus-visible:ring-[3px] focus-visible:ring-indigo-500/50 focus-visible:outline-none ${accent.edge} ${
                isSelected
                  ? "border-indigo-600 ring-[3px] ring-indigo-500/40"
                  : "border-zinc-200 hover:border-indigo-300"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-4 right-4 flex size-5 items-center justify-center rounded-full border text-xs ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-zinc-200"
                }`}
              >
                {isSelected ? "✓" : ""}
              </span>
              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${accent.badge}`}
              >
                {option.badge}
              </span>
              <span className="text-lg font-semibold">{option.title}</span>
              <span className="text-sm leading-relaxed text-zinc-500">
                {option.body}
              </span>
              <ul className="grid gap-3 text-sm leading-relaxed text-zinc-500">
                {option.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="grid grid-cols-[8px_minmax(0,1fr)] gap-3"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 size-2 rounded-full bg-current"
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
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
      <div className="grid gap-5 rounded-xl border border-indigo-200 bg-indigo-50 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
        <span
          aria-hidden="true"
          className="grid size-13 place-items-center rounded-full bg-indigo-600 text-2xl text-white"
        >
          ✓
        </span>
        <div>
          <p className="text-xs font-bold text-indigo-600">Your setup</p>
          <h3 className="mt-1 text-base font-semibold">{mode?.title}</h3>
          <dl className="mt-5 grid gap-3">
            <SummaryRow label="Name" value={draft.name} />
            <SummaryRow label="Speaking style" value={style?.label ?? "Custom"} />
            <SummaryRow label="Services" value="Connect later in Settings" />
          </dl>
        </div>
      </div>
    </Step>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}

// ------------------------------------------------------------- connect step

export function ConnectStep() {
  const navigate = useNavigate();
  const { draft, setDraft } = useDraft();
  const [connections, setConnections] = useState<Connections>(BLANK_CONNECTIONS);
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
        writingService:
          current.writingService !== "none"
            ? current.writingService
            : found.apple.available
              ? "apple"
              : found.openrouter.connected
                ? "openrouter"
                : "none",
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
    saveServices({
      writing: draft.writingService,
      voice: draft.voiceService,
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
            value={draft.writingService}
            onValueChange={(value) =>
              setDraft((current) => ({
                ...current,
                writingService: value as typeof current.writingService,
              }))
            }
          >
            {WRITING_SERVICES.filter(
              // A Mac that cannot run it never shows a control it must disable.
              (option) => option.value !== "apple" || connections.apple.supported,
            ).map((option) => (
              <Choice
                key={option.value}
                value={option.value}
                label={option.label}
                description={option.description}
                selected={draft.writingService === option.value}
                disabled={option.value === "apple" && !connections.apple.available}
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
                    <CloudStatus checking={checking} status={connections.openrouter} />
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
                    <CloudStatus checking={checking} status={connections.elevenlabs} />
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
                              className="h-11 min-w-64 flex-1"
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
                              ▶ Preview
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
    <div className="grid gap-5 border-l border-zinc-200 pl-5 lg:grid-cols-[15rem_1fr] lg:gap-8">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">{description}</p>
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
      <label className="grid cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-4">
        <RadioGroupItem value={value} disabled={disabled} className="size-5" />
        <Mark service={value} />
        <span>
          <span className="text-sm font-semibold">{label}</span>
          <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
            {description}
          </span>
        </span>
        {badge}
      </label>
      <div className="grid gap-3 pl-[4.75rem] empty:hidden">{children}</div>
    </div>
  );
}

/**
 * The mark beside a service name.
 *
 * ElevenLabs and OpenRouter each publish a symbol, so the app carries their
 * own file. The Apple logo is the U+F8FF glyph from the macOS system font,
 * which `system-ui` in the font stack supplies. Apple asks for a written
 * trademark licence before a third party shows this mark.
 */
function Mark({ service }: { service: string }) {
  const slot =
    "grid size-9 shrink-0 place-items-center rounded-lg border border-zinc-200 bg-white";

  if (service === "elevenlabs") {
    return (
      <span className={slot}>
        <img src="/elevenlabs-mark.svg" alt="" aria-hidden="true" className="size-6" />
      </span>
    );
  }
  if (service === "openrouter") {
    return (
      <span className={slot}>
        <img src="/openrouter-mark.svg" alt="" aria-hidden="true" className="w-5" />
      </span>
    );
  }
  if (service === "apple") {
    return (
      <span className={slot}>
        <span
          aria-hidden="true"
          className="font-[system-ui] text-base leading-none text-zinc-900"
        >
          {"\uF8FF"}
        </span>
      </span>
    );
  }
  if (service === "system") {
    return (
      <span className={slot}>
        <Volume2 className="size-4 text-zinc-500" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className={slot}>
      <Ban className="size-4 text-zinc-400" aria-hidden="true" />
    </span>
  );
}

function Status({
  tone,
  text,
}: {
  tone: "ready" | "warn" | "idle" | "bad";
  text: string;
}) {
  const skin = {
    ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warn: "border-amber-200 bg-amber-50 text-amber-700",
    idle: "border-zinc-200 bg-zinc-100 text-zinc-600",
    bad: "border-red-200 bg-red-50 text-red-700",
  }[tone];

  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${skin}`}
    >
      {text}
    </span>
  );
}

function CloudStatus({
  checking,
  status,
}: {
  checking: boolean;
  status: ProviderStatus;
}) {
  if (checking) return <Status tone="idle" text="Checking…" />;
  if (status.connected) return <Status tone="ready" text="Connected" />;
  if (status.detail) return <Status tone="bad" text="Key did not work" />;
  return <Status tone="idle" text="Needs a key" />;
}

function KeyPanel({
  provider,
  name,
  status,
  onConnected,
  onForget,
}: {
  provider: Provider;
  name: string;
  status: ProviderStatus;
  onConnected: (status: ProviderStatus) => void;
  onForget: (provider: Provider) => void;
}) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function connect() {
    setBusy(true);
    setProblem("");
    try {
      onConnected(await connectProvider(provider, key.trim()));
      setKey("");
    } catch (reason) {
      setProblem(String(reason));
    } finally {
      setBusy(false);
    }
  }

  if (status.connected) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs font-semibold text-emerald-700">
          ✓ {status.detail ?? "Connected"}
        </p>
        <Button
          type="button"
          variant="ghost"
          className="h-9 px-3 text-xs"
          onClick={() => onForget(provider)}
        >
          Remove key
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Input
          type="password"
          aria-label={`${name} API key`}
          placeholder={`Paste your ${name} API key`}
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(event) => setKey(event.target.value)}
          className="h-11 min-w-64 flex-1 font-mono"
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 px-4"
          disabled={busy || !key.trim()}
          onClick={connect}
        >
          {busy ? "Checking…" : "Connect"}
        </Button>
      </div>
      {problem && (
        <p role="alert" className="text-xs font-semibold text-red-700">
          {problem}. Copy the key again.
        </p>
      )}
    </>
  );
}
