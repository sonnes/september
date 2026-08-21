import { useState, type FormEvent, type ReactNode } from "react";

import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useDraft } from "./app";
import {
  nextStep,
  previousStep,
  SETUP_MODES,
  SPEAKING_STYLES,
  STEPS,
  stepIndex,
  WELCOME_POINTS,
  type SetupMode,
  type StepPath,
} from "./onboarding";

// DESIGN.md asks for a 44px target on primary actions; `lg` is 40px.
const ACTION = "h-11 px-6 font-semibold";

const MODE_ACCENT = {
  amber: { edge: "border-t-amber-600", badge: "bg-amber-100 text-amber-700" },
  sky: { edge: "border-t-sky-600", badge: "bg-sky-100 text-sky-700" },
} as const;

function Step({
  path,
  children,
  footer,
}: {
  path: StepPath;
  children: ReactNode;
  footer: ReactNode;
}) {
  const navigate = useNavigate();
  const index = stepIndex(path);
  const step = STEPS[index];
  const back = previousStep(path);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-6">
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl leading-tight font-bold lg:text-4xl">
            {step.title}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-500 md:text-base">
            {step.subtitle}
          </p>
        </div>
        {back && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            title="Go back"
            onClick={() => navigate({ to: back })}
            className="h-11 shrink-0 px-4"
          >
            ← Back
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>

      <div className="flex shrink-0 flex-col gap-4 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-500">{step.helper}</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          {footer}
        </div>
      </div>
    </div>
  );
}

export function WelcomeStep() {
  const navigate = useNavigate();

  return (
    <Step
      path="/welcome"
      footer={
        <Button
          type="button"
          size="lg"
          className={ACTION}
          onClick={() => navigate({ to: nextStep("/welcome")! })}
        >
          {STEPS[0].action}
        </Button>
      }
    >
      {/* ml-3 keeps the hanging markers clear of the scroll body, which clips. */}
      <ol className="ml-3 space-y-4 border-l border-zinc-200 pl-5">
        {WELCOME_POINTS.map((point, index) => (
          <li key={point.title} className="relative">
            <span className="absolute -left-[1.8125rem] top-0 flex size-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-indigo-600 ring-1 ring-zinc-200">
              {index + 1}
            </span>
            <div className="max-w-xl">
              <h3 className="text-base font-semibold">{point.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                {point.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Step>
  );
}

export function ProfileStep() {
  const navigate = useNavigate();
  const { draft, setDraft } = useDraft();
  const [name, setName] = useState(draft.name);
  const [speakingStyle, setSpeakingStyle] = useState(draft.speakingStyle);
  const [personalWords, setPersonalWords] = useState(draft.personalWords);
  const selected = SPEAKING_STYLES.find(
    (option) => option.value === speakingStyle,
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setDraft((current) => ({
      ...current,
      name: name.trim(),
      speakingStyle,
      personalWords,
    }));
    navigate({ to: nextStep("/profile")! });
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <Step
        path="/profile"
        footer={
          <Button type="submit" size="lg" className={ACTION} disabled={!name.trim()}>
            {STEPS[1].action}
          </Button>
        }
      >
        <div className="space-y-6">
          <Field
            title="Name"
            description="Used in September's profile on this device."
            htmlFor="onboarding-name"
          >
            <Input
              id="onboarding-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
              className="h-11"
            />
          </Field>

          <Field
            title="Speaking style"
            description="A short note helps September learn how you talk."
            htmlFor="onboarding-speaking-style"
          >
            <div className="flex flex-wrap gap-2">
              {SPEAKING_STYLES.map((option) => (
                <Button
                  key={option.label}
                  type="button"
                  variant={speakingStyle === option.value ? "default" : "outline"}
                  aria-pressed={speakingStyle === option.value}
                  onClick={() => setSpeakingStyle(option.value)}
                  className="h-11 rounded-full px-4"
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">
              {selected?.description ?? "Edit the note below any time."}
            </p>
            <Textarea
              id="onboarding-speaking-style"
              value={speakingStyle}
              onChange={(event) => setSpeakingStyle(event.target.value)}
              rows={4}
              maxLength={1000}
              className="leading-relaxed"
            />
          </Field>

          <Field
            title="Personal words"
            description="Optional. Names, care phrases, routines, or topics September should know."
            htmlFor="onboarding-personal-words"
          >
            <Textarea
              id="onboarding-personal-words"
              value={personalWords}
              onChange={(event) => setPersonalWords(event.target.value)}
              rows={4}
              maxLength={5000}
              placeholder="Amma. Dr. Shah. I need a short rest. Please give me a moment."
              className="leading-relaxed"
            />
          </Field>
        </div>
      </Step>
    </form>
  );
}

function Field({
  title,
  description,
  htmlFor,
  children,
}: {
  title: string;
  description: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-5 border-l border-zinc-200 pl-5 lg:grid-cols-[15rem_1fr] lg:gap-8">
      <div>
        <Label htmlFor={htmlFor} className="text-sm font-semibold">
          {title}
        </Label>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function ModeStep() {
  const navigate = useNavigate();
  const { draft, setDraft } = useDraft();

  function choose(mode: SetupMode) {
    setDraft((current) => ({ ...current, mode }));
  }

  return (
    <Step
      path="/mode"
      footer={
        <Button
          type="button"
          size="lg"
          className={ACTION}
          disabled={!draft.mode}
          onClick={() => navigate({ to: nextStep("/mode")! })}
        >
          {STEPS[2].action}
        </Button>
      }
    >
      <fieldset className="grid gap-4 lg:grid-cols-2">
        <legend className="sr-only">Setup mode</legend>
        {SETUP_MODES.map((option) => {
          const isSelected = draft.mode === option.id;
          const accent = MODE_ACCENT[option.accent];

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => choose(option.id)}
              className={`relative grid content-start gap-4 rounded-xl border border-t-4 bg-white p-6 text-left shadow-sm focus-visible:ring-[3px] focus-visible:ring-indigo-500/50 focus-visible:outline-none ${accent.edge} ${
                isSelected
                  ? "border-indigo-600 ring-[3px] ring-indigo-500/40"
                  : "border-zinc-200 hover:border-indigo-300"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-4 right-4 flex size-5 items-center justify-center rounded-full border text-xs ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-zinc-200"
                }`}
              >
                {isSelected ? "✓" : ""}
              </span>
              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${accent.badge}`}
              >
                {option.badge}
              </span>
              <span className="text-lg font-semibold">{option.title}</span>
              <span className="text-sm leading-relaxed text-zinc-500">
                {option.body}
              </span>
              <ul className="grid gap-3 text-sm leading-relaxed text-zinc-500">
                {option.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="grid grid-cols-[8px_minmax(0,1fr)] gap-3"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 size-2 rounded-full bg-current"
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </fieldset>
    </Step>
  );
}

export function FinishStep() {
  const { draft } = useDraft();
  const [finished, setFinished] = useState(false);
  const mode = SETUP_MODES.find((option) => option.id === draft.mode);
  const style = SPEAKING_STYLES.find(
    (option) => option.value === draft.speakingStyle,
  );

  return (
    <Step
      path="/finish"
      footer={
        <Button
          type="button"
          size="lg"
          className={ACTION}
          disabled={finished}
          onClick={() => setFinished(true)}
        >
          {finished ? "Ready" : STEPS[3].action}
        </Button>
      }
    >
      <div className="grid gap-5 rounded-xl border border-indigo-200 bg-indigo-50 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
        <span
          aria-hidden="true"
          className="grid size-13 place-items-center rounded-full bg-indigo-600 text-2xl text-white"
        >
          ✓
        </span>
        <div>
          <p className="text-xs font-bold text-indigo-600">Your setup</p>
          <h3 className="mt-1 text-base font-semibold">{mode?.title}</h3>
          <dl className="mt-5 grid gap-3">
            <SummaryRow label="Name" value={draft.name} />
            <SummaryRow label="Speaking style" value={style?.label ?? "Custom"} />
            <SummaryRow label="Services" value="Connect later in Settings" />
          </dl>
          {finished && (
            <p
              role="status"
              className="mt-5 text-sm font-semibold text-emerald-700"
            >
              Setup complete. September is ready for the next screen.
            </p>
          )}
        </div>
      </div>
    </Step>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}
