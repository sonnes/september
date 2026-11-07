import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@september/ui";
import { KEY_SIZE } from "@september/app-ui/blocks/access";
import { moveChoice } from "@september/app-ui/blocks/pick-list";
import { type AccessProfile, INPUT_METHODS, type Reach, reachFor, reachSummary, steppedTime, TIME_MAX_MS, TIME_MIN_MS } from "@september/core/rules/access";

/** One choice of a group, as a large flat key. */
interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
  /** The profile does not allow this choice now. */
  disabled?: boolean;
}

/**
 * A group of choices that the person picks one of. Each choice is a large key,
 * so a gaze or a switch reaches it as well as a finger. The arrow keys move
 * between the choices, as a screen reader user expects of a radio group.
 */
function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
  wide = false,
}: {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  /** The choices carry a description and take a card each. */
  wide?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "grid gap-[var(--reach-gap,0.5rem)]",
        wide ? "grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]" : "grid-flow-col justify-start",
      )}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={option.disabled || undefined}
            tabIndex={on ? 0 : -1}
            onClick={() => {
              if (!option.disabled) onChange(option.value);
            }}
            onKeyDown={moveChoice}
            className={cn(
              "border-input bg-card text-foreground focus-attention key-disabled flex flex-col items-start justify-center gap-0.5 rounded-control border-2 px-4 py-2 text-left transition-colors",
              KEY_SIZE,
              on && "bg-primary text-primary-foreground border-brand",
            )}
          >
            <span className="flex items-center gap-2 text-base font-bold">
              {on ? <Check className="size-4" aria-hidden /> : null}
              {option.label}
            </span>
            {option.description ? (
              <span className={cn("text-sm", !on && "text-muted-foreground")}>
                {option.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** A time the person sets with two large keys. A key at a limit is disabled. */
function TimeStepper({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  /** Names the keys: "Shorter dwell time", "Longer dwell time". */
  name: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const key = cn(
    "border-input bg-card text-foreground focus-attention key-disabled grid place-items-center rounded-full border-2 text-2xl font-bold",
    "size-reach",
  );
  const shorter = steppedTime(value, -1);
  const longer = steppedTime(value, 1);
  const atShortest = shorter < TIME_MIN_MS;
  const atLongest = longer > TIME_MAX_MS;

  return (
    <div className="flex items-center gap-[var(--reach-gap,0.75rem)]">
      <span className="min-w-32 text-base font-semibold">{label}</span>
      <button
        type="button"
        aria-label={`Shorter ${name}`}
        aria-disabled={atShortest || undefined}
        onClick={() => {
          if (!atShortest) onChange(shorter);
        }}
        className={key}
      >
        −
      </button>
      <output aria-live="polite" className="min-w-16 text-center text-lg font-bold tabular-nums">
        {(value / 1000).toFixed(1)} s
      </output>
      <button
        type="button"
        aria-label={`Longer ${name}`}
        aria-disabled={atLongest || undefined}
        onClick={() => {
          if (!atLongest) onChange(longer);
        }}
        className={key}
      >
        +
      </button>
    </div>
  );
}

/** The words of the preview strip. */
const PREVIEW_WORDS = ["window", "windows", "winter"];

/**
 * Three word tiles at the size, the gap, and the word size of the profile.
 * The strip draws again for each choice, so the person sees the result before
 * they continue.
 */
function Preview({ reach }: { reach: Reach }) {
  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden="true" className="flex flex-col gap-2">
        <span className="text-muted-foreground text-sm font-bold">Preview</span>
        <div className="flex flex-wrap items-center" style={{ gap: reach.gapPx }}>
          {PREVIEW_WORDS.map((word) => (
            <span
              key={word}
              className="border-input bg-card text-foreground grid place-items-center rounded-control border-2 px-4 font-semibold"
              style={{ minHeight: reach.targetPx, minWidth: reach.targetPx, fontSize: reach.wordPx }}
            >
              {word}
            </span>
          ))}
        </div>
      </div>
      <p className="text-muted-foreground text-sm">{reachSummary(reach)}</p>
    </div>
  );
}

/**
 * The questions of the access profile. Setup asks them first, and the Access
 * section of Settings asks them again. The screen that holds the form decides
 * when an answer applies.
 */
export function AccessForm({
  value,
  onChange,
  confirm,
}: {
  value: AccessProfile;
  onChange: (next: AccessProfile) => void;
  /** A key under the input methods that applies a new one. */
  confirm?: ReactNode;
}) {
  const reach = reachFor(value);
  const set = (patch: Partial<AccessProfile>) => onChange({ ...value, ...patch });
  // Eyes and Switch keep motion reduced, whatever the Motion choice says.
  const motionKept = reachFor({ ...value, motion: "full" }).motion === "reduced";
  const input = INPUT_METHODS.find((one) => one.value === value.input);

  return (
    <div className="flex flex-col gap-7">
      <AccessGroup title="How you choose">
        <Choices
          label="Input method"
          value={value.input}
          options={INPUT_METHODS}
          onChange={(input) => set({ input })}
          wide
        />
        {confirm}
        {reach.dwellMs !== null ? (
          <TimeStepper
            label="Dwell time"
            name="dwell time"
            value={reach.dwellMs}
            onChange={(dwellMs) => set({ dwellMs })}
          />
        ) : null}
        {reach.scanStepMs !== null ? (
          <TimeStepper
            label="Scan step"
            name="scan step"
            value={reach.scanStepMs}
            onChange={(scanStepMs) => set({ scanStepMs })}
          />
        ) : null}
        <Preview reach={reach} />
      </AccessGroup>

      <AccessGroup title="Text size">
        <Choices
          label="Text size"
          value={value.textSize}
          options={[
            { value: "standard", label: "Standard" },
            { value: "large", label: "Large" },
            { value: "largest", label: "Largest" },
          ]}
          onChange={(textSize) => set({ textSize })}
        />
      </AccessGroup>

      <AccessGroup title="Theme">
        <Choices
          label="Theme"
          value={value.theme}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
            { value: "system", label: "Same as this device" },
          ]}
          onChange={(theme) => set({ theme })}
        />
      </AccessGroup>

      <AccessGroup title="Contrast">
        <Choices
          label="Contrast"
          value={value.contrast}
          options={[
            { value: "standard", label: "Standard" },
            { value: "high", label: "High" },
          ]}
          onChange={(contrast) => set({ contrast })}
        />
      </AccessGroup>

      <AccessGroup title="Motion">
        <Choices
          label="Motion"
          value={reach.motion}
          options={[
            { value: "full", label: "Full", disabled: motionKept },
            { value: "reduced", label: "Reduced" },
          ]}
          onChange={(motion) => set({ motion })}
        />
        {motionKept && input ? (
          <p className="text-muted-foreground text-sm">{input.label} keeps motion reduced.</p>
        ) : null}
      </AccessGroup>

      <AccessGroup title="Click sound">
        <Choices
          label="Click sound"
          value={value.sound}
          options={[
            { value: "on", label: "On" },
            { value: "off", label: "Off" },
          ]}
          onChange={(sound) => set({ sound })}
        />
      </AccessGroup>
    </div>
  );
}

function AccessGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
