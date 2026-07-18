'use client';

import { useState, type ReactNode } from 'react';

import { Link } from '@tanstack/react-router';
import { Check, ChevronRight } from 'lucide-react';

import { cn, type AIProvider } from '@/packages/shared';
import { Slider } from '@/packages/ui/components/slider';
import { Spinner } from '@/packages/ui/components/spinner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/packages/ui/components/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/packages/ui/components/select';

import type { FeatureProviderOption } from './feature-providers';

// "Powered by [provider] — chosen by your X mode." line under a feature title.
// Disconnected providers stay listed but disabled, pointing at Setup.
export function PoweredByLine({
  options,
  value,
  note,
  onChange,
  status,
}: {
  options: FeatureProviderOption[];
  value: AIProvider;
  note: string;
  onChange: (provider: AIProvider) => void;
  status?: ReactNode;
}) {
  const hasDisconnected = options.some(option => !option.connected);

  return (
    <div className="flex flex-col gap-1 border-y py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Powered by</span>
        <Select value={value} onValueChange={next => onChange(next as AIProvider)}>
          <SelectTrigger
            size="sm"
            className="h-9 w-auto gap-1.5 rounded-full bg-muted/60 text-sm font-medium"
            aria-label="Service that powers this feature"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option.id} value={option.id} disabled={!option.connected}>
                {option.name}
                {option.onDevice ? ' · on this device' : ''}
                {!option.connected ? ' — not connected' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{note}</span>
        <span className="ml-auto">{status}</span>
      </div>
      {hasDisconnected && (
        <p className="text-xs text-muted-foreground">
          Greyed-out services need a connection first —{' '}
          <Link to="/settings" className="text-primary hover:underline">
            finish in Setup
          </Link>
          .
        </p>
      )}
    </div>
  );
}

// On/off row at the top of a feature page. 44px targets, state named in words.
export function FeatureToggleRow({
  titleOn,
  titleOff,
  description,
  checked,
  disabled,
  onChange,
}: {
  titleOn: string;
  titleOff: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">
          {checked ? titleOn : titleOff}
        </div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={checked ? titleOn : titleOff}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-muted-foreground/30'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-background shadow-sm transition-transform',
            checked && 'translate-x-5'
          )}
        />
      </button>
    </div>
  );
}

// Progressive disclosure for the tuning controls a page works without.
export function MoreOptions({
  label,
  children,
  defaultOpen,
}: {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="border-t">
      <CollapsibleTrigger className="group flex min-h-11 w-full items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-6 pt-2 pb-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function SavedIndicator({ status }: { status: 'idle' | 'saving' | 'saved' }) {
  if (status === 'idle') return null;

  return (
    <span
      role="status"
      className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
    >
      {status === 'saving' ? (
        <>
          <Spinner className="size-3.5" />
          Saving…
        </>
      ) : (
        <>
          <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          Saved
        </>
      )}
    </span>
  );
}

// Slider with a live value readout — with impaired motor control, a number
// confirms what you landed on better than thumb position alone.
export function LabeledSlider({
  label,
  description,
  defaultValue,
  min,
  max,
  step,
  format,
  leftLabel,
  rightLabel,
  onCommit,
}: {
  label: string;
  description?: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  leftLabel?: string;
  rightLabel?: string;
  onCommit: (value: number) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex max-w-sm flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          {description && <div className="text-xs text-muted-foreground">{description}</div>}
        </div>
        <span className="text-sm font-medium text-muted-foreground tabular-nums">
          {format(value)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {leftLabel && <span className="text-xs text-muted-foreground">{leftLabel}</span>}
        <Slider
          defaultValue={[defaultValue]}
          min={min}
          max={max}
          step={step}
          onValueChange={([next]) => setValue(next)}
          onValueCommit={([next]) => onCommit(next)}
          aria-label={label}
        />
        {rightLabel && <span className="text-xs text-muted-foreground">{rightLabel}</span>}
      </div>
    </div>
  );
}

// Label + control pair used inside MoreOptions.
export function OptionField({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      {children}
    </div>
  );
}
