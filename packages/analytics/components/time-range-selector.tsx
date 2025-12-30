'use client';

import React from 'react';

import { Button } from '@/components/ui/button';
import { TimeRange } from '../lib/utils';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

/**
 * Button group component for selecting time ranges
 * Shows three toggle buttons for day/week/month time ranges
 *
 * @param value - Currently selected time range
 * @param onChange - Callback when time range changes
 */
export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const ranges: TimeRange[] = ['day', 'week', 'month'];

  return (
    <div className="flex gap-2">
      {ranges.map((range) => (
        <Button
          key={range}
          variant={value === range ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(range)}
        >
          {range.charAt(0).toUpperCase() + range.slice(1)}
        </Button>
      ))}
    </div>
  );
}
