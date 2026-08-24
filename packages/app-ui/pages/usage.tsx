import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@september/ui/components/button";
import {
  formatCost,
  formatCount,
  QuietStat,
  TimeRangeSelect,
  UsageCard,
} from "@september/app-ui/blocks/usage";
import { downloadUsageCsv, useElevenLabsQuota, useUsage } from "@platform/services/usage";
import type { SpendBucket, TimeRange } from "@september/core/rules/usage-summary";

const SHORT_LIST = 8;

export function UsageSettings() {
  const [range, setRange] = useState<TimeRange>("month");
  const [showAll, setShowAll] = useState(false);
  const { summary, calls, isPending, error } = useUsage(range);
  const { data: quota } = useElevenLabsQuota();
  const visibleCalls = useMemo(
    () => (showAll ? calls : calls.slice(0, SHORT_LIST)),
    [calls, showAll],
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Usage</h1>
        <p className="text-muted-foreground text-sm">
          What September used in the last 90 days. This report stays on this device.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TimeRangeSelect value={range} onChange={setRange} />
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={calls.length === 0}
          onClick={() => downloadUsageCsv(calls)}
        >
          <Download aria-hidden />
          Download CSV
        </Button>
      </div>

      {isPending ? (
        <div className="bg-muted h-64 animate-pulse rounded-surface" />
      ) : error ? (
        <p className="text-destructive rounded-surface border border-dashed p-8 text-center text-sm">
          {error.message}
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <QuietStat label="Reported spend" value={formatCost(summary.services.total_usd)} />
            <QuietStat
              label="Voice credits"
              value={formatCount(quota?.character_count ?? summary.services.total_credits)}
            />
            <QuietStat label="Tokens" value={formatCount(summary.services.total_tokens)} />
            <QuietStat label="Calls" value={formatCount(summary.services.total_calls)} />
          </div>

          {quota ? (
            <p className="text-muted-foreground text-xs">
              ElevenLabs: {formatCount(quota.character_count)} of{" "}
              {formatCount(quota.character_limit)} credits used
              {quota.resets_at
                ? ` · resets ${new Date(quota.resets_at * 1_000).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}`
                : ""}
            </p>
          ) : null}

          <Breakdown title="Services" rows={summary.services.by_provider} />
          <Breakdown title="Features" rows={summary.services.by_feature} />

          <UsageCard>
            <div className="mb-5">
              <h2 className="text-base font-semibold">Recent calls</h2>
              <p className="text-muted-foreground text-sm">
                Newest first. Message events are not provider calls.
              </p>
            </div>
            {visibleCalls.length === 0 ? (
              <p className="text-muted-foreground rounded-control border border-dashed p-6 text-sm">
                No service calls in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="text-muted-foreground border-b text-xs">
                    <tr>
                      <th className="pb-3 font-medium">When</th>
                      <th className="pb-3 font-medium">Feature</th>
                      <th className="pb-3 font-medium">Service</th>
                      <th className="pb-3 text-right font-medium">Units</th>
                      <th className="pb-3 text-right font-medium">Latency</th>
                      <th className="pb-3 text-right font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visibleCalls.map((call) => (
                      <tr key={call.id}>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {new Date(call.timestamp).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 pr-4 capitalize">{call.feature}</td>
                        <td className="py-3 pr-4">
                          <div className="font-medium capitalize">{call.provider}</div>
                          <div className="text-muted-foreground max-w-52 truncate text-xs">{call.model}</div>
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          {call.characters !== undefined
                            ? `${formatCount(call.characters)} chars`
                            : `${formatCount((call.input_tokens ?? 0) + (call.output_tokens ?? 0))} tokens`}
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">{formatCount(call.latency_ms)} ms</td>
                        <td className="py-3 text-right">
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                            call.success ? "text-foreground" : "text-destructive"
                          }`}>
                            {call.cached ? "Cached" : call.success ? "Done" : "Failed"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {calls.length > SHORT_LIST ? (
              <Button
                type="button"
                variant="ghost"
                className="mt-4 h-11"
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll ? "Show less" : `Show all ${calls.length}`}
              </Button>
            ) : null}
          </UsageCard>
        </>
      )}
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: Record<string, SpendBucket> }) {
  const entries = Object.entries(rows).sort((left, right) => right[1].calls - left[1].calls);
  const largest = entries[0]?.[1].calls ?? 1;
  return (
    <UsageCard>
      <h2 className="mb-5 text-base font-semibold">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing to show in this period.</p>
      ) : (
        <div className="space-y-4">
          {entries.map(([name, bucket]) => (
            <div key={name} className="grid gap-2 sm:grid-cols-[minmax(120px,0.45fr)_1fr_auto] sm:items-center">
              <span className="truncate text-sm font-medium capitalize">{name}</span>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${Math.max(4, (bucket.calls / largest) * 100)}%` }}
                />
              </div>
              <span className="text-muted-foreground text-right text-xs">
                {formatCount(bucket.calls)} calls · {bucket.source}
              </span>
            </div>
          ))}
        </div>
      )}
    </UsageCard>
  );
}
