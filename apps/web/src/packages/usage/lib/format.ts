/** Number formatting shared by the dashboard card and the usage page. */

import type { Cost, CostSource } from './pricing';

/**
 * The cost to display for an aggregate.
 *
 * A bucket of quota or unpriced calls has `cost_usd: 0` because nothing priced
 * was added to it — showing that as `$0.00` would claim the calls were free.
 */
export function bucketCost(bucket: { cost_usd: number; source: CostSource }): Cost {
  if (bucket.source === 'quota' || bucket.source === 'unknown') return { source: bucket.source };

  return { amount_usd: bucket.cost_usd, source: bucket.source };
}

export function formatWhole(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function formatCompact(value: number): string {
  if (value < 1000) return formatWhole(value);
  if (value < 1_000_000) {
    return `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`;
  }
  return `${(value / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
}

/** Audio length, as a listener would read it. */
export function formatDuration(seconds: number): string {
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}

export function percentOf(value: number, total: number): number {
  if (total <= 0) return 0;
  return (value / total) * 100;
}
