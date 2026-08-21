import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TimeRange } from "@/rules/usage-summary";

export const formatCount = (value: number) =>
  new Intl.NumberFormat(undefined, { notation: value >= 10_000 ? "compact" : "standard" })
    .format(Math.round(value));

export const formatCost = (value: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);

export function TimeRangeSelect({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as TimeRange)}>
      <SelectTrigger className="h-11 min-w-32" aria-label="Usage period">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="day">Today</SelectItem>
        <SelectItem value="week">This week</SelectItem>
        <SelectItem value="month">This month</SelectItem>
      </SelectContent>
    </Select>
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

