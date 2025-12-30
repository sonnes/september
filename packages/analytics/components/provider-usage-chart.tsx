'use client';

import React from 'react';

interface ProviderData {
  provider: string;
  calls: number;
  tokens: number;
  chars: number;
}

interface ProviderUsageChartProps {
  data: ProviderData[];
  valueKey?: 'calls' | 'tokens' | 'chars';
}

/**
 * Chart component showing provider usage breakdown with progress bars
 * Displays usage data by provider with percentage breakdown
 *
 * @param data - Array of provider usage data
 * @param valueKey - Which value to display ('calls', 'tokens', or 'chars')
 */
export function ProviderUsageChart({
  data,
  valueKey = 'calls',
}: ProviderUsageChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">No provider usage data available</p>
      </div>
    );
  }

  // Sort by value descending
  const sortedData = [...data].sort((a, b) => b[valueKey] - a[valueKey]);

  // Calculate total and percentages
  const total = sortedData.reduce((sum, item) => sum + item[valueKey], 0);
  const dataWithPercentages = sortedData.map((item) => ({
    ...item,
    percentage: total > 0 ? (item[valueKey] / total) * 100 : 0,
  }));

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-4">
        <p className="text-sm font-medium">Provider Usage</p>
        <div className="space-y-3">
          {dataWithPercentages.map((item) => (
            <div key={item.provider} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.provider}</span>
                <span className="text-muted-foreground">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
