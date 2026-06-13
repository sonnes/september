'use client';

import React from 'react';

interface MetricCardProps {
  title: string;
  value: number;
  description?: string;
  format?: 'number' | 'percentage';
}

/**
 * Reusable component for displaying a single analytics metric
 * Formats numbers as localized strings or percentages
 *
 * @param title - The metric title
 * @param value - The numeric value to display
 * @param description - Optional description text
 * @param format - How to format the value ('number' or 'percentage')
 */
export function MetricCard({
  title,
  value,
  description,
  format = 'number',
}: MetricCardProps) {
  const formattedValue =
    format === 'percentage'
      ? `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
      : value.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold">{formattedValue}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
