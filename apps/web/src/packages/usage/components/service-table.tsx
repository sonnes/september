'use client';

import { bucketCost, formatCompact, formatDuration, formatWhole } from '../lib/format';
import { featureLabel, providerLabel } from '../lib/labels';
import { formatCost } from '../lib/pricing';
import { SpendBucket } from '../use-summary';
import { CostSourceBadge } from './cost-source-badge';

/** Describe what a bucket consumed, in whichever unit its provider bills. */
export function describeUsage(bucket: SpendBucket): string {
  const parts: string[] = [];

  if (bucket.input_tokens > 0) parts.push(`${formatCompact(bucket.input_tokens)} in`);
  if (bucket.output_tokens > 0) parts.push(`${formatCompact(bucket.output_tokens)} out`);
  if (bucket.credits > 0) parts.push(`${formatWhole(bucket.credits)} credits`);
  else if (bucket.characters > 0) parts.push(`${formatWhole(bucket.characters)} chars`);
  if (bucket.audio_seconds > 0) parts.push(`${formatDuration(bucket.audio_seconds)} audio`);

  return parts.length > 0 ? parts.join(' · ') : '—';
}

interface ServiceTableProps {
  /** Keyed `provider:model`. */
  byModel: Record<string, SpendBucket>;
  totalUsd: number;
  totalCalls: number;
}

/** One row per provider and model actually used in the range. */
export function ServiceTable({ byModel, totalUsd, totalCalls }: ServiceTableProps) {
  const rows = Object.entries(byModel).sort(([, a], [, b]) => b.cost_usd - a.cost_usd || b.calls - a.calls);

  return (
    <div data-usage="by-service" className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <th className="py-2 pr-3 text-left font-medium">Service</th>
            <th className="py-2 pr-3 text-right font-medium">Calls</th>
            <th className="py-2 pr-3 text-right font-medium">Usage</th>
            <th className="py-2 pr-3 text-right font-medium">Cost</th>
            <th className="py-2 text-left font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, bucket]) => {
            const [provider, ...rest] = key.split(':');
            const model = rest.join(':');

            return (
              <tr key={key} className="border-b last:border-0">
                <td className="py-3 pr-3">
                  <div className="font-semibold text-foreground">{providerLabel(provider)}</div>
                  <div className="text-xs text-muted-foreground">{model}</div>
                </td>
                <td className="py-3 pr-3 text-right tabular-nums">{formatWhole(bucket.calls)}</td>
                <td className="py-3 pr-3 text-right tabular-nums">{describeUsage(bucket)}</td>
                <td className="py-3 pr-3 text-right tabular-nums">
                  {formatCost(bucketCost(bucket))}
                </td>
                <td className="py-3">
                  <CostSourceBadge source={bucket.source} />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-semibold text-foreground">
            <td className="pt-3 pr-3">Total</td>
            <td className="pt-3 pr-3 text-right tabular-nums">{formatWhole(totalCalls)}</td>
            <td />
            <td className="pt-3 pr-3 text-right tabular-nums">
              {formatCost({ amount_usd: totalUsd, source: 'estimated' })}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

interface FeatureBarsProps {
  byFeature: Record<string, SpendBucket>;
}

/** Where the money went, in the words the app uses elsewhere. */
export function FeatureBars({ byFeature }: FeatureBarsProps) {
  const rows = Object.entries(byFeature).sort(([, a], [, b]) => b.cost_usd - a.cost_usd);
  const most = Math.max(...rows.map(([, bucket]) => bucket.cost_usd), 0);

  return (
    <div data-usage="by-feature" className="space-y-4">
      {rows.map(([feature, bucket]) => (
        <div key={feature} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-foreground">{featureLabel(feature)}</span>
            <span className="text-muted-foreground tabular-nums">
              <strong className="font-semibold text-foreground">
                {bucket.source === 'quota'
                  ? `${formatWhole(bucket.credits)} credits`
                  : formatCost(bucketCost(bucket))}
              </strong>{' '}
              · {formatWhole(bucket.calls)} calls
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={bucket.source === 'quota' ? 'h-full bg-amber-500' : 'h-full bg-primary'}
              style={{ width: `${most > 0 ? Math.max(2, (bucket.cost_usd / most) * 100) : 2}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
