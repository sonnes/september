# Analytics Plan 3: Dashboard UI

> **For Claude:** Implement this plan task-by-task.

**Date**: 2025-12-30
**Scope**: Create dashboard components to display analytics
**Dependencies**: Plan 1 (Core Infrastructure) must be complete
**Estimated Files**: 5 new files, 1 file to modify

---

## Overview

Create dashboard UI components:
- MetricCard - displays a single stat
- TimeRangeSelector - day/week/month toggle
- ProviderUsageChart - breakdown by provider
- DashboardStats - main container component
- Update dashboard page

---

## Tasks

### Task 1: Create MetricCard component

**File**: `packages/analytics/components/metric-card.tsx`

```typescript
'use client';

interface MetricCardProps {
  title: string;
  value: number | string;
  description?: string;
  format?: 'number' | 'percent';
}

export function MetricCard({ title, value, description, format }: MetricCardProps) {
  const formattedValue = typeof value === 'number'
    ? format === 'percent'
      ? `${value.toFixed(1)}%`
      : value.toLocaleString()
    : value;

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="mt-2 text-3xl font-bold">{formattedValue}</p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
```

---

### Task 2: Create TimeRangeSelector component

**File**: `packages/analytics/components/time-range-selector.tsx`

```typescript
'use client';

import { Button } from '@/components/ui/button';

import { TimeRange } from '../lib/aggregators';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const options: { value: TimeRange; label: string }[] = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex gap-1">
      {options.map(option => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
```

---

### Task 3: Create ProviderUsageChart component

**File**: `packages/analytics/components/provider-usage-chart.tsx`

```typescript
'use client';

interface ProviderData {
  calls: number;
  [key: string]: number; // tokens or chars
}

interface ProviderUsageChartProps {
  title: string;
  data: Record<string, ProviderData | number>;
  valueKey?: string; // 'calls', 'tokens', 'chars'
}

export function ProviderUsageChart({
  title,
  data,
  valueKey = 'calls',
}: ProviderUsageChartProps) {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="mt-4 text-sm text-muted-foreground">No data yet</p>
      </div>
    );
  }

  const getValue = (item: ProviderData | number): number => {
    if (typeof item === 'number') return item;
    return item[valueKey] ?? item.calls;
  };

  const total = entries.reduce((sum, [, v]) => sum + getValue(v), 0);

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-4 space-y-3">
        {entries
          .sort((a, b) => getValue(b[1]) - getValue(a[1]))
          .map(([provider, item]) => {
            const value = getValue(item);
            const percent = total > 0 ? (value / total) * 100 : 0;
            return (
              <div key={provider}>
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{provider}</span>
                  <span className="font-medium">{value.toLocaleString()}</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
```

---

### Task 4: Create DashboardStats component

**File**: `packages/analytics/components/dashboard-stats.tsx`

```typescript
'use client';

import { useState } from 'react';

import { useAnalyticsSummary } from '../hooks/use-analytics-summary';
import { TimeRange } from '../lib/aggregators';
import { MetricCard } from './metric-card';
import { ProviderUsageChart } from './provider-usage-chart';
import { TimeRangeSelector } from './time-range-selector';

export function DashboardStats() {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const { data, isLoading } = useAnalyticsSummary({ range: timeRange });

  if (isLoading) {
    return <DashboardStatsSkeleton />;
  }

  if (!data) {
    return (
      <div className="text-center text-muted-foreground">
        No analytics data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Usage Statistics</h2>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Messages Sent"
          value={data.messagesSent}
        />
        <MetricCard
          title="Keys Typed"
          value={data.keysTyped}
        />
        <MetricCard
          title="Characters Saved"
          value={data.charsSaved}
          description={`${data.efficiencyPercent.toFixed(0)}% efficiency`}
        />
        <MetricCard
          title="AI Calls"
          value={data.aiGenerations}
          description={`${data.aiTokensUsed.toLocaleString()} tokens`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ProviderUsageChart
          title="AI Provider Usage"
          data={data.aiByProvider}
          valueKey="tokens"
        />
        <ProviderUsageChart
          title="TTS Provider Usage"
          data={data.ttsByProvider}
          valueKey="chars"
        />
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
```

---

### Task 5: Update public exports

**File**: `packages/analytics/index.ts`

Add component exports:

```typescript
// ... existing exports ...

// Components
export { DashboardStats } from './components/dashboard-stats';
export { MetricCard } from './components/metric-card';
export { TimeRangeSelector } from './components/time-range-selector';
export { ProviderUsageChart } from './components/provider-usage-chart';
```

---

### Task 6: Update dashboard page

**File**: `app/(app)/dashboard/page.tsx`

Replace placeholder content with DashboardStats:

```typescript
'use client';

import SidebarLayout from '@/components/sidebar/layout';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { useAccountContext } from '@/packages/account';
import { DashboardStats } from '@/packages/analytics';

export default function DashboardPage() {
  const { user, loading } = useAccountContext();

  return (
    <>
      <SidebarLayout.Header>
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            {user?.user_metadata?.full_name && (
              <p className="text-muted-foreground">
                Welcome back, {user.user_metadata.full_name}
              </p>
            )}
          </div>

          {!loading && <DashboardStats />}
        </div>
      </SidebarLayout.Content>
    </>
  );
}
```

---

## Validation

After completing all tasks:

1. Run `pnpm run lint` - should pass
2. Run `pnpm run build` - should compile
3. Navigate to `/dashboard` in browser
4. Verify:
   - Time range selector toggles between day/week/month
   - Metric cards display (will show 0 until events are logged)
   - Provider charts display empty state or data

---

**END OF PLAN**
