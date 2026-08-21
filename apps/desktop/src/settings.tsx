import { useEffect, useRef, useState, type ReactNode } from "react";

import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ExternalLink, Lightbulb, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

import {
  SETUP_MODES,
  SPEAKING_STYLES,
  WRITING_SERVICES,
  type OnboardingDraft,
  type SetupMode,
} from "./onboarding";
import {
  BLANK_CONNECTIONS,
  currentSetup,
  openInBrowser,
  readConnections,
  updateSetup,
  type Connections,
  type Provider,
  type ProviderStatus,
} from "./os";
import {
  CONNECTION_GUIDES,
  sectionFor,
  SETTINGS_NAV,
  type ConnectionId,
  type SettingsPath,
} from "./settings-nav";
import { CloudStatus, KeyPanel, Mark, ModeCard, Status } from "./services";
import { ScreenHeader } from "./shell";

const ICONS: Record<SettingsPath, typeof SlidersHorizontal> = {
  "/settings": SlidersHorizontal,
  "/settings/writing": Lightbulb,
};

/** The setup answers, and one way to change them. */
function useSetup(): [
  OnboardingDraft,
  (patch: Partial<OnboardingDraft>) => void,
] {
  const [setup, setSetup] = useState(currentSetup());

  return [
    setup!,
    (patch) => {
      // The screen shows the new answer at once. Rust keeps it behind that.
      setSetup((current) => ({ ...current!, ...patch }));
      void updateSetup(patch);
    },
  ];
}

/** What the Mac reports about each service. One read for the whole screen. */
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

// -------------------------------------------------------------- the layout

/**
 * The settings layout: the section list beside the open section.
 *
 * The list is a column from `md` up. Below that it is a row of pills, so the
 * section itself stays above the fold.
 */
export function SettingsLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const open = sectionFor(pathname);

  return (
    <>
      <ScreenHeader>
        <span className="text-sm font-medium">Settings</span>
      </ScreenHeader>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2 md:p-4">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 md:flex-row md:gap-10 md:py-8">
          <nav className="flex shrink-0 gap-1 overflow-x-auto md:w-60 md:flex-col md:self-start md:overflow-visible">
            {SETTINGS_NAV.map((item) => {
              const Icon = ICONS[item.path];
              const active = item.path === open.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 transition-colors md:items-start ${
                    active ? "bg-muted" : "hover:bg-muted/60"
                  }`}
                >
                  <Icon
                    className={`size-4 shrink-0 md:mt-0.5 ${
                      active ? "text-foreground" : "text-muted-foreground"
                    }`}
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium whitespace-nowrap">
                      {item.title}
                    </span>
                    <span className="text-muted-foreground hidden text-xs leading-snug md:block">
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="min-w-0 flex-1">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
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

// --------------------------------------------------------------- the setup

export function SetupSettings() {
  const [setup, change] = useSetup();
  const [connections] = useConnections();

  function choose(mode: SetupMode) {
    if (mode === setup.mode) return;
    change(
      mode === "advanced"
        ? { mode }
        : {
            mode,
            writingService: connections.apple.available ? "apple" : "none",
            voiceService: "system",
          },
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Title
        title="Setup"
        description="How September runs, and the services it uses."
      />

      <Section
        title="How September runs"
        description="This decides where your words go, and which services you need."
      >
        <div className="grid gap-4">
          {SETUP_MODES.map((option) => (
            <ModeCard
              key={option.id}
              option={option}
              selected={setup.mode === option.id}
              onChoose={() => choose(option.id)}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Connections"
        description={
          setup.mode === "free"
            ? "Free mode runs on this Mac. A key is necessary only for a cloud service."
            : "Connect the services you want. Each row says what comes next."
        }
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
                On this Mac
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
            action={<ManageLink provider="openrouter" status={connections.openrouter} />}
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
            action={<ManageLink provider="elevenlabs" status={connections.elevenlabs} />}
          />
        </div>
      </Section>
    </div>
  );
}

function appleState(connections: Connections): string {
  if (connections.apple.available) {
    return "Writing help that runs on this Mac. Your words stay here.";
  }
  if (!connections.apple.supported) {
    return "This Mac cannot run it. It needs macOS 26 on Apple silicon.";
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
    <Button asChild type="button" variant={status.connected ? "outline" : "default"}>
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
          ‹ Setup
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
        The key goes to the keychain of this Mac. September sends it only to{" "}
        {guide.name}.
      </p>

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

// ------------------------------------------------------------ writing help

export function WritingSettings() {
  const [setup, change] = useSetup();
  const [connections] = useConnections();

  const ready = {
    apple: connections.apple.available,
    openrouter: connections.openrouter.connected,
    none: true,
  };

  return (
    <div className="flex flex-col gap-8">
      <Title
        title="Writing help"
        description="September finishes your sentences while you type."
      />

      <Section
        title="Who writes"
        description="Only a connected service can write. Add a key in Setup."
      >
        <RadioGroup
          aria-label="Writing help"
          className="gap-3"
          value={setup.writingService}
          onValueChange={(value) =>
            change({ writingService: value as OnboardingDraft["writingService"] })
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
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                  {ready[option.value]
                    ? option.description
                    : "Not connected yet. Finish it in Setup."}
                </span>
              </span>
            </Label>
          ))}
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
