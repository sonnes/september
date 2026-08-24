import { useState } from "react";
import { Activity, Keyboard, Sparkles } from "lucide-react";

import { Screen } from "@september/app-ui/blocks/screen";
import {
  formatCost,
  formatCount,
  QuietStat,
  TimeRangeSelect,
  UsageCard,
} from "@september/app-ui/blocks/usage";
import { useElevenLabsQuota, useUsage } from "@platform/services/usage";
import type { TimeRange } from "@september/core/rules/usage-summary";

export function DashboardScreen() {
  const [range, setRange] = useState<TimeRange>("week");
  const { summary, isPending, error } = useUsage(range);
  const { data: quota } = useElevenLabsQuota();
  const label = range === "day" ? "today" : `this ${range}`;

  return (
    <Screen
      title="Dashboard"
      description="Typing saved and service use, kept on this device."
      action={<TimeRangeSelect value={range} onChange={setRange} />}
      wide
    >
      {isPending ? (
        <div className="grid gap-6">
          <div className="bg-muted h-72 animate-pulse rounded-surface" />
          <div className="bg-muted h-72 animate-pulse rounded-surface" />
        </div>
      ) : error ? (
        <p className="text-destructive rounded-surface border border-dashed p-8 text-center text-sm">
          {error.message}
        </p>
      ) : (
        <div className="grid gap-6">
          <UsageCard className="bg-primary/5 md:grid md:grid-cols-[minmax(0,1fr)_minmax(240px,0.62fr)] md:items-end md:gap-10">
            <div className="space-y-5">
              <div className="text-primary flex items-center gap-2 text-sm font-bold">
                <Keyboard className="size-4" aria-hidden />
                Efficiency
              </div>
              <div className="text-7xl leading-none font-bold md:text-8xl">
                {Math.round(summary.messages.efficiency)}%
              </div>
              <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">
                less typing {label}. You typed{" "}
                <strong className="text-foreground font-semibold">
                  {formatCount(summary.messages.total_keys_typed)} keys
                </strong>{" "}
                to say{" "}
                <strong className="text-foreground font-semibold">
                  {formatCount(summary.messages.total_text_length)} characters
                </strong>
                .
              </p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 md:mt-0 md:grid-cols-1">
              <QuietStat
                label="Keystrokes saved"
                value={formatCount(summary.messages.keystrokes_saved)}
              />
              <QuietStat
                label="Messages spoken"
                value={formatCount(summary.messages.total_messages)}
              />
            </div>
          </UsageCard>

          <UsageCard>
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="space-y-4">
                <div className="text-primary flex items-center gap-2 text-sm font-bold">
                  <Activity className="size-4" aria-hidden />
                  Service use
                </div>
                <div className="text-5xl leading-none font-bold md:text-6xl">
                  {formatCost(summary.services.total_usd)}
                </div>
                <p className="text-muted-foreground text-sm">
                  Reported pay-as-you-go spend {label}. Free and prepaid calls stay in their own units.
                </p>
              </div>
              <div className="grid min-w-64 grid-cols-2 gap-3">
                <QuietStat label="Calls" value={formatCount(summary.services.total_calls)} />
                <QuietStat label="Tokens" value={formatCount(summary.services.total_tokens)} />
              </div>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {Object.entries(summary.services.by_provider).length === 0 ? (
                <p className="text-muted-foreground rounded-control border border-dashed p-6 text-sm md:col-span-2">
                  No service calls yet {label}. Your first suggestion or spoken message will appear here.
                </p>
              ) : (
                Object.entries(summary.services.by_provider).map(([provider, bucket]) => (
                  <div key={provider} className="flex min-h-16 items-center gap-3 rounded-control border px-4 py-3">
                    <Sparkles className="text-muted-foreground size-4" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold capitalize">{provider}</div>
                      <div className="text-muted-foreground text-xs">
                        {formatCount(bucket.calls)} calls · {bucket.source}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{formatCost(bucket.cost_usd)}</div>
                  </div>
                ))
              )}
            </div>

            {quota ? <Quota quota={quota} /> : null}
          </UsageCard>
        </div>
      )}
    </Screen>
  );
}

function Quota({ quota }: { quota: NonNullable<ReturnType<typeof useElevenLabsQuota>["data"]> }) {
  const percent = quota.character_limit
    ? Math.min(100, (quota.character_count / quota.character_limit) * 100)
    : 0;
  return (
    <div className="mt-8 space-y-2 border-t pt-6">
      <div className="flex justify-between gap-4 text-sm">
        <span className="font-semibold">ElevenLabs allowance</span>
        <span className="text-muted-foreground">
          {formatCount(quota.character_count)} of {formatCount(quota.character_limit)} credits
        </span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full" aria-label={`${Math.round(percent)}% used`}>
        <div className="bg-primary h-full rounded-full" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
