'use client';

import { useState } from 'react';

import { useAccountContext } from '@/packages/account';

import { useAnalyticsSummary } from '../hooks/use-analytics-summary';
import { TimeRange } from '../lib/utils';
import { MetricCard } from './metric-card';
import { ProviderUsageChart } from './provider-usage-chart';
import { TimeRangeSelector } from './time-range-selector';

export function DashboardStats() {
  const { user } = useAccountContext();
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const { summary, isLoading } = useAnalyticsSummary({ userId: user?.id, timeRange });

  if (isLoading) {
    return <DashboardStatsSkeleton />;
  }

  if (!summary) {
    return <div className="text-center text-muted-foreground">No analytics data available</div>;
  }

  const messagesSent = summary.messages.total_messages;
  const keysTyped = summary.messages.total_keys_typed;
  const keystrokesSaved = summary.messages.total_text_length - summary.messages.total_keys_typed;
  const efficiency = Math.round(summary.messages.efficiency);

  // Format AI provider data for the chart
  const aiByProvider = Object.entries(summary.ai_generations.by_provider).map(
    ([provider, stats]) => ({
      provider,
      calls: stats.count,
      tokens: 0,
      chars: 0,
    })
  );

  // Format TTS provider data for the chart
  const ttsByProvider = Object.entries(summary.tts_generations.by_provider).map(
    ([provider, stats]) => ({
      provider,
      calls: stats.count,
      tokens: 0,
      chars: 0,
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Usage Statistics</h2>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Messages" value={messagesSent} />
        <MetricCard title="Keys Typed" value={keysTyped} />
        <MetricCard title="Keystrokes Saved" value={keystrokesSaved} />
        <MetricCard title="Efficiency" value={efficiency} format="percentage" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium mb-4">AI Provider Usage</h3>
          <ProviderUsageChart data={aiByProvider} />
        </div>
        <div>
          <h3 className="text-sm font-medium mb-4">TTS Provider Usage</h3>
          <ProviderUsageChart data={ttsByProvider} />
        </div>
      </div>
    </div>
  );
}

function DashboardStatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
