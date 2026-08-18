'use client';

import { useMemo, useState } from 'react';

import { Download } from 'lucide-react';

import { saveFile } from '@/packages/shared/lib/data';
import { Button } from '@/packages/ui/components/button';
import { Card } from '@/packages/ui/components/card';

import { useElevenLabsQuota } from '../hooks/use-elevenlabs-quota';
import { useRecentCalls } from '../hooks/use-recent-calls';
import { toCsv } from '../lib/csv';
import { formatCompact, formatWhole, percentOf } from '../lib/format';
import { formatCost } from '../lib/pricing';
import { TimeRange, useAnalyticsSummary } from '../use-summary';
import { RecentCallsTable } from './recent-calls';
import { FeatureBars, ServiceTable } from './service-table';
import { TimeRangeSelector } from './time-range-selector';

const SHORT_LIST = 8;

/**
 * Everything September sent to a provider in the range, and what it cost.
 *
 * The dashboard answers "how much?"; this page answers "on what, exactly?" —
 * per service, per feature, and per call, with a CSV for reconciling against
 * the provider's own invoice.
 */
export function UsageReport({ userId }: { userId?: string }) {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [showAll, setShowAll] = useState(false);

  const { summary, isLoading } = useAnalyticsSummary({ userId, timeRange });
  const { data: recentCalls } = useRecentCalls({ userId, timeRange, limit: 200 });
  const { data: quota } = useElevenLabsQuota();

  const rangeLabel = timeRange === 'day' ? 'today' : `this ${timeRange}`;
  const spend = summary?.spend;

  const visibleCalls = useMemo(
    () => (showAll ? recentCalls : recentCalls.slice(0, SHORT_LIST)),
    [recentCalls, showAll]
  );

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      <Button
        variant="outline"
        size="lg"
        disabled={recentCalls.length === 0}
        onClick={() => void downloadCsv(toCsv(recentCalls), timeRange)}
      >
        <Download className="size-4" />
        Download CSV
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="h-64 animate-pulse rounded-surface bg-muted" />
      </div>
    );
  }

  if (!spend || spend.total_calls === 0) {
    return (
      <div className="space-y-6">
        {header}
        <Card className="rounded-surface p-8 text-center">
          <p className="text-base font-semibold text-foreground">No calls yet {rangeLabel}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            As soon as September asks a service for something, it shows up here with what it used
            and what it cost.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <div data-usage="totals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Total
          label="Estimated spend"
          value={formatCost({ amount_usd: spend.total_usd, source: 'estimated' })}
          detail="Pay-as-you-go providers"
        />
        <Total
          label="Voice credits"
          value={formatWhole(quota?.used ?? spend.total_credits)}
          detail={
            quota
              ? `of ${formatWhole(quota.limit)}${
                  quota.resets_at
                    ? ` · resets ${quota.resets_at.toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                      })}`
                    : ''
                }`
              : 'Prepaid with your plan'
          }
        />
        <Total
          label="Tokens"
          value={formatCompact(spend.total_tokens)}
          detail={`${formatCompact(summary.ai_generations.total_input_tokens)} in · ${formatCompact(
            summary.ai_generations.total_output_tokens
          )} out`}
        />
        <Total
          label="Calls"
          value={formatWhole(spend.total_calls)}
          detail={`${formatWhole(spend.failed_calls)} failed · ${formatWhole(
            spend.cached_calls
          )} served from cache`}
        />
      </div>

      <Card className="gap-4 rounded-surface p-6">
        <Section title="By service" description="One row per provider and model actually used." />
        <ServiceTable
          byModel={spend.by_model}
          totalUsd={spend.total_usd}
          totalCalls={spend.total_calls}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card className="gap-4 rounded-surface p-6">
          <Section title="What it went on" description="Share of pay-as-you-go spend." />
          <FeatureBars byFeature={spend.by_feature} />
        </Card>

        <Card data-usage="plan" className="gap-4 rounded-surface p-6">
          <Section
            title="ElevenLabs plan"
            description="Read from your ElevenLabs account, not estimated."
          />
          {quota ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Credits used</span>
                <span className="tabular-nums">
                  <strong className="font-semibold text-foreground">
                    {formatWhole(quota.used)}
                  </strong>{' '}
                  <span className="text-muted-foreground">/ {formatWhole(quota.limit)}</span>
                </span>
              </div>
              <div className="h-3.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${Math.min(100, percentOf(quota.used, quota.limit))}%` }}
                />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {quota.tier} plan
                {quota.resets_at && (
                  <>
                    {' '}
                    · resets{' '}
                    {quota.resets_at.toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </>
                )}{' '}
                · {formatWhole(Math.max(0, quota.limit - quota.used))} left
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Connect ElevenLabs to see your credit balance here. Speaking on this device stays
              free.
            </p>
          )}
        </Card>
      </div>

      <Card className="gap-4 rounded-surface p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Section
            title="Recent calls"
            description="Everything September sent out, newest first."
          />
          {recentCalls.length > SHORT_LIST && (
            <Button variant="outline" size="sm" onClick={() => setShowAll(value => !value)}>
              {showAll ? 'Show fewer' : `Show all ${formatWhole(recentCalls.length)}`}
            </Button>
          )}
        </div>
        <RecentCallsTable calls={visibleCalls} />
      </Card>

      {spend.unknown_price_models.length > 0 && (
        <p className="text-sm text-muted-foreground">
          We have no price for {spend.unknown_price_models.join(', ')}. Those calls are counted, but
          left out of the spend total rather than guessed at.
        </p>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Estimates come from a price list shipped with September and can drift when providers change
        their prices. OpenRouter reports the exact cost of each call, and that is what we store.
        ElevenLabs bills prepaid credits, so its calls have no per-call price. All of this is stored
        on this device only.
      </p>
    </div>
  );
}

function Total({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="gap-1 rounded-surface p-5">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="text-3xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{detail}</div>
    </Card>
  );
}

function Section({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

async function downloadCsv(csv: string, timeRange: TimeRange): Promise<void> {
  await saveFile(new Blob([csv], { type: 'text/csv' }), `september-usage-${timeRange}.csv`);
}
