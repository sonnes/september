import { useId, useState, type ReactNode } from "react";

import { Button } from "@september/ui/components/button";
import { Label } from "@september/ui/components/label";
import { Textarea } from "@september/ui/components/textarea";

import {
  DEFAULT_DRAFT,
  SPEAKING_STYLES,
  type OnboardingDraft,
} from "@september/core/rules/onboarding";
import { currentSetup, updateSetup } from "@september/app-ui/services/settings";

/**
 * A titled part of a setup screen. With `htmlFor`, the title is the label of
 * that field.
 */
export function Section({
  title,
  description,
  htmlFor,
  children,
}: {
  title: string;
  description: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        {htmlFor ? (
          <Label htmlFor={htmlFor} className="text-base font-semibold">
            {title}
          </Label>
        ) : (
          <h2 className="text-base font-semibold">{title}</h2>
        )}
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}

/**
 * Three styles and Custom. The instructions field shows only for Custom, so a
 * stray edit cannot change every suggestion.
 */
export function SpeakingStyle({
  value,
  onChange,
  description,
}: {
  value: string;
  onChange: (value: string) => void;
  description: string;
}) {
  const preset = SPEAKING_STYLES.find((option) => option.value === value);
  const [custom, setCustom] = useState(!preset);
  const fieldId = useId();

  return (
    <Section title="Speaking style" description={description}>
      <div className="flex flex-wrap gap-2">
        {SPEAKING_STYLES.map((option) => {
          const on = !custom && preset?.label === option.label;
          return (
            <Button
              key={option.label}
              type="button"
              variant={on ? "default" : "outline"}
              aria-pressed={on}
              onClick={() => {
                setCustom(false);
                onChange(option.value);
              }}
              className="h-11 rounded-full px-4"
            >
              {option.label}
            </Button>
          );
        })}
        <Button
          type="button"
          variant={custom ? "default" : "outline"}
          aria-pressed={custom}
          onClick={() => setCustom(true)}
          className="h-11 rounded-full px-4"
        >
          Custom
        </Button>
      </div>
      {custom ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fieldId} className="text-sm font-medium">
            Your instructions
          </Label>
          <Textarea
            id={fieldId}
            value={value}
            rows={4}
            maxLength={1000}
            className="leading-relaxed"
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{preset?.value}</p>
      )}
    </Section>
  );
}

export function useSetupDraft(): [
  OnboardingDraft,
  (patch: Partial<OnboardingDraft>) => void,
] {
  // A platform without saved setup draws the defaults instead of throwing.
  const [setup, setSetup] = useState(() => currentSetup() ?? DEFAULT_DRAFT);

  return [
    setup,
    (patch) => {
      // The screen shows the new answer at once. Local storage keeps it behind that.
      setSetup((current) => ({ ...current, ...patch }));
      void updateSetup(patch);
    },
  ];
}

export function SettingsTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
