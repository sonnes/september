import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Button } from "@september/ui/components/button";
import { Label } from "@september/ui/components/label";
import { Textarea } from "@september/ui/components/textarea";

import {
  DEFAULT_ANSWERS,
  SPEAKING_STYLES,
  type SetupAnswers,
} from "@september/core/rules/onboarding";
import { useAutosave } from "@september/app-ui/services/autosave";
import { updateSetup, useSetup } from "@september/app-ui/services/settings";

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
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const preset = SPEAKING_STYLES.find((option) => option.value === value);
  const [custom, setCustom] = useState(!preset);

  return (
    <Section title="Speaking style" description="How September writes for you, in every feature.">
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
        <SavedText label="Your instructions" value={value} onSave={onChange} />
      ) : (
        <p className="text-muted-foreground text-sm">{preset?.value}</p>
      )}
    </Section>
  );
}

/**
 * A text field that keeps itself. It waits half a second after the last
 * keystroke, so one sentence is one write, not thirty.
 */
function SavedText({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fieldId = useId();

  // The buttons above can change the style, so the field follows the answer.
  useEffect(() => setText(value), [value]);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={fieldId} className="text-sm font-medium">
        {label}
      </Label>
      <Textarea
        id={fieldId}
        value={text}
        rows={4}
        maxLength={1000}
        className="leading-relaxed"
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => onSave(next), 500);
        }}
      />
    </div>
  );
}

/**
 * The setup answers of a Settings screen. An edit shows at once and saves
 * behind it. A failed save shows its alert from `SaveFailed`.
 */
export function useSetupAnswers() {
  const saved = useAutosave<SetupAnswers>(useSetup() ?? DEFAULT_ANSWERS, async (next) => {
    await updateSetup(next);
  });
  return {
    setup: saved.value,
    change: (patch: Partial<SetupAnswers>) => saved.write({ ...saved.current(), ...patch }),
    failed: saved.state === "failed",
    retry: saved.retry,
  };
}

/** The alert of a failed save, with a key that saves again. */
export function SaveFailed({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="space-y-2 text-sm">
      <p className="text-destructive">September did not keep the change.</p>
      <Button type="button" variant="outline" onClick={retry}>
        Retry saving
      </Button>
    </div>
  );
}

export function SettingsTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
