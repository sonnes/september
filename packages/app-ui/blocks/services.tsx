/**
 * The service UI that setup and settings share.
 *
 * A key goes to the platform service and comes back as a status. No component
 * keeps a second copy of the key.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Ban, Volume2 } from "lucide-react";

import { Button } from "@september/ui/components/button";
import { Input } from "@september/ui/components/input";
import { Label } from "@september/ui/components/label";
import { Link } from "@tanstack/react-router";
import { RadioGroupItem } from "@september/ui/components/radio-group";

import { platform } from "@platform/adapter";
import { WRITING_SERVICES } from "@september/core/rules/onboarding";
import { SERVICE_NAMES, type ServiceId } from "@september/core/rules/services";
import type { Provider, ProviderStatus } from "@september/app-ui/platform";
import { useConnections, useForgetKey, type Connections } from "@september/app-ui/services/connections";
import type { ConnectionId } from "@september/core/rules/navigation";

/**
 * The mark beside a service name.
 *
 * ElevenLabs and OpenRouter each publish a symbol, so the app carries their
 * own file. The Apple logo is the U+F8FF glyph from the macOS system font,
 * which `system-ui` in the font stack supplies. Apple asks for a written
 * trademark licence before a third party shows this mark.
 */
export function Mark({ service }: { service: ServiceId }) {
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

export function Status({
  tone,
  text,
}: {
  tone: "ready" | "warn" | "idle" | "bad";
  text: string;
}) {
  const skin = {
    ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warn: "border-input bg-muted text-foreground",
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

export function CloudStatus({
  checking,
  status,
}: {
  checking: boolean;
  status: ProviderStatus;
}) {
  if (checking) return <Status tone="idle" text="Checking…" />;
  if (status.connected) return <Status tone="ready" text="Connected" />;
  if (status.detail) return <Status tone="bad" text="Connection failed" />;
  return <Status tone="idle" text="Not connected" />;
}

export function KeyPanel({ provider }: { provider: Provider }) {
  const { connections, replace: onConnected } = useConnections();
  const status = connections[provider];
  const forget = useForgetKey();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const keyId = useId();

  async function connect() {
    setBusy(true);
    setProblem("");
    try {
      onConnected(await platform.providers.connect(provider, key.trim()));
      setKey("");
    } catch (reason) {
      setProblem(reason instanceof Error ? reason.message : String(reason));
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
          aria-disabled={forget.isPending}
          onClick={() => !forget.isPending && forget.mutate(provider)}
        >
          Disconnect
        </Button>
        {forget.error ? (
          <p role="alert" className="text-destructive text-xs font-semibold">
            {forget.error.message}
          </p>
        ) : null}
      </div>
    );
  }

  if (provider === "openrouter") return <OpenRouterConnect onConnected={onConnected} />;

  return (
    <>
      <Label htmlFor={keyId}>{SERVICE_NAMES[provider]} key</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id={keyId}
          type="password"
          placeholder="Paste the key here"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(event) => setKey(event.target.value)}
          className="h-11 w-full flex-1 font-mono sm:min-w-64"
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
          {problem}
        </p>
      )}
    </>
  );
}

function OpenRouterConnect({ onConnected }: { onConnected: (status: ProviderStatus) => void }) {
  const active = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  useEffect(() => () => active.current?.abort(), []);

  async function connect() {
    if (active.current) return;
    const attempt = new AbortController();
    active.current = attempt;
    setBusy(true);
    setProblem("");
    try {
      const status = await platform.providers.connectOpenRouter(attempt.signal);
      if (!attempt.signal.aborted) onConnected(status);
    } catch (reason) {
      if (!attempt.signal.aborted) setProblem(reason instanceof Error ? reason.message : String(reason));
    } finally {
      if (active.current === attempt) {
        active.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">Authorize September in OpenRouter. Your account controls access and spending.</p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" className="min-h-11" aria-disabled={busy} onClick={connect}>
          {busy ? "Waiting for OpenRouter…" : "Connect OpenRouter"}
        </Button>
        {busy ? <Button type="button" variant="outline" className="min-h-11" onClick={() => active.current?.abort()}>Cancel</Button> : null}
      </div>
      {problem ? <p role="alert" className="text-sm text-destructive">{problem}</p> : null}
    </div>
  );
}

export function ElevenLabsImpactLink() {
  return (
    <Button type="button" variant="link" className="h-auto min-h-11 justify-start whitespace-normal px-0 text-left"
      onClick={() => void platform.device.openInBrowser("https://elevenlabs.io/impact")}>
      ElevenLabs Impact Program
    </Button>
  );
}

/**
 * One service inside a job.
 *
 * Selection changes the border and nothing else. The panel below belongs to
 * the state of the service, not to the choice, so the card keeps its height
 * and no choice below it moves down the page.
 */
export function ServiceChoice({
  value,
  label,
  description,
  selected,
  disabled,
  unready,
  badge,
  children,
}: {
  value: ServiceId;
  label: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  /**
   * The choice says it is not ready, and stays in the Tab and arrow order.
   * The handler of the group ignores it.
   */
  unready?: boolean;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      // A choice that is not ready has a dashed line, not a fade, so its
      // words stay readable.
      className={`grid gap-4 rounded-xl border p-4 ${
        selected
          ? "border-brand ring-[3px] ring-indigo-500/30"
          : "border-border"
      } ${disabled || unready ? "border-input border-dashed" : ""}`}
    >
      <label className="grid cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] sm:gap-4">
        <RadioGroupItem value={value} disabled={disabled} aria-disabled={unready || undefined} />
        <Mark service={value} />
        <span>
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
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

/** The writing services this device offers. A device that cannot run Apple Intelligence does not show it. */
export const offeredWritingServices = (connections: Connections) =>
  WRITING_SERVICES.filter((option) => option.value !== "apple" || connections.apple.supported);

/** The writing service of a radio value, or nothing. */
export const writingServiceOf = (value: string) =>
  WRITING_SERVICES.find((option) => option.value === value)?.value;

export function appleState(connections: Connections): string {
  if (connections.apple.available) {
    return "AI Assistance from Apple Intelligence. Your words stay on this device.";
  }
  if (!connections.apple.supported) {
    return "Apple Intelligence is not available on this device.";
  }
  return connections.apple.reason ?? "Turn it on in System Settings.";
}

export function ManageLink({
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
