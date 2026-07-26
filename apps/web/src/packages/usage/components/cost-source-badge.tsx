'use client';

import { Badge } from '@/packages/ui/components/badge';

import { CostSource } from '../lib/pricing';
import { sourceLabel } from '../lib/labels';

/**
 * Says where a cost figure came from. Every number on the usage screens carries
 * one of these, so an estimate is never mistaken for a bill.
 */
const TONES: Record<CostSource, string> = {
  measured: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40',
  estimated: 'border-primary/20 bg-primary/10 text-primary',
  quota: 'border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40',
  free: 'border-border bg-muted text-muted-foreground',
  unknown: 'border-border bg-background text-muted-foreground',
};

export function CostSourceBadge({ source }: { source: CostSource }) {
  return (
    <Badge variant="outline" className={TONES[source]}>
      {sourceLabel(source)}
    </Badge>
  );
}
