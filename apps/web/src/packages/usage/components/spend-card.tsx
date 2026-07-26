'use client';

import { Link } from '@tanstack/react-router';

import { Card } from '@/packages/ui/components/card';

import { useElevenLabsQuota } from '../hooks/use-elevenlabs-quota';
import { bucketCost, formatCompact, formatWhole, percentOf } from '../lib/format';
import { isOnDevice, providerLabel } from '../lib/labels';
import { formatCost } from '../lib/pricing';
import { SpendBucket, SpendStats } from '../use-summary';
import { CostSourceBadge } from './cost-source-badge';

/** Colours for the provider split bar — chart tokens, in order of spend. */
const SWATCHES = ['bg-primary', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];

interface SpendCardProps {
  spend: SpendStats;
  /** "today" / "this week" / "this month" */
  rangeLabel: string;
}

/**
 * What the user's own API keys were charged, and by whom.
 *
 * Money leads; tokens are the supporting line. Prepaid voice credits get their
 * own meter rather than being folded into dollars they were never billed in.
 */
export function SpendCard({ spend, rangeLabel }: SpendCardProps) {
  const { data: quota } = useElevenLabsQuota();

  const entries = Object.entries(spend.by_provider);
  const paid = entries
    .filter(([provider, bucket]) => !isOnDevice(provider) && bucket.source !== 'quota')
    .sort(([, a], [, b]) => b.cost_usd - a.cost_usd);
  const onDeviceCalls = entries
    .filter(([provider]) => isOnDevice(provider))
    .reduce((total, [, bucket]) => total + bucket.calls, 0);

  return (
    <Card
      data-dashboard-card="spend"
      className="grid gap-10 rounded-surface p-8 py-8 shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)] md:items-end"
    >
      <div className="space-y-5">
        <div className="text-sm font-bold text-primary">Spend</div>
        <div className="text-7xl leading-none font-bold tracking-normal text-foreground tabular-nums md:text-8xl">
          {formatCost({ amount_usd: spend.total_usd, source: 'estimated' })}
        </div>
        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
          on pay-as-you-go AI {rangeLabel} —{' '}
          <strong className="font-semibold text-foreground">
            {formatCompact(spend.total_tokens)} tokens
          </strong>{' '}
          across{' '}
          <strong className="font-semibold text-foreground">
            {formatWhole(spend.total_calls)} calls
          </strong>
          . Charged by your providers to your own keys — September never bills you.
        </p>
      </div>

      <div className="space-y-4">
        <SplitBar buckets={paid.map(([, bucket]) => bucket)} total={spend.total_usd} />

        <div className="space-y-3">
          {paid.map(([provider, bucket], index) => (
            <ProviderRow
              key={provider}
              swatch={SWATCHES[index % SWATCHES.length]}
              label={providerLabel(provider)}
              bucket={bucket}
            />
          ))}

          {onDeviceCalls > 0 && (
            <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-sm bg-muted-foreground/40" />
                On this device
              </span>
              <span>
                <strong className="font-semibold text-foreground">free</strong>
                <span className="text-muted-foreground"> · {formatWhole(onDeviceCalls)} calls</span>
              </span>
            </div>
          )}
        </div>

        <CreditsMeter
          used={quota?.used ?? spend.total_credits}
          limit={quota?.limit}
          resetsAt={quota?.resets_at}
        />

        {spend.unknown_price_models.length > 0 && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            No price on file for {spend.unknown_price_models.join(', ')} — those calls are counted,
            not costed.
          </p>
        )}

        <div className="flex justify-end pt-1">
          <Link
            to="/settings/usage"
            className="rounded-control px-2 py-1 text-sm font-medium text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            See every call →
          </Link>
        </div>
      </div>
    </Card>
  );
}

function SplitBar({ buckets, total }: { buckets: SpendBucket[]; total: number }) {
  return (
    <div className="flex h-5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
      {buckets.map((bucket, index) => (
        <div
          key={index}
          className={SWATCHES[index % SWATCHES.length]}
          style={{ width: `${percentOf(bucket.cost_usd, total)}%` }}
        />
      ))}
    </div>
  );
}

function ProviderRow({
  swatch,
  label,
  bucket,
}: {
  swatch: string;
  label: string;
  bucket: SpendBucket;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <span className="flex min-w-0 items-center gap-2">
        <span className={`size-2.5 shrink-0 rounded-sm ${swatch}`} />
        <span className="truncate">{label}</span>
      </span>
      <span className="flex items-center gap-2">
        <strong className="font-semibold text-foreground tabular-nums">
          {formatCost(bucketCost(bucket))}
        </strong>
        <CostSourceBadge source={bucket.source} />
      </span>
    </div>
  );
}

/**
 * ElevenLabs credits, read from the account when a key is connected. Without a
 * plan to compare against there is no meter to draw.
 */
function CreditsMeter({
  used,
  limit,
  resetsAt,
}: {
  used: number;
  limit?: number;
  resetsAt?: Date;
}) {
  if (used <= 0) return null;

  return (
    <div className="space-y-2 border-t pt-4">
      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>Voice credits</span>
        <span className="tabular-nums">
          <strong className="font-semibold text-foreground">{formatWhole(used)}</strong>
          {limit !== undefined && <> / {formatWhole(limit)}</>}
        </span>
      </div>

      {limit !== undefined && (
        <>
          <div className="h-3.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-amber-500"
              style={{ width: `${Math.min(100, percentOf(used, limit))}%` }}
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Prepaid with your plan
            {resetsAt && <> — resets {resetsAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</>}
            . No extra charge until it runs out.
          </p>
        </>
      )}
    </div>
  );
}
