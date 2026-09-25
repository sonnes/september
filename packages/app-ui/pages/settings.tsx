import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type ReactNode,
} from "react";

import { Link } from "@tanstack/react-router";
import { Download, ExternalLink, Upload } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@september/ui/components/alert-dialog";
import { Button } from "@september/ui/components/button";
import { Label } from "@september/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@september/ui/components/radio-group";
import { Switch } from "@september/ui/components/switch";
import { Textarea } from "@september/ui/components/textarea";

import {
  DEFAULT_DRAFT,
  SPEAKING_STYLES,
  WRITING_SERVICES,
  type OnboardingDraft,
} from "@platform/rules/onboarding";
import {
  BLANK_CONNECTIONS,
  currentSetup,
  openInBrowser,
  readConnections,
  subscribeSetup,
  updateSetup,
  type Connections,
  type Provider,
  type ProviderStatus,
} from "@platform/services/os";
import { downloadBackup, importBackup } from "@platform/services/backup";
import {
  backupProblem,
  backupSummary,
  parseBackup,
  type BackupSummary,
  type SeptemberBackup,
} from "@september/core/rules/backup";
import {
  AGENT_MODELS,
  modelChoices,
  SUGGESTIONS_MODELS,
  type CuratedModel,
} from "@september/core/rules/model-config";
import {
  CONNECTION_GUIDES,
  type ConnectionId,
} from "@platform/rules/settings-nav";
import { PickList } from "@september/app-ui/blocks/pick-list";
import {
  CloudStatus,
  ElevenLabsImpactLink,
  KeyPanel,
  Mark,
  Status,
} from "@september/app-ui/blocks/services";

function useSetup(): [
  OnboardingDraft,
  (patch: Partial<OnboardingDraft>) => void,
] {
  // A platform without saved setup draws the defaults instead of throwing.
  const [setup, setSetup] = useState(() => currentSetup() ?? DEFAULT_DRAFT);

  return [
    setup,
    (patch) => {
      // The screen shows the new answer at once. Local storage keeps it behind that.
      setSetup((current) => ({ ...current, ...patch }));
      void updateSetup(patch);
    },
  ];
}

/** What this device reports about each service. One read for the whole screen. */
function useConnections(): [
  Connections & { checking: boolean },
  (status: ProviderStatus) => void,
] {
  const [connections, setConnections] = useState(BLANK_CONNECTIONS);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let live = true;
    void readConnections().then((found) => {
      if (!live) return;
      setConnections(found);
      setChecking(false);
    });
    return () => {
      live = false;
    };
  }, []);

  return [
    { ...connections, checking },
    (status) =>
      setConnections((current) => ({ ...current, [status.provider]: status })),
  ];
}

function Title({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

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
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}

// ------------------------------------------------------------ the services

/**
 * The services, and nothing more.
 *
 * The setup steps ask how September runs. This screen only shows the services
 * that answer gives, so a user comes here to add a key or to change one.
 */
export function SetupSettings() {
  const [connections] = useConnections();

  return (
    <div className="flex flex-col gap-8">
      <Title
        title="Services"
        description="The services September uses, and the keys they need."
      />

      <Section
        title="Connect a service"
        description="Each row says what comes next."
      >
        <div className="divide-y border-y">
          <ConnectionRow
            service="apple"
            name="Apple Intelligence"
            state={appleState(connections)}
            badge={
              connections.apple.available ? (
                <Status tone="ready" text="Ready" />
              ) : (
                <Status tone="warn" text="Not available" />
              )
            }
            action={
              <span className="text-muted-foreground text-sm font-medium">
                Device support
              </span>
            }
          />
          <ConnectionRow
            service="openrouter"
            name="OpenRouter"
            state={
              connections.openrouter.connected
                ? `Connected. ${connections.openrouter.detail ?? ""}`
                : "Gives AI Assistance. Free models are available."
            }
            badge={
              <CloudStatus
                checking={connections.checking}
                status={connections.openrouter}
              />
            }
            action={
              <ManageLink
                provider="openrouter"
                status={connections.openrouter}
              />
            }
          />
          <ConnectionRow
            service="elevenlabs"
            name="ElevenLabs"
            state={
              connections.elevenlabs.connected
                ? "Connected. Choose a voice on the Voice screen."
                : "Speaks your messages with a natural voice."
            }
            badge={
              <CloudStatus
                checking={connections.checking}
                status={connections.elevenlabs}
              />
            }
            action={
              <ManageLink
                provider="elevenlabs"
                status={connections.elevenlabs}
              />
            }
          />
        </div>
      </Section>
    </div>
  );
}

function appleState(connections: Connections): string {
  if (connections.apple.available) {
    return "AI Assistance from Apple Intelligence. Your words stay on this device.";
  }
  if (!connections.apple.supported) {
    return "Apple Intelligence is not available on this device.";
  }
  return connections.apple.reason ?? "Turn it on in System Settings.";
}

function ManageLink({
  provider,
  status,
}: {
  provider: ConnectionId;
  status: ProviderStatus;
}) {
  return (
    <Button
      asChild
      type="button"
      variant={status.connected ? "outline" : "default"}
    >
      <Link to="/settings/connections/$provider" params={{ provider }}>
        {status.connected ? "Manage" : "Set up"}
      </Link>
    </Button>
  );
}

function ConnectionRow({
  service,
  name,
  state,
  badge,
  action,
}: {
  service: string;
  name: string;
  state: string;
  badge: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center gap-4 py-4">
      <Mark service={service} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{name}</div>
        <div className="text-muted-foreground text-sm">{state}</div>
      </div>
      {badge}
      {action}
    </div>
  );
}

// ----------------------------------------------------------- one connection

export function ConnectionScreen({ provider }: { provider: ConnectionId }) {
  const guide = CONNECTION_GUIDES[provider];
  const [connections, replace] = useConnections();
  const status = connections[provider as Provider];

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-muted-foreground text-sm">
        <Link to="/settings" className="hover:text-foreground">
          ← Back
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-foreground font-medium">{guide.name}</span>
      </nav>

      <Title title={guide.name} description={guide.lede} />

      <ol className="flex flex-col gap-2">
        {guide.steps.map((step, index) => (
          <li key={step} className="flex items-baseline gap-3 text-sm">
            <span className="bg-muted text-muted-foreground flex size-5 shrink-0 translate-y-0.5 items-center justify-center rounded-full text-xs font-semibold">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <KeyPanel
        provider={provider as Provider}
        name={guide.name}
        status={status}
        onConnected={replace}
        onForget={() =>
          replace({
            provider: provider as Provider,
            connected: false,
            label: null,
            detail: null,
          })
        }
      />

      {provider === "elevenlabs" ? <ElevenLabsImpactLink /> : null}

      <p className="text-muted-foreground text-xs">
        The key stays on this device. September sends it only to {guide.name}.
      </p>

      <div className="flex flex-wrap gap-3 border-t pt-6">
        {provider === "openrouter" ? (
          <Button asChild type="button" className="h-11 px-4">
            <Link to="/settings/writing">Go to AI Assistance</Link>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-11 px-4"
          onClick={() => void openInBrowser(guide.url)}
        >
          Open {guide.name}
          <ExternalLink aria-hidden />
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ AI Assistance

type WritingServiceId = OnboardingDraft["defaultModel"]["service"];
type SwitchField = "autoSuggestions" | "autoPhrases" | "agentEnabled";

/**
 * One saved switch of the setup.
 *
 * The switch shows the saved value, not the value it asked for, so a failed
 * write never leaves a switch that says one thing and does another. The whole
 * row is the label, so it gives a 44px target around the small switch.
 */
function SetupSwitch({
  field,
  label,
  description,
}: {
  field: SwitchField;
  label: string;
  description: string;
}) {
  const setup =
    useSyncExternalStore(subscribeSetup, currentSetup, currentSetup) ??
    DEFAULT_DRAFT;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const id = `setting-${field}`;

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await updateSetup({ [field]: !setup[field] });
    } catch {
      setError("September did not save the setting. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-11 items-center justify-between gap-4 rounded-xl border px-4 py-3">
        <Label htmlFor={id} className="flex flex-1 cursor-pointer flex-col items-start gap-1">
          <span className="text-sm font-medium">{label}</span>
          <span
            id={`${id}-description`}
            className="text-muted-foreground text-xs leading-relaxed font-normal"
          >
            {description}
          </span>
        </Label>
        <Switch
          id={id}
          checked={setup[field] !== false}
          aria-describedby={`${id}-description`}
          aria-disabled={pending}
          onCheckedChange={() => void toggle()}
        />
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A curated model list, with Automatic first. An empty id is Automatic. */
function ModelList({
  models,
  value,
  onPick,
}: {
  models: readonly CuratedModel[];
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Model</span>
      <PickList
        rows={modelChoices(models, value)}
        value={value}
        onPick={onPick}
        label="Search models"
        fixedHeight
      />
    </div>
  );
}

/** Apple Intelligence has one model, so there is nothing to choose. */
function AppleModel() {
  return (
    <p className="text-muted-foreground text-sm">
      Apple Intelligence runs on this Mac with one model.
    </p>
  );
}

/**
 * The provider first, then one section for each feature.
 *
 * `defaultModel` holds the provider and the model of the agent and phrases.
 * `suggestionsModel` holds the model of suggestions. A provider change moves
 * both, so a feature can never point at a provider the user left.
 */
export function WritingSettings() {
  const [setup, change] = useSetup();
  const [connections] = useConnections();
  const provider = setup.defaultModel.service;

  const ready: Record<WritingServiceId, boolean> = {
    apple: connections.apple.available,
    openrouter: connections.openrouter.connected,
    none: true,
  };

  const chooseProvider = (value: string) => {
    const service = value as WritingServiceId;
    if (!ready[service] || service === provider) return;
    change({
      defaultModel: { ...setup.defaultModel, service },
      suggestionsModel: setup.suggestionsModel && {
        ...setup.suggestionsModel,
        service,
      },
    });
  };

  const suggestionsValue = (setup.suggestionsModel ?? setup.defaultModel).model;

  return (
    <div className="flex flex-col gap-8">
      <Title
        title="AI Assistance"
        description="September finishes your sentences while you type."
      />

      <Section
        title="Provider"
        description="Every feature below uses this provider."
      >
        <RadioGroup
          aria-label="Provider"
          className="gap-3"
          value={provider}
          onValueChange={chooseProvider}
        >
          {WRITING_SERVICES.filter(
            // A Mac that cannot run it never shows a control it must disable.
            (option) => option.value !== "apple" || connections.apple.supported,
          ).map((option) => (
            <div
              key={option.value}
              className="has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 flex items-center gap-3 rounded-xl border p-4"
            >
              <Label
                className={`flex flex-1 cursor-pointer items-center gap-4 ${
                  ready[option.value] ? "" : "opacity-60"
                }`}
              >
                <RadioGroupItem
                  value={option.value}
                  aria-disabled={!ready[option.value]}
                  className="size-5"
                />
                <Mark service={option.value} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {option.label}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                    {ready[option.value]
                      ? option.description
                      : option.value === "apple"
                        ? appleState(connections)
                        : "Not connected yet."}
                  </span>
                </span>
              </Label>
              {option.value === "openrouter" ? (
                <ManageLink provider="openrouter" status={connections.openrouter} />
              ) : null}
            </div>
          ))}
        </RadioGroup>
      </Section>

      {provider === "none" ? (
        <p className="text-muted-foreground text-sm">
          Choose a provider to turn on suggestions, phrases, and the agent.
        </p>
      ) : (
        <>
          <Section
            title="Suggestions"
            description="Words as you type, after a space or punctuation."
          >
            <SetupSwitch
              field="autoSuggestions"
              label="Suggest as I type"
              description="Off waits for a press of Suggest."
            />
            {provider === "openrouter" ? (
              <ModelList
                models={SUGGESTIONS_MODELS}
                value={suggestionsValue}
                onPick={(model) =>
                  change({ suggestionsModel: { service: provider, model } })
                }
              />
            ) : (
              <AppleModel />
            )}
          </Section>

          <Section
            title="Agent and phrases"
            description="One model writes phrases and runs the agent."
          >
            <SetupSwitch
              field="autoPhrases"
              label="Phrases"
              description="Phrases and starters for each space, made in the background."
            />
            <SetupSwitch
              field="agentEnabled"
              label="Agent"
              description="Changes a space when you ask. Off hides Agent in every space."
            />
            {provider === "openrouter" ? (
              <ModelList
                models={AGENT_MODELS}
                value={setup.defaultModel.model}
                onPick={(model) =>
                  change({ defaultModel: { service: provider, model } })
                }
              />
            ) : (
              <AppleModel />
            )}
          </Section>

          <SpeakingStyle
            value={setup.speakingStyle}
            onChange={(speakingStyle) => change({ speakingStyle })}
          />
        </>
      )}
    </div>
  );
}

/**
 * Three styles and Custom. The instructions field shows only for Custom, so a
 * stray edit cannot change every suggestion.
 */
function SpeakingStyle({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const preset = SPEAKING_STYLES.find((option) => option.value === value);
  const [custom, setCustom] = useState(!preset);

  return (
    <Section
      title="Speaking style"
      description="How September writes for you, in every feature."
    >
      <div className="flex flex-wrap gap-2">
        {SPEAKING_STYLES.map((option) => {
          const on = !custom && preset?.label === option.label;
          return (
            <Button
              key={option.label}
              type="button"
              variant={on ? "default" : "outline"}
              aria-pressed={on}
              onClick={() => {
                setCustom(false);
                onChange(option.value);
              }}
              className="h-11 rounded-full px-4"
            >
              {option.label}
            </Button>
          );
        })}
        <Button
          type="button"
          variant={custom ? "default" : "outline"}
          aria-pressed={custom}
          onClick={() => setCustom(true)}
          className="h-11 rounded-full px-4"
        >
          Custom
        </Button>
      </div>
      {custom ? (
        <SavedText
          label="Your instructions"
          value={value}
          rows={4}
          maxLength={1000}
          onSave={onChange}
        />
      ) : (
        <p className="text-muted-foreground text-sm">{preset?.value}</p>
      )}
    </Section>
  );
}

/**
 * A text field that keeps itself.
 *
 * There is no Save button to forget. The field waits half a second after the
 * last keystroke, so one sentence is one write, not thirty.
 */
function SavedText({
  label,
  value,
  rows,
  maxLength,
  placeholder,
  onSave,
}: {
  label: string;
  value: string;
  rows: number;
  maxLength: number;
  placeholder?: string;
  onSave: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The buttons above can change the style, so the field follows the answer.
  useEffect(() => setText(value), [value]);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`settings-${label}`} className="text-sm font-medium">
        {label}
      </Label>
      <Textarea
        id={`settings-${label}`}
        value={text}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className="leading-relaxed"
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          clearTimeout(timer.current ?? undefined);
          timer.current = setTimeout(() => onSave(next), 500);
        }}
      />
    </div>
  );
}

// --------------------------------------------------------------------- data

function BackupPreview({
  fileName,
  summary,
  skipped,
}: {
  fileName: string;
  summary: BackupSummary;
  skipped: number;
}) {
  const source = summary.source === "desktop" ? "Desktop app" : "Web app";
  const counts = [
    ["Spaces", summary.spaces],
    ["Messages", summary.messages],
    ["Agent messages", summary.agentMessages],
    ["Notes", summary.notes],
    ["Saved phrases", summary.savedPhrases],
    ["Usage events", summary.usageEvents],
  ] as const;

  return (
    <div className="rounded-surface border p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold break-all">{fileName}</p>
        <p className="text-muted-foreground text-sm">
          {source} · {new Date(summary.exportedAt).toLocaleString()}
        </p>
      </div>
      {skipped > 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">
          {skipped === 1
            ? "One entry has an error. September will leave it out."
            : `${skipped} entries have errors. September will leave them out.`}
        </p>
      ) : null}
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {counts.map(([label, count]) => (
          <div key={label} className="bg-muted rounded-control p-3">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="mt-1 text-base font-semibold">{count}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Download or restore one portable, validated September backup. */
export function DataSettings() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<SeptemberBackup | null>(null);
  const [fileName, setFileName] = useState("");
  const [skipped, setSkipped] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const busy = reading || exporting || importing;

  const chooseBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || busy) return;

    setReading(true);
    setProgress(["Reading backup file."]);
    setProblem(null);
    setSelected(null);
    setSkipped(0);
    try {
      const source = await file.text();
      setProgress((lines) => [...lines, "Checking backup contents."]);
      const { backup, skipped: withErrors } = parseBackup(source);
      setFileName(file.name);
      setSelected(backup);
      setSkipped(withErrors);
      setProgress((lines) => [
        ...lines,
        withErrors > 0
          ? `Backup checked. ${withErrors} entries will be skipped. Review the counts before import.`
          : "Backup checked. Review the counts before import.",
      ]);
    } catch (error) {
      setProblem(backupProblem(error));
    } finally {
      setReading(false);
      input.value = "";
    }
  };

  const exportData = async () => {
    if (busy) return;
    setExporting(true);
    setProgress(["Preparing backup from saved settings and data."]);
    setProblem(null);
    try {
      await downloadBackup();
      setProgress((lines) => [...lines, "Backup ready. Download requested."]);
    } catch (error) {
      setProblem(backupProblem(error));
    } finally {
      setExporting(false);
    }
  };

  const replaceData = async () => {
    if (!selected || busy) return;
    setImporting(true);
    setProgress(["Restoring settings and data. The app will reload when complete."]);
    setProblem(null);
    try {
      await importBackup(selected);
    } catch (error) {
      setProblem(backupProblem(error));
      setImporting(false);
    }
  };

  const summary = selected ? backupSummary(selected) : null;

  return (
    <div className="flex flex-col gap-8">
      <Title
        title="Data"
        description="Keep a private copy of your September settings and data."
      />

      <div role="log" aria-label="Backup activity" aria-live="polite" className="empty:hidden">
        {progress.length > 0 ? (
          <div className="rounded-surface border p-5 text-sm shadow-sm">
            <p className="font-semibold">Backup activity</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 leading-relaxed">
              {progress.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ol>
            {problem ? (
              <p role="alert" className="text-destructive mt-2 break-words leading-relaxed">
                Error: {problem}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="border-primary/20 bg-primary/5 rounded-surface border p-5">
        <p className="text-sm font-semibold">Keep the file private</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Backups contain your Talk and Agent conversations and notes in plain
          text. Store them securely. API keys are not included.
        </p>
      </div>

      <Section
        title="Download a backup"
        description="Creates one JSON file with your settings, spaces, Talk and Agent messages, notes, saved phrases, and usage history."
      >
        <Button
          type="button"
          className="h-11 self-start px-4"
          aria-disabled={busy}
          onClick={() => void exportData()}
        >
          <Download aria-hidden />
          {exporting ? "Preparing backup…" : "Download backup"}
        </Button>
      </Section>

      <Section
        title="Restore a backup"
        description="Choose a September JSON backup. You can review its contents before anything changes."
      >
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void chooseBackup(event)}
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 self-start px-4"
          aria-disabled={busy}
          onClick={() => {
            if (!busy) fileInput.current?.click();
          }}
        >
          <Upload aria-hidden />
          Choose backup file
        </Button>

        {summary ? (
          <>
            <BackupPreview
              fileName={fileName}
              summary={summary}
              skipped={skipped}
            />
            <p className="text-muted-foreground text-sm leading-relaxed">
              Importing replaces your current settings and data. It does not
              change your API keys or this device&apos;s audio settings.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 self-start px-4"
                  aria-disabled={busy}
                  onClick={(event) => {
                    if (busy) event.preventDefault();
                  }}
                >
                  {importing ? "Importing…" : "Import and replace"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Replace your September data?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This replaces your current settings and data with the
                    selected backup. You cannot undo this action unless you have
                    another backup.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep current data</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => void replaceData()}
                  >
                    Replace data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : null}
      </Section>
    </div>
  );
}
