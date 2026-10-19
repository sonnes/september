import type { KeyboardEvent } from "react";

import { ChoiceKey } from "@september/app-ui/blocks/pick-list";
import type { CostSource, TimeRange } from "@september/core/rules/usage-summary";

export const formatCount = (value: number) =>
  new Intl.NumberFormat(undefined, { notation: value >= 10_000 ? "compact" : "standard" })
    .format(Math.round(value));

/** The plain word for a cost source. The stored value is an identifier, not copy. */
export const sourceLabel = (source: CostSource): string =>
  ({ measured: "exact", estimated: "estimate", free: "free", quota: "credits", unknown: "—" })[
    source
  ] ?? source;

/** The name a screen shows for a stored service id. */
export const providerLabel = (id: string): string =>
  ({
    openrouter: "OpenRouter",
    elevenlabs: "ElevenLabs",
    apple: "Apple Intelligence",
    system: "System voice",
    unknown: "Unknown",
  })[id] ?? id;

export const formatCost = (value: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);

const PERIODS: readonly { value: TimeRange; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

/**
 * The period of a report, as three keys. A dwell and a scan cannot open a
 * dropdown that closes when the gaze moves, so each period is a key. The
 * arrow keys move between the periods, as in every radio group.
 */
export function TimeRangeSelect({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}) {
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const at = PERIODS.findIndex((period) => period.value === value);
    const next = (at + step + PERIODS.length) % PERIODS.length;
    onChange(PERIODS[next].value);
    event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Usage period"
      onKeyDown={move}
      className="flex flex-wrap gap-2"
    >
      {PERIODS.map((period) => (
        <ChoiceKey
          key={period.value}
          checked={period.value === value}
          tabbable={period.value === value}
          onChoose={() => onChange(period.value)}
          className="text-sm font-semibold"
        >
          {period.label}
        </ChoiceKey>
      ))}
    </div>
  );
}

export function UsageCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-surface border bg-card p-6 shadow-sm md:p-8 ${className}`}>
      {children}
    </section>
  );
}

export function QuietStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control border bg-background/80 p-4">
      <div className="text-muted-foreground text-sm font-medium">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

