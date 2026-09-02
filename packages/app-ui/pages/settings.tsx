import {
  useEffect,
  useRef,
  useState,
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
import { Skeleton } from "@september/ui/components/skeleton";
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
  listModels,
  listWritingModels,
  openInBrowser,
  readConnections,
  saveSpeech,
  updateSetup,
  type Connections,
  type Model,
  type Provider,
  type ProviderStatus,
  type WritingModel,
} from "@platform/services/os";
import { speechSettings } from "@platform/services/speech";
import { downloadBackup, importBackup } from "@platform/services/backup";
import {
  backupProblem,
  backupSummary,
  parseBackup,
  type BackupSummary,
  type SeptemberBackup,
} from "@september/core/rules/backup";
import { searchModels } from "@september/core/rules/pick";
import {
  CONNECTION_GUIDES,
  type ConnectionId,
} from "@platform/rules/settings-nav";
import { PickList } from "@september/app-ui/blocks/pick-list";
import {
  CloudStatus,
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
                : "Gives writing help. Free models are available."
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
    return "Writing help from Apple Intelligence. Your words stay on this device.";
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

      <p className="text-muted-foreground text-xs">
        The key stays on this device. September sends it only to {guide.name}.
      </p>

      {provider === "elevenlabs" ? (
        <VoiceModelChoice connected={status.connected} />
      ) : (
        <WritingModelChoice connected={status.connected} />
      )}

      <div className="border-t pt-6">
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

/** The row that asks for no model, and keeps the free list of the app. */
const AUTOMATIC = "automatic";
const USE_DEFAULT = "use-default";
const CURRENT_DEFAULT = "current-default";
const CURRENT_SUGGESTIONS = "current-suggestions";

/**
 * The OpenRouter model, on the screen that holds the key.
 *
 * OpenRouter offers hundreds of models, and the search field lets a user find
 * the one they pay for. With no key, or with no choice, September uses the free
 * list of the app.
 */
function WritingModelChoice({ connected }: { connected: boolean }) {
  const [setup, change] = useSetup();
  const [models, setModels] = useState<WritingModel[] | null>(null);

  useEffect(() => {
    if (!connected) return;
    let live = true;
    void listWritingModels()
      .then((found) => {
        if (live) setModels(found);
      })
      .catch(() => {
        if (live) setModels([]);
      });
    return () => {
      live = false;
    };
  }, [connected]);

  if (!connected) return null;

  const chosen =
    setup.defaultModel.service === "openrouter"
      ? setup.defaultModel.model || AUTOMATIC
      : CURRENT_DEFAULT;
  const suggestionsChosen = !setup.suggestionsModel
    ? USE_DEFAULT
    : setup.suggestionsModel.service === "openrouter"
      ? setup.suggestionsModel.model || AUTOMATIC
      : CURRENT_SUGGESTIONS;
  // Automatic is free, so it sits at the head of the resting list and leaves
  // when the words do not find it.
  const rows = [
    { id: AUTOMATIC, name: "Automatic (free models)", free: true },
    ...(models ?? []).map((model) => ({
      ...model,
      note: model.free ? undefined : "Paid",
    })),
  ];
  const defaultRows =
    setup.defaultModel.service === "openrouter"
      ? rows
      : [
          {
            id: CURRENT_DEFAULT,
            name: `Current: ${serviceName(setup.defaultModel.service)}`,
            note: "Change in Writing help",
            free: true,
          },
          ...rows,
        ];
  const suggestionsRows =
    setup.suggestionsModel && setup.suggestionsModel.service !== "openrouter"
      ? [
          {
            id: CURRENT_SUGGESTIONS,
            name: `Current: ${serviceName(setup.suggestionsModel.service)}`,
            note: "Change in Writing help",
            free: true,
          },
          { id: USE_DEFAULT, name: "Use default", free: true },
          ...rows,
        ]
      : [{ id: USE_DEFAULT, name: "Use default", free: true }, ...rows];

  return (
    <>
      <Section
        title="Default model"
        description="Every writing task uses this model unless it has an override."
      >
        {models === null ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <PickList
            rows={defaultRows}
            value={chosen}
            onPick={(id) => {
              if (id === CURRENT_DEFAULT) return;
              change({
                defaultModel: {
                  service: "openrouter",
                  model: id === AUTOMATIC ? "" : id,
                },
              });
            }}
            label="Search models"
            filter={(all, query) => searchModels(all, query, chosen)}
          />
        )}
        <p className="text-muted-foreground max-w-md text-sm">
          {models?.length === 0
            ? "No models came back from OpenRouter. Automatic still writes."
            : "The list shows the free models. Search to reach every model of OpenRouter. A model marked Paid uses the credit of your account."}
        </p>
      </Section>
      <Section
        title="Suggestions model"
        description="Use default keeps every writing task on one model. Choose another model only for suggestions while typing."
      >
        {models === null ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <PickList
            rows={suggestionsRows}
            value={suggestionsChosen}
            onPick={(id) => {
              if (id === CURRENT_SUGGESTIONS) return;
              change({
                suggestionsModel:
                  id === USE_DEFAULT
                    ? null
                    : {
                        service: "openrouter",
                        model: id === AUTOMATIC ? "" : id,
                      },
              });
            }}
            label="Search suggestion models"
            filter={(all, query) => searchModels(all, query, suggestionsChosen)}
          />
        )}
      </Section>
    </>
  );
}

function serviceName(
  service: OnboardingDraft["defaultModel"]["service"],
): string {
  return (
    WRITING_SERVICES.find((option) => option.value === service)?.label ??
    "No writing help"
  );
}

/**
 * The ElevenLabs model, on the screen that holds the key.
 *
 * The account supplies the list, so the choice has no meaning before a key.
 * `speechSettings()` gives the model in use, and `saveSpeech` keeps the new
 * one at once. There is no Save button to forget.
 */
function VoiceModelChoice({ connected }: { connected: boolean }) {
  const [models, setModels] = useState<Model[] | null>(null);
  const [modelId, setModelId] = useState(() => speechSettings().modelId);

  useEffect(() => {
    if (!connected) return;
    let live = true;
    void listModels()
      .then((found) => {
        if (live) setModels(found);
      })
      .catch(() => {
        if (live) setModels([]);
      });
    return () => {
      live = false;
    };
  }, [connected]);

  if (!connected) return null;

  const chosen = models?.find((option) => option.id === modelId);

  const choose = (next: string) => {
    setModelId(next);
    void saveSpeech({ ...speechSettings(), modelId: next });
  };

  return (
    <Section
      title="Which model"
      description="It decides the quality, the speed, and the price of each message."
    >
      {models === null ? (
        <Skeleton className="h-24 w-full" />
      ) : models.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No models came back from ElevenLabs.
        </p>
      ) : (
        <>
          <PickList
            rows={models}
            value={modelId}
            onPick={choose}
            label="Search models"
          />
          {/* A model name says little. The service supplies the sentence
              that tells a user what the choice costs and gives. */}
          {chosen?.description ? (
            <p className="text-muted-foreground max-w-md text-sm">
              {chosen.description}
            </p>
          ) : null}
        </>
      )}
    </Section>
  );
}

// ------------------------------------------------------------ writing help

export function WritingSettings() {
  const [setup, change] = useSetup();
  const [connections] = useConnections();

  const ready = {
    apple: connections.apple.available,
    openrouter: connections.openrouter.connected,
    none: true,
  };
  const suggestionsService = setup.suggestionsModel?.service ?? USE_DEFAULT;
  const suggestionOptions: Array<{
    value: typeof USE_DEFAULT | OnboardingDraft["defaultModel"]["service"];
    label: string;
    description: string;
  }> = [
    {
      value: USE_DEFAULT,
      label: "Use default",
      description: "Suggestions use the default model configuration.",
    },
    ...WRITING_SERVICES.filter(
      (option) => option.value !== "apple" || connections.apple.supported,
    ),
  ];

  return (
    <div className="flex flex-col gap-8">
      <Title
        title="Writing help"
        description="September finishes your sentences while you type."
      />

      <Section
        title="Who writes"
        description="Only a connected service can write. Add a key in Services."
      >
        <RadioGroup
          aria-label="Writing help"
          className="gap-3"
          value={setup.defaultModel.service}
          onValueChange={(value) =>
            change({
              defaultModel: {
                ...setup.defaultModel,
                service: value as OnboardingDraft["defaultModel"]["service"],
              },
            })
          }
        >
          {WRITING_SERVICES.filter(
            // A Mac that cannot run it never shows a control it must disable.
            (option) => option.value !== "apple" || connections.apple.supported,
          ).map((option) => (
            <Label
              key={option.value}
              className={`hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 flex cursor-pointer items-center gap-4 rounded-xl border p-4 ${
                ready[option.value] ? "" : "opacity-60"
              }`}
            >
              <RadioGroupItem
                value={option.value}
                disabled={!ready[option.value]}
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
                    : "Not connected yet. Finish it in Services."}
                </span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </Section>

      <Section
        title="Suggestions"
        description="Use the default model, or override it only for suggestions while you type."
      >
        <RadioGroup
          aria-label="Suggestions model service"
          className="gap-3"
          value={suggestionsService}
          onValueChange={(value) =>
            change({
              suggestionsModel:
                value === USE_DEFAULT
                  ? null
                  : {
                      service:
                        value as OnboardingDraft["defaultModel"]["service"],
                      model:
                        setup.suggestionsModel?.service === value
                          ? setup.suggestionsModel.model
                          : "",
                    },
            })
          }
        >
          {suggestionOptions.map((option) => {
            const available =
              option.value === USE_DEFAULT ? true : ready[option.value];
            return (
              <Label
                key={option.value}
                className={`hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 flex cursor-pointer items-center gap-4 rounded-xl border p-4 ${
                  available ? "" : "opacity-60"
                }`}
              >
                <RadioGroupItem
                  value={option.value}
                  disabled={!available}
                  className="size-5"
                />
                <Mark
                  service={
                    option.value === USE_DEFAULT
                      ? setup.defaultModel.service
                      : option.value
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {option.label}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                    {available
                      ? option.description
                      : "Not connected yet. Finish it in Services."}
                  </span>
                </span>
              </Label>
            );
          })}
        </RadioGroup>
      </Section>

      <Section
        title="About you"
        description="How you talk, and the words you use. Every suggestion is written this way."
      >
        <div className="flex flex-wrap gap-2">
          {SPEAKING_STYLES.map((option) => (
            <Button
              key={option.label}
              type="button"
              variant={
                setup.speakingStyle === option.value ? "default" : "outline"
              }
              aria-pressed={setup.speakingStyle === option.value}
              onClick={() => change({ speakingStyle: option.value })}
              className="h-11 rounded-full px-4"
            >
              {option.label}
            </Button>
          ))}
        </div>
        <SavedText
          label="Speaking style"
          value={setup.speakingStyle}
          rows={4}
          maxLength={1000}
          onSave={(speakingStyle) => change({ speakingStyle })}
        />
        <SavedText
          label="Personal words"
          value={setup.personalWords}
          rows={4}
          maxLength={5000}
          placeholder="Amma. Dr. Shah. I need a short rest. Please give me a moment."
          onSave={(personalWords) => change({ personalWords })}
        />
      </Section>
    </div>
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
}: {
  fileName: string;
  summary: BackupSummary;
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
  const [problem, setProblem] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const chooseBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setProblem(null);
    setSelected(null);
    try {
      const backup = parseBackup(await file.text());
      setFileName(file.name);
      setSelected(backup);
    } catch (error) {
      setProblem(backupProblem(error));
    } finally {
      input.value = "";
    }
  };

  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    setProblem(null);
    try {
      await downloadBackup();
    } catch (error) {
      setProblem(backupProblem(error));
    } finally {
      setExporting(false);
    }
  };

  const replaceData = async () => {
    if (!selected || importing) return;
    setImporting(true);
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
          aria-disabled={exporting}
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
          onClick={() => fileInput.current?.click()}
        >
          <Upload aria-hidden />
          Choose backup file
        </Button>

        {summary ? (
          <>
            <BackupPreview fileName={fileName} summary={summary} />
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
                  aria-disabled={importing}
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

        {problem ? (
          <p role="alert" className="text-destructive text-sm leading-relaxed">
            {problem}
          </p>
        ) : null}
      </Section>
    </div>
  );
}
