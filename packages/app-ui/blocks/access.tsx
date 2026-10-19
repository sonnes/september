import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, Pause, Play } from "lucide-react";

import { cn } from "@september/ui";

import { currentSetup, subscribeSetup } from "@platform/services/os";
import { useSpeaking } from "@platform/services/speech";
import {
  INPUT_METHODS,
  TIME_MAX_MS,
  TIME_MIN_MS,
  isDark,
  parseAccess,
  reachFor,
  type AccessProfile,
  type Reach,
} from "@september/core/rules/access";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const subscribeSystem = (listener: () => void) => {
  const query = window.matchMedia?.(DARK_QUERY);
  query?.addEventListener?.("change", listener);
  return () => query?.removeEventListener?.("change", listener);
};
const systemDark = () => window.matchMedia?.(DARK_QUERY).matches ?? false;

/** The access profile of the person, or the default before setup. */
export function useAccess(): AccessProfile {
  const setup = useSyncExternalStore(subscribeSetup, currentSetup, currentSetup);
  const saved = (setup as { access?: unknown } | null)?.access;
  return useMemo(() => parseAccess(saved), [saved]);
}

/** What the access profile asks of the screen. */
export function useReach(): Reach {
  const access = useAccess();
  return useMemo(() => reachFor(access), [access]);
}

/**
 * Puts the access profile on the page: the dark theme, the input method, the
 * motion, and the reach as custom properties that every screen reads. The
 * page loses them when this leaves.
 *
 * Setup passes the profile of its draft, which changes when the person
 * continues. Every other screen reads the saved profile.
 */
export function ApplyAccess({ profile }: { profile?: AccessProfile }) {
  const saved = useAccess();
  const access = profile ?? saved;
  const system = useSyncExternalStore(subscribeSystem, systemDark, () => false);
  const dark = isDark(access.theme, system);

  useEffect(() => {
    const html = document.documentElement;
    const reach = reachFor(access);
    const tokens: Record<string, string> = {
      "--reach-target": `${reach.targetPx}px`,
      "--reach-gap": `${reach.gapPx}px`,
      "--reach-word": `${reach.wordPx}px`,
      "--reach-scale": String(reach.textScale),
    };
    html.classList.toggle("dark", dark);
    html.dataset.input = access.input;
    html.dataset.motion = reach.motion;
    html.dataset.contrast = access.contrast;
    for (const [name, value] of Object.entries(tokens)) html.style.setProperty(name, value);
    // The landing page and every page outside the app show the default.
    return () => {
      html.classList.remove("dark");
      delete html.dataset.input;
      delete html.dataset.motion;
      delete html.dataset.contrast;
      for (const name of Object.keys(tokens)) html.style.removeProperty(name);
    };
  }, [access, dark]);

  return null;
}

/** One choice of a group, as a large flat key. */
interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
  /** The profile does not allow this choice now. */
  disabled?: boolean;
}

/** A key of the form: the reach target each way, and never less than 48 px. */
const KEY_SIZE =
  "min-h-[max(3rem,var(--reach-target,3rem))] min-w-[max(3rem,var(--reach-target,3rem))]";

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
  const open = options.filter((option) => !option.disabled);
  const move = (event: React.KeyboardEvent, option: Option<T>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step || open.length === 0) return;
    event.preventDefault();
    const at = Math.max(0, open.indexOf(option));
    const next = open[(at + step + open.length) % open.length];
    onChange(next.value);
    const group = event.currentTarget.parentElement;
    group?.querySelectorAll<HTMLElement>('[role="radio"]')[options.indexOf(next)]?.focus();
  };

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
            onKeyDown={(event) => move(event, option)}
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

/**
 * The next time of a stepper. Below 2 seconds a step is a tenth of a second.
 * Above it a step is half a second, so 30 seconds is near.
 */
function stepped(value: number, direction: 1 | -1): number {
  const size = value + direction * 100 > 2000 ? 500 : 100;
  return Math.round((value + direction * size) / size) * size;
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
    "size-[max(3rem,var(--reach-target,3rem))]",
  );
  const shorter = stepped(value, -1);
  const longer = stepped(value, 1);
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

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

/** What the profile asks, in one line under the preview. */
function reachSummary(reach: Reach): string {
  const size = `${reach.targetPx} px keys, ${reach.gapPx} px gaps.`;
  if (reach.dwellMs !== null) {
    return `${size} Hold your gaze for ${seconds(reach.dwellMs)} to choose a key.`;
  }
  if (reach.scanStepMs !== null) {
    return `${size} The scan moves on every ${seconds(reach.scanStepMs)}.`;
  }
  return size;
}

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

/** What a press, a dwell, or a scan can choose. */
const PRESSABLE = [
  "button",
  "a[href]",
  "summary",
  '[role="radio"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[role="menuitemcheckbox"]',
  '[role="option"]',
].join(", ");

/**
 * A part of the screen that dwell and scan never press: the edge strip that
 * toggles the sidebar, because the Menu key does the same thing, and a key
 * marked `data-access-skip`, such as the skip link.
 */
const UNPRESSABLE = '[data-sidebar="rail"], [data-access-skip]';

/** A key that opens its popup on a pointer press or a key, not on a click. */
const POPUP_TRIGGER = '[aria-haspopup="menu"], [aria-haspopup="listbox"], [role="combobox"]';

/** A modal that holds the whole input while it is open. A Radix dialog or
 * sheet sets no `aria-modal`, so its open state marks it. */
const MODAL = [
  '[role="dialog"][aria-modal="true"]',
  '[role="alertdialog"]',
  '[data-slot="dialog-content"][data-state="open"]',
  '[data-slot="sheet-content"][data-state="open"]',
  // The phone sidebar is a sheet that names its own slot.
  '[data-slot="sidebar"][data-mobile="true"][data-state="open"]',
  // An open menu or list holds the scan until it closes.
  '[data-slot="dropdown-menu-content"][data-state="open"]',
  '[data-slot="select-content"][data-state="open"]',
].join(", ");

/** A text field that a dwell puts the focus in. */
const FIELD = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

/** A part of the screen that a modal hides from the person. */
const HIDDEN = '[aria-hidden="true"], [inert], [hidden]';

/** The input types that take words, where Space and Enter type. */
const TEXT_TYPES = new Set([
  "text",
  "search",
  "email",
  "url",
  "tel",
  "password",
  "number",
]);

/** Whether the screen draws this element, so a person can see it. */
function drawn(one: Element): boolean {
  if (typeof one.checkVisibility === "function") return one.checkVisibility();
  for (let at: Element | null = one; at; at = at.parentElement) {
    if (getComputedStyle(at).display === "none") return false;
  }
  return true;
}

function field(node: EventTarget | null): HTMLElement | null {
  const found = (node as Element | null)?.closest?.(FIELD) as HTMLElement | null;
  if (!found || found.hasAttribute("disabled")) return null;
  return found;
}

function pressable(node: EventTarget | null): HTMLElement | null {
  const found = (node as Element | null)?.closest?.(PRESSABLE) as HTMLElement | null;
  if (!found) return null;
  if (found.closest(UNPRESSABLE)) return null;
  if (found.getAttribute("aria-disabled") === "true" || found.hasAttribute("disabled")) {
    return null;
  }
  return found;
}

/** Whether the person types in this element, so Space and Enter are words. */
function typing(node: EventTarget | null): boolean {
  if (!(node instanceof Element)) return false;
  if (node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) return true;
  if (node instanceof HTMLInputElement) return TEXT_TYPES.has(node.type || "text");
  return node.closest('[contenteditable]:not([contenteditable="false"])') !== null;
}

// A key that shows a mark must be a containing block for the mark. A key
// that has its own position keeps it, so it does not jump.
const lifted = new WeakSet<HTMLElement>();

function lift(key: HTMLElement) {
  if (lifted.has(key)) return;
  const position = getComputedStyle(key).position;
  if (position && position !== "static") return;
  key.style.position = "relative";
  lifted.add(key);
}

function settle(key: HTMLElement) {
  if (!lifted.has(key)) return;
  if ("dwelling" in key.dataset || "accepted" in key.dataset) return;
  key.style.removeProperty("position");
  lifted.delete(key);
}

/**
 * Presses a key for dwell and scan. A Radix menu or select opens on a pointer
 * press, not on a click, so a key that opens one also gets a pointer press.
 */
function press(key: HTMLElement) {
  if (key.matches(POPUP_TRIGGER)) {
    const init: PointerEventInit = {
      bubbles: true,
      cancelable: true,
      button: 0,
      buttons: 1,
      pointerType: "mouse",
      isPrimary: true,
    };
    key.dispatchEvent(new PointerEvent("pointerdown", init));
    key.dispatchEvent(new PointerEvent("pointerup", { ...init, buttons: 0 }));
  }
  key.click();
}

/** How long a key shows that a press was accepted. */
const ACCEPTED_MS = 500;

/** A short click, so a person who does not feel a key go down hears it. */
function playClick(sound: AudioContext) {
  if (sound.state === "suspended") void sound.resume();
  const tone = sound.createOscillator();
  const level = sound.createGain();
  tone.frequency.value = 1800;
  level.gain.setValueAtTime(0.08, sound.currentTime);
  level.gain.exponentialRampToValueAtTime(0.0001, sound.currentTime + 0.04);
  tone.connect(level).connect(sound.destination);
  tone.start();
  tone.stop(sound.currentTime + 0.05);
}

/** The pause control of the scan, while a switch scans the screen. */
interface ScanControl {
  paused: boolean;
  toggle: () => void;
}

let scanControl: ScanControl | null = null;
const scanListeners = new Set<() => void>();

function setScanControl(next: ScanControl | null) {
  scanControl = next;
  scanListeners.forEach((listener) => listener());
}

const subscribeScan = (listener: () => void) => {
  scanListeners.add(listener);
  return () => scanListeners.delete(listener);
};

/**
 * The Pause scan key. It shows only while a switch scans the screen. Each
 * shell puts it in a place that covers nothing: the foot of the sidebar, the
 * header of the panel, or the setup sidebar. While the scan waits, the next
 * press of the switch starts it again.
 */
export function ScanPauseKey({
  className,
  role,
}: {
  className?: string;
  /** `menuitem` inside a menu, so the menu holds only its own kind of row. */
  role?: "menuitem";
}) {
  const control = useSyncExternalStore(subscribeScan, () => scanControl, () => null);
  if (!control) return null;
  const name = control.paused ? "Resume scan" : "Pause scan";
  return (
    <button
      type="button"
      role={role}
      data-scan-pause=""
      aria-label={name}
      title={name}
      onClick={control.toggle}
      className={cn(
        "focus-attention border-input bg-card text-foreground grid shrink-0 place-items-center rounded-control border-2",
        KEY_SIZE,
        className,
      )}
    >
      {control.paused ? <Play aria-hidden className="size-5" /> : <Pause aria-hidden className="size-5" />}
    </button>
  );
}

/**
 * The input of the access profile, for the whole screen.
 *
 * Every accepted press answers with a visible change and a click. The click
 * is quiet while the voice speaks, and off when the person turned it off. Eye
 * gaze presses the key under the gaze after the dwell time. A switch scans
 * the topmost open modal, or else the page. Each step is a group marked
 * `data-scan-group` or a key outside every group. Space moves on, Enter
 * chooses, and the scan also moves on by itself. `ScanPauseKey` pauses it.
 */
export function InputLayer({ profile }: { profile?: AccessProfile }) {
  const saved = useAccess();
  const access = profile ?? saved;
  const reach = useMemo(() => reachFor(access), [access]);
  const speaking = useSpeaking() !== null;
  const quiet = useRef(speaking);
  quiet.current = speaking || access.sound === "off";
  const scan = useRef<{ pause: () => void; resume: () => void } | null>(null);

  // The answer to a press.
  useEffect(() => {
    const Context = globalThis.AudioContext;
    let sound: AudioContext | null = null;
    // A browser starts the sound only in a real press. A dwell click is not
    // one, so the first real press or key opens the sound for later clicks.
    const open = () => {
      if (!Context) return null;
      sound ??= new Context();
      if (sound.state === "suspended") void sound.resume();
      return sound;
    };

    const onClick = (event: MouseEvent) => {
      const key = pressable(event.target);
      if (!key) return;
      key.dataset.accepted = "";
      lift(key);
      setTimeout(() => {
        delete key.dataset.accepted;
        settle(key);
      }, ACCEPTED_MS);
      if (quiet.current) return;
      // Before the first real press, the browser does not let the sound start.
      const active = navigator.userActivation?.hasBeenActive ?? false;
      const ready = active ? open() : sound;
      if (ready) playClick(ready);
    };
    document.addEventListener("pointerdown", open, true);
    document.addEventListener("keydown", open, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerdown", open, true);
      document.removeEventListener("keydown", open, true);
      document.removeEventListener("click", onClick, true);
      void sound?.close();
    };
  }, []);

  // Eye gaze: the key under the gaze fills, then presses.
  useEffect(() => {
    if (reach.dwellMs === null) return;
    const dwell = reach.dwellMs;
    // After a press, the next key can slide under a steady gaze. No key fills
    // until the gaze moves this far from the place of the press.
    const settleDistance = reach.targetPx / 2;
    let current: HTMLElement | null = null;
    // The key that was just pressed. It waits for the gaze to leave.
    let spent: HTMLElement | null = null;
    // Where the gaze was at the last press, until it moves away.
    let pressedAt: { x: number; y: number } | null = null;
    let gazeAt = { x: 0, y: 0 };
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    let start = 0;

    const stop = () => {
      clearTimeout(timer);
      if (frame) globalThis.cancelAnimationFrame?.(frame);
      frame = 0;
      if (current) {
        delete current.dataset.dwelling;
        current.style.removeProperty("--dwell");
        settle(current);
      }
      current = null;
    };

    const fill = () => {
      if (!current) return;
      const share = Math.min(1, (performance.now() - start) / dwell);
      current.style.setProperty("--dwell", String(share));
      frame = globalThis.requestAnimationFrame?.(fill) ?? 0;
    };

    const onGaze = (event: PointerEvent) => {
      gazeAt = { x: event.clientX, y: event.clientY };
      if (pressedAt) {
        const moved = Math.hypot(gazeAt.x - pressedAt.x, gazeAt.y - pressedAt.y);
        if (moved <= settleDistance) return;
        pressedAt = null;
      }
      const key = pressable(event.target) ?? field(event.target);
      if (key === current) return;
      stop();
      if (!key || key === spent) return;
      spent = null;
      current = key;
      key.dataset.dwelling = "";
      lift(key);
      start = performance.now();
      fill();
      timer = setTimeout(() => {
        const chosen = current;
        stop();
        spent = chosen;
        pressedAt = gazeAt;
        // A dwell on a text field puts the focus in it, so the person can type.
        if (chosen && field(chosen) === chosen) chosen.focus();
        else if (chosen) press(chosen);
      }, dwell);
    };

    // A click is a press too. The key under the pointer waits for the gaze
    // to move, as after a dwell. A click that a dwell makes has no detail.
    const onClick = (event: MouseEvent) => {
      if (event.detail === 0) return;
      stop();
      spent = pressable(event.target);
      pressedAt = { x: event.clientX, y: event.clientY };
    };

    const onOut = (event: PointerEvent) => {
      const key = pressable(event.target) ?? field(event.target);
      // Moving between the parts of one key is not leaving it.
      if (key && key === (pressable(event.relatedTarget) ?? field(event.relatedTarget))) return;
      if (key === spent) spent = null;
      if (key === current) stop();
    };

    document.addEventListener("pointerover", onGaze);
    document.addEventListener("pointermove", onGaze);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("click", onClick, true);
    return () => {
      stop();
      document.removeEventListener("pointerover", onGaze);
      document.removeEventListener("pointermove", onGaze);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("click", onClick, true);
    };
  }, [reach.dwellMs, reach.targetPx]);

  // Switch scanning: the steps first, then the keys of the chosen group.
  useEffect(() => {
    if (reach.scanStepMs === null) return;
    const stepMs = reach.scanStepMs;
    let level: "idle" | "step" | "key" = "idle";
    let step = -1;
    let key = -1;
    let scope: Element | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // The text field that the person types in with a keyboard. A field that
    // only has the focus, such as the composer when Talk opens, does not
    // stop the scan.
    let typedIn: EventTarget | null = null;
    const typingNow = (target: EventTarget | null) =>
      target !== null && target === typedIn && typing(target);

    const shown = (one: Element) => one.closest(HIDDEN) === null && drawn(one);
    const keysOf = (box: Element | undefined): HTMLElement[] =>
      box
        ? [...box.querySelectorAll<HTMLElement>(PRESSABLE)].filter(
            (one) => pressable(one) === one && shown(one),
          )
        : [];
    // A group that the layout dissolves with `display: contents` has no box
    // for the band, so the scan steps through its keys one by one.
    const isGroup = (one: Element | undefined | null) =>
      (one?.hasAttribute("data-scan-group") ?? false) &&
      getComputedStyle(one!).display !== "contents";
    const groupAbove = (one: Element) => {
      for (let at = one.parentElement; at; at = at.parentElement) {
        if (isGroup(at)) return at;
      }
      return null;
    };

    // The steps of the topmost open modal, or of the page. A new scope
    // starts the scan again at its first step.
    const steps = (): HTMLElement[] => {
      const modals = document.querySelectorAll(MODAL);
      const root = modals[modals.length - 1] ?? document.body;
      if (root !== scope) {
        scope = root;
        step = -1;
        if (level === "key") level = "step";
      }
      return [...root.querySelectorAll<HTMLElement>(`[data-scan-group], ${PRESSABLE}`)].filter(
        (one) => {
          if (one.hasAttribute("data-scan-group") && !isGroup(one)) return false;
          const outer = groupAbove(one);
          if (outer && root.contains(outer)) return false;
          if (!shown(one)) return false;
          return isGroup(one) ? keysOf(one).length > 0 : pressable(one) === one;
        },
      );
    };
    const clear = () =>
      document
        .querySelectorAll<HTMLElement>("[data-scan]")
        .forEach((one) => delete one.dataset.scan);

    const focus = (one: HTMLElement) => {
      one.dataset.scan = "key";
      one.focus();
    };

    const show = () => {
      clear();
      const all = steps();
      const box = all[step];
      if (!box) return;
      if (level === "step") {
        if (isGroup(box)) {
          box.dataset.scan = "group";
          // The band is the one place to look, so the group takes the focus
          // from the last key. A screen reader then reads the group.
          if (!box.hasAttribute("tabindex")) box.tabIndex = -1;
          box.focus();
        } else focus(box);
      }
      if (level === "key") {
        const one = keysOf(box)[key];
        if (one) focus(one);
      }
    };

    let waiting = false;
    const restart = () => {
      clearTimeout(timer);
      if (!waiting) timer = setTimeout(tick, stepMs);
    };
    const publish = () =>
      setScanControl({
        paused: waiting,
        toggle: () => (waiting ? scan.current?.resume() : scan.current?.pause()),
      });
    scan.current = {
      pause() {
        waiting = true;
        clearTimeout(timer);
        clear();
        publish();
      },
      resume() {
        waiting = false;
        publish();
        restart();
      },
    };
    publish();

    function next() {
      const all = steps();
      if (all.length === 0) return;
      if (level === "key") {
        // After the last key, the band goes back on the group, so the next
        // step leaves it.
        key += 1;
        if (key >= keysOf(all[step]).length) level = "step";
      } else {
        level = "step";
        step = (step + 1) % all.length;
      }
      show();
      restart();
    }

    // The scan waits while the person types, so it does not take the focus.
    function tick() {
      if (waiting) return;
      if (typingNow(document.activeElement)) return restart();
      next();
    }

    const choose = () => {
      if (level === "idle") return next();
      const box = steps()[step];
      if (!box) return next();
      if (level === "step" && isGroup(box)) {
        const keys = keysOf(box);
        if (keys.length > 1) {
          level = "key";
          key = 0;
          show();
          restart();
          return;
        }
        if (keys[0]) press(keys[0]);
        show();
        restart();
        return;
      }
      const chosen = level === "key" ? keysOf(box)[key] : box;
      level = "step";
      show();
      if (chosen) press(chosen);
      restart();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== " " && event.key !== "Enter") {
        if (typing(event.target) && (event.key.length === 1 || event.key === "Backspace")) {
          typedIn = event.target;
        }
        return;
      }
      if (typingNow(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      // While the scan waits, any press starts it again.
      if (waiting) {
        scan.current?.resume();
        return;
      }
      // A key that the person moved the focus to with Tab is the choice,
      // not the place of the scan.
      const focused = pressable(event.target);
      if (event.key === "Enter" && focused && focused === event.target && !("scan" in focused.dataset)) {
        press(focused);
        restart();
        return;
      }
      if (event.key === " ") next();
      else choose();
    };

    const onLeave = (event: FocusEvent) => {
      if (event.target === typedIn) typedIn = null;
    };

    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusout", onLeave, true);
    // The scan starts by itself, so a person with one switch can begin.
    restart();
    return () => {
      clearTimeout(timer);
      clear();
      scan.current = null;
      setScanControl(null);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("focusout", onLeave, true);
    };
  }, [reach.scanStepMs]);

  return <ModalPauseKey />;
}

/** The topmost open modal, or null. */
function topModal(): HTMLElement | null {
  const modals = document.querySelectorAll<HTMLElement>(MODAL);
  return modals[modals.length - 1] ?? null;
}

/**
 * A second Pause scan key, at the end of the topmost open modal.
 *
 * The scan holds a sheet, a dialog, or a menu while it is open, so the key
 * of the shell is out of its reach. This key is inside the modal, in the
 * scope of the scan and in the focus trap of the modal.
 */
function ModalPauseKey() {
  const control = useSyncExternalStore(subscribeScan, () => scanControl, () => null);
  const [modal, setModal] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!control) return;
    const read = () => setModal(topModal());
    read();
    const watch = new MutationObserver(read);
    watch.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "aria-modal"],
    });
    return () => watch.disconnect();
  }, [control]);

  if (!control || !modal || !modal.isConnected) return null;
  const menu = modal.matches('[data-slot="dropdown-menu-content"], [data-slot="select-content"]');
  return createPortal(
    <ScanPauseKey role={menu ? "menuitem" : undefined} className="mt-3 self-start" />,
    modal,
  );
}
