'use client';

import { useState } from 'react';

import { useAnalyticsSummary } from '../hooks/use-analytics-summary';
import { TimeRange } from '../lib/utils';
import { MetricCard } from './metric-card';
import { ProviderUsageChart } from './provider-usage-chart';
import { TimeRangeSelector } from './time-range-selector';

export function DashboardStats() {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const { summary, isLoading } = useAnalyticsSummary({ timeRange });

  if (isLoading) {
    return <DashboardStatsSkeleton />;
  }

  if (!summary) {
    return (
      <div className="text-center text-muted-foreground">
        No analytics data available
      </div>
    );
  }

  const messagesSent = summary.messages.total_messages;
  const messagesWithVoice = summary.messages.messages_with_voice;
  const efficiencyPercent = summary.messages.autocomplete_adoption_rate;
  const aiGenerations = summary.ai_generations.total_generations;

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
        <MetricCard
          title="Messages Sent"
          value={messagesSent}
        />
        <MetricCard
          title="Messages with Voice"
          value={messagesWithVoice}
        />
        <MetricCard
          title="Autocomplete Adoption"
          value={efficiencyPercent}
          format="percentage"
        />
        <MetricCard
          title="AI Calls"
          value={aiGenerations}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium mb-4">AI Provider Usage</h3>
          <ProviderUsageChart
            data={aiByProvider}
          />
        </div>
        <div>
          <h3 className="text-sm font-medium mb-4">TTS Provider Usage</h3>
          <ProviderUsageChart
            data={ttsByProvider}
          />
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
