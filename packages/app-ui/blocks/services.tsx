/**
 * The service UI that setup and settings share.
 *
 * A key goes to the platform service and comes back as a status. No component
 * keeps a second copy of the key.
 */

import { useEffect, useRef, useState } from "react";

import { Ban, Volume2 } from "lucide-react";

import { Button } from "@september/ui/components/button";
import { Input } from "@september/ui/components/input";

import {
  connectProvider,
  connectOpenRouter,
  openInBrowser,
  type Provider,
  type ProviderStatus,
} from "@platform/services/os";

/**
 * The mark beside a service name.
 *
 * ElevenLabs and OpenRouter each publish a symbol, so the app carries their
 * own file. The Apple logo is the U+F8FF glyph from the macOS system font,
 * which `system-ui` in the font stack supplies. Apple asks for a written
 * trademark licence before a third party shows this mark.
 */
export function Mark({ service }: { service: string }) {
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

export function KeyPanel({
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
          onClick={() => onForget(provider)}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  if (provider === "openrouter") return <OpenRouterConnect onConnected={onConnected} />;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Input
          type="password"
          aria-label={`${name} key`}
          placeholder={`Paste your ${name} key`}
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
      const status = await connectOpenRouter(attempt.signal);
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
      onClick={() => void openInBrowser("https://elevenlabs.io/impact")}>
      ElevenLabs Impact Program
    </Button>
  );
}
