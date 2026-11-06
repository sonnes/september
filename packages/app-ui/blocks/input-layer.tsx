import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Pause, Play } from "lucide-react";
import { cn } from "@september/ui";
import { useSpeaking } from "@september/app-ui/services/speech";
import { type AccessProfile, reachFor } from "@september/core/rules/access";
import { KEY_SIZE, useAccess } from "@september/app-ui/blocks/access";

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
 * A part of the screen that dwell and scan never press: a control only for a
 * pointer, such as the edge strip that toggles the sidebar, and a key marked
 * `data-access-skip`, such as the skip link.
 */
const UNPRESSABLE = "[data-pointer-only], [data-access-skip]";

/** A key that opens its popup on a pointer press or a key, not on a click. */
const POPUP_TRIGGER = '[aria-haspopup="menu"], [aria-haspopup="listbox"], [role="combobox"]';

/** A modal that holds the whole input while it is open. A Radix dialog or
 * sheet sets no `aria-modal`, so its open state marks it. */
const MODAL = [
  '[role="dialog"][aria-modal="true"]',
  '[role="alertdialog"]',
  '[data-modal][data-state="open"]',
  // An open menu or list holds the scan until it closes.
  '[data-menu][data-state="open"]',
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
  const menu = modal.matches("[data-menu]");
  return createPortal(
    <ScanPauseKey role={menu ? "menuitem" : undefined} className="mt-3 self-start" />,
    modal,
  );
}
