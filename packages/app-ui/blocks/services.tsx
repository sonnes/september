/**
 * The service UI that setup and settings share.
 *
 * A key goes to the platform service and comes back as a status. No component
 * keeps a second copy of the key.
 */

import { useState } from "react";

import { Ban, Volume2 } from "lucide-react";

import { Button } from "@september/ui/components/button";
import { Input } from "@september/ui/components/input";

import type { SETUP_MODES } from "@platform/rules/onboarding";
import {
  connectProvider,
  type Provider,
  type ProviderStatus,
} from "@platform/services/os";

const MODE_ACCENT = {
  amber: { edge: "border-t-amber-600", badge: "bg-amber-100 text-amber-700" },
  sky: { edge: "border-t-sky-600", badge: "bg-sky-100 text-sky-700" },
} as const;

/**
 * One mode, as a card. Setup and settings both ask the same question, so the
 * card is written one time.
 */
export function ModeCard({
  option,
  selected,
  onChoose,
}: {
  option: (typeof SETUP_MODES)[number];
  selected: boolean;
  onChoose: () => void;
}) {
  const accent = MODE_ACCENT[option.accent];

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onChoose}
      className={`relative grid content-start gap-4 rounded-xl border border-t-4 bg-white p-6 text-left shadow-sm focus-visible:ring-[3px] focus-visible:ring-indigo-500/50 focus-visible:outline-none ${accent.edge} ${
        selected
          ? "border-indigo-600 ring-[3px] ring-indigo-500/40"
          : "border-zinc-200 hover:border-indigo-300"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-4 right-4 flex size-5 items-center justify-center rounded-full border text-xs ${
          selected
            ? "border-indigo-600 bg-indigo-600 text-white"
            : "border-zinc-200"
        }`}
      >
        {selected ? "\u2713" : ""}
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
          <li key={bullet} className="grid grid-cols-[8px_minmax(0,1fr)] gap-3">
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
}

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
  if (status.detail) return <Status tone="bad" text="Key did not work" />;
  return <Status tone="idle" text="Needs a key" />;
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
          aria-label={`${name} key`}
          placeholder={`Paste your ${name} key`}
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
          {problem}
        </p>
      )}
    </>
  );
}
