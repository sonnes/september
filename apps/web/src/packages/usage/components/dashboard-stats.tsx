'use client';

import { useState } from 'react';

import { TimeRange, useAnalyticsSummary } from '../use-summary';
import { Card } from '@/packages/ui/components/card';
import { TimeRangeSelector } from './time-range-selector';

interface DashboardStatsProps {
  userId?: string;
}

export function DashboardStats({ userId }: DashboardStatsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const { summary, isLoading } = useAnalyticsSummary({ userId, timeRange });

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Usage</h2>
        <p className="text-sm text-muted-foreground">
          Two signals: typing saved and AI tokens used.
        </p>
      </div>
      <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <DashboardStatsSkeleton />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          No analytics data available for this range.
        </div>
      </div>
    );
  }

  const messagesSent = summary.messages.total_messages;
  const keysTyped = summary.messages.total_keys_typed;
  const keystrokesSaved = summary.messages.total_text_length - summary.messages.total_keys_typed;
  const efficiency = Math.round(summary.messages.efficiency);
  const totalTokens = summary.ai_generations.total_tokens;
  const inputTokens = summary.ai_generations.total_input_tokens;
  const outputTokens = summary.ai_generations.total_output_tokens;
  const suggestionTokens = summary.ai_generations.tokens_by_generation_type.suggestions;
  const otherTokens = totalTokens - suggestionTokens;
  const suggestionPct = percentOf(suggestionTokens, totalTokens);
  const otherPct = percentOf(otherTokens, totalTokens);
  const rangeLabel = timeRange === 'day' ? 'today' : `this ${timeRange}`;

  return (
    <div className="space-y-6">
      {header}

      <div className="grid gap-6">
        <Card
          data-dashboard-card="efficiency"
          className="grid gap-10 rounded-lg bg-primary/5 p-8 py-8 shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(240px,0.62fr)] md:items-end"
        >
          <div className="space-y-5">
            <div className="text-sm font-bold text-primary">Efficiency</div>
            <div className="text-7xl font-bold leading-none tracking-normal text-foreground md:text-8xl">
              {efficiency}%
            </div>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              less typing {rangeLabel}. You typed{' '}
              <strong className="font-semibold text-foreground">{formatCompact(keysTyped)} keys</strong>{' '}
              to say{' '}
              <strong className="font-semibold text-foreground">
                {formatCompact(summary.messages.total_text_length)} chars
              </strong>
              .
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            <QuietStat label="Keystrokes saved" value={formatCompact(keystrokesSaved)} />
            <QuietStat label="Messages spoken" value={formatWhole(messagesSent)} />
          </div>
        </Card>

        <Card
          data-dashboard-card="tokens"
          className="grid gap-10 rounded-lg p-8 py-8 shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(260px,0.72fr)] md:items-end"
        >
          <div className="space-y-5">
            <div className="text-sm font-bold text-primary">AI tokens</div>
            <div className="text-7xl font-bold leading-none tracking-normal text-foreground md:text-8xl">
              {formatCompact(totalTokens)}
            </div>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              tokens used {rangeLabel}.{' '}
              <strong className="font-semibold text-foreground">
                {formatCompact(inputTokens)} input
              </strong>
              ,{' '}
              <strong className="font-semibold text-foreground">
                {formatCompact(outputTokens)} output
              </strong>
              .
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex h-5 overflow-hidden rounded-full bg-muted" aria-label="Token split">
              <div className="bg-primary" style={{ width: `${suggestionPct}%` }} />
              <div className="bg-chart-2" style={{ width: `${otherPct}%` }} />
            </div>
            <div className="space-y-3">
              <TokenRow label="Suggestions" value={formatCompact(suggestionTokens)} />
              <TokenRow label="Transcription + memory" value={formatCompact(otherTokens)} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-6">
      {[1, 2].map(i => (
        <div key={i} className="h-80 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function QuietStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/70 p-4">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function TokenRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <span>{label}</span>
      <strong className="font-semibold text-foreground">{value}</strong>
    </div>
  );
}

function formatWhole(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatCompact(value: number): string {
  if (value < 1000) return formatWhole(value);
  return `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`;
}

function percentOf(value: number, total: number): number {
  if (total <= 0) return 0;
  return (value / total) * 100;
}
