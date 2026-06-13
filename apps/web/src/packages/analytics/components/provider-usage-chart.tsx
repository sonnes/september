'use client';

import React from 'react';

interface ProviderUsageChartProps {
  data: { provider: string; calls: number }[];
}

export function ProviderUsageChart({ data }: ProviderUsageChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">No provider usage data available</p>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.calls - a.calls);
  const total = sorted.reduce((s, item) => s + item.calls, 0);

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-4">
        <p className="text-sm font-medium">Provider Usage</p>
        <div className="space-y-3">
          {sorted.map(item => {
            const percentage = total > 0 ? (item.calls / total) * 100 : 0;
            return (
              <div key={item.provider} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.provider}</span>
                  <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
