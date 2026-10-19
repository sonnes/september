import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

import {
  ChevronLeft,
  ChevronRight,
  Palette,
  Play,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import {
  chunkFontRatio,
  chunkProgress,
  PRESENT_TONES,
  presentChunks,
  presentTone,
  roleSpec,
  stepChunk,
  STAGE_PADDING_RATIO,
  type PresentChunk,
  type PresentSettings,
  type PresentTone,
} from "@september/core/rules/present";
import { BrandMark, BrandWordmark } from "@september/app-ui/blocks/brand";
import {
  currentPresent,
  fullScreen,
  rememberPresent,
} from "@platform/services/os";
import { speak, stopSpeaking } from "@platform/services/speech";
import { recordPresentUsage } from "@platform/services/usage";

/** What is speaking, so the note screen can tell its own voice-over apart. */
const PRESENT_SPEAKER = "present";

/**
 * A note on the whole screen, one chunk at a time.
 *
 * This is live communication, not a file: a Mac or an iPad turned to face the
 * room. It is an overlay and not a route, because the address of the app must
 * stay on the note the user is holding.
 *
 * It needs no setup at all. Without a voice the words simply wait for a press,
 * which is the oldest assistive move there is — big text, and a partner who
 * reads it.
 */
export function PresentOverlay({
  name,
  content,
  onClose,
}: {
  name?: string | null;
  content: string;
  onClose: () => void;
}) {
  const chunks = useMemo(() => presentChunks(content), [content]);
  const [index, setIndex] = useState(0);
  const [settings, setSettings] = useState<PresentSettings>(currentPresent);
  const [paused, setPaused] = useState(false);
  const [speechFailed, setSpeechFailed] = useState(false);
  const [colours, setColours] = useState(false);
  const stage = useStageSize();
  const held = useRef<HTMLDivElement>(null);
  // The words fit between the top bar and the keys, so the keys never cover
  // them.
  const topBar = useRef<HTMLDivElement>(null);
  const keyRow = useRef<HTMLDivElement>(null);
  const room = useChromeRoom(topBar, keyRow);

  // The stage takes the focus, and gives it back to the key that opened it.
  useEffect(() => {
    const opener = document.activeElement;
    held.current?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  // The desktop panel fills the screen while it presents, and goes back to
  // its size when the overlay closes. The browser does nothing.
  useEffect(() => {
    void fullScreen(true);
    return () => void fullScreen(false);
  }, []);

  const tone = presentTone(settings.tone);
  const chunk = chunks[index];
  const total = chunks.length;
  const spoken = settings.spoken;
  // The words themselves, not the object that holds them. A save that lands
  // behind the stage makes a new list of the same chunks, and a sentence must
  // not start over because a row was written.
  const words = chunk?.text ?? "";

  const move = (delta: number) => setIndex((at) => stepChunk(at, total, delta));

  const choose = (next: Partial<PresentSettings>) => {
    const saved = { ...settings, ...next };
    setSettings(saved);
    void rememberPresent(saved);
  };

  // One event for the story, not one for each chunk.
  useEffect(() => {
    void recordPresentUsage(chunks.length, spoken);
    // The mode can change mid-story; the count of what was started cannot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The serif belongs to the paper tints. It is fetched when one is chosen,
  // and never on the app's own colours, which are already in Noto Sans.
  useEffect(() => {
    if (tone.family !== "reading") return;
    void import("@fontsource-variable/fraunces").catch(() => undefined);
  }, [tone.family]);

  // The voice carries the story, so the story waits for the voice. `speak()`
  // resolves when the sound stops, which is the whole of the timing here.
  useEffect(() => {
    if (!words || !spoken || paused) return;

    let live = true;
    void (async () => {
      setSpeechFailed(false);
      const played = await speak(words, PRESENT_SPEAKER).catch(() => false);
      if (!live) return;
      if (played) setIndex((at) => (at === index ? stepChunk(at, total, 1) : at));
      else {
        setSpeechFailed(true);
        setPaused(true);
      }
    })();

    return () => {
      live = false;
      stopSpeaking();
    };
  }, [words, spoken, paused, index, total]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") move(1);
      else if (event.key === "ArrowLeft") move(-1);
      else if (event.key === " ") setPaused((held) => !held);
      else if (event.key === "Home") setIndex(0);
      else if (event.key === "End") setIndex(Math.max(0, total - 1));
      else return;
      event.preventDefault();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // `move` is new on each render, and reads the same state as this handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, onClose]);

  const chrome = (share: number) =>
    `color-mix(in srgb, ${tone.display} ${share}%, transparent)`;

  return (
    <div
      ref={held}
      role="dialog"
      aria-modal="true"
      onKeyDown={(event) => keepTabInside(event, held.current)}
      // The stage takes the focus, so a switch scan and a screen reader both
      // start here and not on the note behind it.
      tabIndex={-1}
      aria-label={name ? `Presenting ${name}` : "Presenting a note"}
      className="fixed inset-0 z-50 overflow-hidden focus:outline-none"
      style={{ backgroundColor: tone.background, color: tone.display }}
    >
      <Progress index={index} total={total} tone={tone} />

      <div className="absolute inset-x-0" style={{ top: room.top, bottom: room.bottom }}>
        {chunk ? (
          <Stage
            chunk={chunk}
            tone={tone}
            stage={{
              width: stage.width,
              height: Math.max(1, stage.height - room.top - room.bottom),
            }}
          />
        ) : (
          <p className="grid h-full place-items-center px-8 text-center text-2xl opacity-70">
            This note has no words yet.
          </p>
        )}
      </div>

      <Zones index={index} total={total} onMove={move} />

      <div
        ref={topBar}
        className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4"
      >
        <span className="pointer-events-none opacity-80">
          {tone.mark === "keycap" ? (
            <BrandMark size={28} />
          ) : (
            <BrandWordmark className="text-sm" />
          )}
        </span>
        <button
          type="button"
          aria-label="Close the presentation"
          onClick={onClose}
          className="focus-attention pointer-events-auto grid size-[max(3rem,var(--reach-target,3rem))] place-items-center rounded-full transition-opacity hover:opacity-80"
          style={{ backgroundColor: chrome(12), color: tone.display }}
        >
          <X aria-hidden />
        </button>
      </div>

      <div
        ref={keyRow}
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4"
      >
        {speechFailed ? (
          <p role="alert" className="px-4 text-center text-sm">
            Speech could not play. Start the voice again to retry, or continue with the words on screen.
          </p>
        ) : null}
        {colours ? (
          <div
            role="group"
            aria-label="Tone"
            className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-full p-2"
            style={{ backgroundColor: chrome(10) }}
          >
            {PRESENT_TONES.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-label={option.name}
                aria-pressed={option.key === tone.key}
                onClick={() => choose({ tone: option.key })}
                className="focus-attention size-[max(3rem,var(--reach-target,3rem))] rounded-full border-2 transition-transform"
                style={{
                  backgroundColor: option.background,
                  borderColor:
                    option.key === tone.key ? tone.display : "transparent",
                }}
              />
            ))}
          </div>
        ) : null}

        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-[var(--reach-gap,0.5rem)]">
          <MoveKeys
            index={index}
            total={total}
            spoken={spoken}
            paused={paused}
            tone={tone}
            onMove={move}
            onHold={() => setPaused((held) => !held)}
          />
          <ChromeButton
            label={spoken ? "Turn the voice off" : "Turn the voice on"}
            tone={tone}
            onClick={() => choose({ spoken: !spoken })}
          >
            {spoken ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
          </ChromeButton>
          <ChromeButton
            label={colours ? "Hide the colours" : "Colours"}
            tone={tone}
            pressed={colours}
            onClick={() => setColours((open) => !open)}
          >
            <Palette aria-hidden />
          </ChromeButton>
        </div>
      </div>
    </div>
  );
}

const TABBABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Tab and Shift-Tab go around the keys of the stage, so the focus never
 * reaches the note behind it.
 */
function keepTabInside(event: ReactKeyboardEvent<HTMLDivElement>, stage: HTMLElement | null) {
  if (event.key !== "Tab" || !stage) return;
  const keys = [...stage.querySelectorAll<HTMLElement>(TABBABLE)];
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) return;

  const at = document.activeElement;
  if (event.shiftKey && (at === first || at === stage)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && at === last) {
    event.preventDefault();
    first.focus();
  }
}

/** One chunk, as large as the stage can hold it. */
function Stage({
  chunk,
  tone,
  stage,
}: {
  chunk: PresentChunk;
  tone: PresentTone;
  stage: { width: number; height: number };
}) {
  const spec = roleSpec(chunk.role, tone.family);
  const size = chunkFontRatio(chunk.text, chunk.role, stage.height / stage.width);

  return (
    <div
      // The room may hold a screen reader too, so each chunk is announced as
      // it rises.
      aria-live="polite"
      className="grid h-full place-items-center"
      style={{ padding: `${STAGE_PADDING_RATIO * 100}%` }}
    >
      <p
        // A new chunk rises in, unless the reader asked for no motion.
        key={chunk.text}
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-reduce:animate-none text-center text-balance"
        style={{
          fontFamily: spec.fontFamily,
          fontWeight: spec.fontWeight,
          fontSize: `${Math.round(size * stage.width)}px`,
          lineHeight: spec.lineHeightRatio,
          color: chunk.role === "display" ? tone.display : tone.support,
        }}
      >
        {chunk.text}
      </p>
    </div>
  );
}

/** One segment for each chunk, so the room can see how much is left. */
function Progress({
  index,
  total,
  tone,
}: {
  index: number;
  total: number;
  tone: PresentTone;
}) {
  return (
    <div
      role="progressbar"
      aria-label="Presentation progress"
      aria-valuenow={Math.round(chunkProgress(index, total) * 100)}
      className="absolute inset-x-0 top-0 flex gap-1 p-2"
    >
      {Array.from({ length: total }, (_, at) => (
        <span
          key={at}
          className="h-[2.5px] flex-1 rounded-full transition-opacity"
          style={{
            backgroundColor: tone.display,
            opacity: at <= index ? 0.85 : 0.25,
          }}
        />
      ))}
    </div>
  );
}

/**
 * The stage in thirds: back, hold, on.
 *
 * A press anywhere lands somewhere useful, which matters most for a partner
 * holding the iPad who has never used September before. The thirds are for a
 * hand only. They are not keys, so a gaze that reads the words presses
 * nothing, and a switch scan steps over them. The keys below the words do the
 * same moves for everyone.
 */
function Zones({
  index,
  total,
  onMove,
}: {
  index: number;
  total: number;
  onMove: (delta: number) => void;
}) {
  return (
    <div aria-hidden className="absolute inset-0 flex">
      <div className="h-full flex-1" onClick={() => index > 0 && onMove(-1)} />
      <div className="h-full flex-1" />
      <div className="h-full flex-1" onClick={() => index < total - 1 && onMove(1)} />
    </div>
  );
}

/**
 * Previous, Stop, and Next: keys at the reach size, in one scan group.
 *
 * Each key stays in place at both ends and in silence. A key that has
 * nothing to do says so with `aria-disabled` and a dotted line.
 */
function MoveKeys({
  index,
  total,
  spoken,
  paused,
  tone,
  onMove,
  onHold,
}: {
  index: number;
  total: number;
  spoken: boolean;
  paused: boolean;
  tone: PresentTone;
  onMove: (delta: number) => void;
  onHold: () => void;
}) {
  const key =
    "focus-attention key-disabled-on-stage inline-flex min-h-[max(3rem,var(--reach-target,3rem))] min-w-[max(3rem,var(--reach-target,3rem))] items-center justify-center gap-2 rounded-control border-2 px-4 text-base font-semibold";
  const line = `color-mix(in srgb, ${tone.display} 55%, transparent)`;
  // A disabled key keeps the ink of the tone, so its name stays readable on
  // the stage. The dotted line says that it has nothing to do.
  const style = {
    backgroundColor: `color-mix(in srgb, ${tone.display} 12%, transparent)`,
    borderColor: line,
    color: tone.display,
    "--stage-ink": tone.display,
    "--stage-line": line,
  } as CSSProperties;

  return (
    <div data-scan-group className="flex items-center gap-[var(--reach-gap,0.5rem)]">
      <button
        type="button"
        aria-label="Previous chunk"
        aria-disabled={index === 0}
        onClick={() => index > 0 && onMove(-1)}
        className={key}
        style={style}
      >
        <ChevronLeft aria-hidden />
        Previous
      </button>
      <button
        type="button"
        aria-label={paused ? "Start the voice again" : "Stop the voice"}
        // Silence has nothing to stop. The key stays, so the row never moves
        // under a hand that has learned where it is.
        aria-disabled={!spoken}
        onClick={() => spoken && onHold()}
        className={key}
        style={style}
      >
        {paused ? <Play aria-hidden /> : <Square aria-hidden />}
        {paused ? "Start" : "Stop"}
      </button>
      <button
        type="button"
        aria-label="Next chunk"
        aria-disabled={index >= total - 1}
        onClick={() => index < total - 1 && onMove(1)}
        className={key}
        style={style}
      >
        Next
        <ChevronRight aria-hidden />
      </button>
    </div>
  );
}

function ChromeButton({
  label,
  tone,
  pressed,
  onClick,
  children,
}: {
  label: string;
  tone: PresentTone;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="focus-attention grid size-[max(3rem,var(--reach-target,3rem))] place-items-center rounded-full transition-opacity hover:opacity-80"
      style={{
        backgroundColor: `color-mix(in srgb, ${tone.display} ${pressed ? 24 : 12}%, transparent)`,
        color: tone.display,
      }}
    >
      {children}
    </button>
  );
}

/**
 * The heights of the top bar and the keys at the foot of the stage. The words
 * fit in the room between them.
 */
function useChromeRoom(
  top: RefObject<HTMLElement | null>,
  bottom: RefObject<HTMLElement | null>,
): { top: number; bottom: number } {
  const [room, setRoom] = useState({ top: 0, bottom: 0 });

  useEffect(() => {
    const above = top.current;
    const below = bottom.current;
    if (!above || !below || typeof ResizeObserver === "undefined") return;
    const read = () => {
      const next = { top: above.offsetHeight, bottom: below.offsetHeight };
      setRoom((held) => (held.top === next.top && held.bottom === next.bottom ? held : next));
    };
    const observer = new ResizeObserver(read);
    observer.observe(above);
    observer.observe(below);
    return () => observer.disconnect();
  }, [top, bottom]);

  return room;
}

/**
 * The size of the stage.
 *
 * Present is full-bleed, so the stage is the window. A Mac in landscape and an
 * iPad held upright reach different sizes from the same words, which is why
 * the fit reads the height as well as the width.
 */
function useStageSize(): { width: number; height: number } {
  const [size, setSize] = useState(() => ({
    width: typeof window === "undefined" ? 1376 : window.innerWidth,
    height: typeof window === "undefined" ? 1032 : window.innerHeight,
  }));
  const held = useRef(size);
  held.current = size;

  useEffect(() => {
    const read = () => {
      const next = { width: window.innerWidth, height: window.innerHeight };
      if (next.width !== held.current.width || next.height !== held.current.height) {
        setSize(next);
      }
    };

    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  return size;
}
