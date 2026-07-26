'use client';

import { RecentCall } from '../hooks/use-recent-calls';
import { formatCompact, formatDuration, formatWhole } from '../lib/format';
import { featureLabel, providerLabel } from '../lib/labels';
import { formatCost } from '../lib/pricing';

/** What a single call consumed, in the unit its provider bills. */
function describeCall(call: RecentCall): string {
  if (call.characters !== undefined) {
    return call.credits !== undefined
      ? `${formatWhole(call.characters)} chars → ${formatWhole(call.credits)} credits`
      : `${formatWhole(call.characters)} chars`;
  }
  if (call.audio_seconds !== undefined) return `${formatDuration(call.audio_seconds)} audio`;
  if (call.input_tokens !== undefined || call.output_tokens !== undefined) {
    return `${formatCompact(call.input_tokens ?? 0)} → ${formatCompact(call.output_tokens ?? 0)} tok`;
  }
  return '—';
}

/** Plain-language outcome. Failures read as something that happened, not a stack trace. */
function describeResult(call: RecentCall): { label: string; tone: string } {
  if (!call.success) return { label: 'Busy — retried', tone: 'bg-destructive' };
  if (call.cached) return { label: 'Reused answer', tone: 'bg-primary/60' };
  return { label: 'Done', tone: 'bg-emerald-500' };
}

export function RecentCallsTable({ calls }: { calls: RecentCall[] }) {
  return (
    <div data-usage="recent" className="overflow-x-auto">
      {/* Latency rides under the timestamp: a seventh column pushed the result
          off the edge at the width this card actually gets. */}
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead>
          <tr className="border-b text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <th className="py-2 pr-3 text-left font-medium">Time</th>
            <th className="py-2 pr-3 text-left font-medium">Used for</th>
            <th className="py-2 pr-3 text-left font-medium">Service</th>
            <th className="py-2 pr-3 text-right font-medium">Usage</th>
            <th className="py-2 pr-3 text-right font-medium">Cost</th>
            <th className="py-2 text-left font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {calls.map(call => {
            const result = describeResult(call);

            return (
              <tr key={call.id} className="border-b last:border-0">
                <td className="py-3 pr-3 whitespace-nowrap text-muted-foreground tabular-nums">
                  <div>{call.timestamp.toLocaleTimeString([], { timeStyle: 'short' })}</div>
                  <div className="text-xs">{(call.latency_ms / 1000).toFixed(2)} s</div>
                </td>
                <td className="py-3 pr-3">{featureLabel(call.feature)}</td>
                <td className="py-3 pr-3">
                  <div className="text-foreground">{providerLabel(call.provider)}</div>
                  <div className="text-xs break-all text-muted-foreground">{call.model}</div>
                </td>
                <td className="py-3 pr-3 text-right tabular-nums">{describeCall(call)}</td>
                <td className="py-3 pr-3 text-right tabular-nums">
                  {formatCost({ amount_usd: call.cost_usd, source: call.cost_source })}
                </td>
                <td className="py-3">
                  <span
                    className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground"
                    title={call.error_message}
                  >
                    <span className={`size-2 shrink-0 rounded-full ${result.tone}`} />
                    {result.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
