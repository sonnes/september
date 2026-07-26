'use client';

import { useElevenLabsQuota } from '../hooks/use-elevenlabs-quota';
import { formatWhole, percentOf } from '../lib/format';
import { isOnDevice } from '../lib/labels';
import { formatCost } from '../lib/pricing';
import { useAnalyticsSummary } from '../use-summary';

/**
 * What one connected provider has cost this month, shown beside its key.
 *
 * "Is this key costing me anything?" gets asked on the Setup page, so it is
 * answered there rather than only on the dashboard. Renders nothing when the
 * provider has not been used — a chip reading `$0.00` would be noise.
 */
export function ProviderSpendChip({ provider, userId }: { provider: string; userId?: string }) {
  const { summary } = useAnalyticsSummary({ userId, timeRange: 'month' });
  const { data: quota } = useElevenLabsQuota();

  const bucket = summary?.spend.by_provider[provider];
  if (!bucket || bucket.calls === 0) return null;

  const label = chipLabel({
    provider,
    source: bucket.source,
    costUsd: bucket.cost_usd,
    credits: bucket.credits,
    quota: provider === 'elevenlabs' ? quota : undefined,
  });

  if (!label) return null;

  const tone =
    bucket.source === 'quota'
      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40'
      : isOnDevice(provider)
        ? 'bg-primary/10 text-primary'
        : 'bg-muted text-foreground';

  return (
    <span
      className={`inline-flex h-7 shrink-0 items-center rounded-full px-3 text-xs font-semibold tabular-nums ${tone}`}
    >
      {label}
    </span>
  );
}

function chipLabel({
  provider,
  source,
  costUsd,
  credits,
  quota,
}: {
  provider: string;
  source: string;
  costUsd: number;
  credits: number;
  quota?: { used: number; limit: number };
}): string | undefined {
  if (isOnDevice(provider)) return 'Always free';

  if (source === 'quota') {
    if (quota && quota.limit > 0) {
      return `${Math.round(percentOf(quota.used, quota.limit))}% of credits`;
    }
    return credits > 0 ? `${formatWhole(credits)} credits` : undefined;
  }

  if (source === 'unknown') return undefined;

  // An estimate says so; a provider-reported figure stands on its own.
  const prefix = source === 'estimated' ? '~' : '';
  return `${prefix}${formatCost({ amount_usd: costUsd, source: 'estimated' })} this month`;
}
