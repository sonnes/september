import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";

import {
  Bold,
  Delete,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  TextQuote,
  Undo2,
} from "lucide-react";

import { cn } from "@september/ui";

import { usePanel } from "@september/app-ui/blocks/chrome";
import { Suggestions } from "@september/app-ui/blocks/suggestions";
import {
  inlineParts,
  lineKind,
  lineLead,
  nextLead,
  replaceRange,
  sentenceBefore,
  styleOf,
  toggleLineStyle,
  wordStartBefore,
  wrapInline,
  type LineKind,
  type LineStyle,
  type Point,
} from "@september/core/rules/note-document";

/** What the screen around the document can ask of it. */
export interface NoteDocumentHandle {
  /** Puts words at the caret, as a phrase from the rail does. */
  insert: (text: string) => void;
  /** The selected words of the document, or an empty string. */
  selection: () => string;
  /** The words of the document as they stand. */
  text: () => string;
  /** Shows the writing tools at the caret. */
  openTools: () => void;
}

interface Span {
  from: Point;
  to: Point;
}

const LINE_STYLES: { style: LineStyle; label: string; icon: ReactNode }[] = [
  { style: "h1", label: "Heading 1", icon: <Heading1 aria-hidden /> },
  { style: "h2", label: "Heading 2", icon: <Heading2 aria-hidden /> },
  { style: "li", label: "Bulleted list", icon: <List aria-hidden /> },
  { style: "ol", label: "Numbered list", icon: <ListOrdered aria-hidden /> },
  { style: "task", label: "Checklist", icon: <ListTodo aria-hidden /> },
  { style: "quote", label: "Quote", icon: <TextQuote aria-hidden /> },
];

const KEY =
  "focus-attention key-disabled inline-flex size-12 shrink-0 items-center justify-center rounded-control border bg-background transition-colors hover:bg-accent [&_svg]:size-5";

/**
 * A note as a document of Markdown lines.
 *
 * Each line shows its format: a heading is large, a list has bullets, and a
 * bold run is bold. The line that holds the caret shows its Markdown as well,
 * so the user can see and change it. The stored text is the Markdown itself.
 *
 * The writing tools appear on the first typed key, under the line that holds
 * the caret. They give the suggestion stripes, the style keys, Undo, and
 * Delete last word. Escape hides them, so the page is quiet again for reading.
 */
export function NoteDocument({
  value,
  onChange,
  label,
  placeholder,
  spaceId,
  context,
  onPin,
  onBlur,
  onTools,
  handle,
  autoFocus = true,
}: {
  value: string;
  onChange: (text: string) => void;
  /** The name that a reader gives the document. */
  label: string;
  placeholder: string;
  /** The space the stripes read. */
  spaceId: string;
  context: string;
  onPin?: (phrase: string) => void;
  onBlur?: () => void;
  /** Says when the writing tools open and close. */
  onTools?: (open: boolean) => void;
  handle?: MutableRefObject<NoteDocumentHandle | null>;
  autoFocus?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const tray = useRef<HTMLDivElement>(null);
  // Becomes true when the user moves the caret or writes.
  const moved = useRef(false);
  const lines = useRef(value.split("\n"));
  const span = useRef<Span>(endOf(lines.current));
  const history = useRef<{ lines: string[]; caret: Point }[]>([]);
  const [open, setOpen] = useState(false);
  const [sentence, setSentence] = useState("");
  const [kind, setKind] = useState<LineKind>("p");
  const [canUndo, setCanUndo] = useState(false);
  const [top, setTop] = useState<number | null>(null);
  const [above, setAbove] = useState(false);

  // The words before the caret and the style of its line, for the tools.
  const refresh = useCallback(() => {
    const { line, offset } = span.current.to;
    const text = lines.current[line] ?? "";
    setSentence(sentenceBefore(text, offset).text);
    setKind(lineKind(text));
  }, []);

  // The tools sit under the caret, or over it when the page has no room
  // below. They are part of the page, so they scroll with the line.
  const measure = useCallback(() => {
    const element = box.current;
    const base = frame.current?.getBoundingClientRect();
    if (!element || !base) return;
    const caret = caretRect(element, span.current.to.line);
    if (!caret) {
      setTop(0);
      return;
    }
    const view = (element.closest("[data-note-scroll]") ?? element).getBoundingClientRect();
    const height = tray.current?.offsetHeight ?? 0;
    const flip = view.bottom - caret.bottom < height + 24 && caret.top - view.top > height + 24;
    setAbove(flip);
    setTop(flip ? caret.top - base.top - height - 12 : caret.bottom - base.top + 12);
  }, []);

  const commit = useCallback(
    (next: string[], caret: Point) => {
      const element = box.current;
      lines.current = next;
      span.current = { from: caret, to: caret };
      if (element) {
        draw(element, next);
        element.focus({ preventScroll: true });
        placeCaret(element, caret);
        markActive(element, caret.line, true);
      }
      refresh();
      onChange(next.join("\n"));
    },
    [onChange, refresh],
  );

  /** Puts text in the place of a span. Undo can take back a remembered edit. */
  const apply = useCallback(
    (from: Point, to: Point, text: string, remember = true) => {
      moved.current = true;
      if (remember) {
        history.current = [
          ...history.current.slice(-49),
          { lines: lines.current.slice(), caret: span.current.to },
        ];
        setCanUndo(true);
      }
      const made = replaceRange(lines.current, from, to, text);
      commit(made.lines, made.caret);
    },
    [commit],
  );

  /** Changes one line, and puts the caret at a character of it. */
  const setLine = (line: number, text: string, offset: number) => {
    history.current = [
      ...history.current.slice(-49),
      { lines: lines.current.slice(), caret: span.current.to },
    ];
    setCanUndo(true);
    const next = lines.current.slice();
    next[line] = text;
    commit(next, { line, offset });
  };

  const insert = useCallback(
    (text: string) => {
      const { from, to } = span.current;
      const before = (lines.current[from.line] ?? "").slice(0, from.offset);
      apply(from, to, (before && !/\s$/.test(before) ? " " : "") + text);
    },
    [apply],
  );

  const openTools = useCallback(() => {
    const element = box.current;
    if (element && !element.contains(document.activeElement)) {
      element.focus({ preventScroll: true });
      placeCaret(element, span.current.to);
    }
    setOpen(true);
    refresh();
  }, [refresh]);

  if (handle) {
    handle.current = {
      insert,
      selection: () => textOf(lines.current, span.current),
      text: () => lines.current.join("\n"),
      openTools,
    };
  }

  // The first drawing, and a new value from outside, such as another writer.
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    if (element.childNodes.length > 0 && value === lines.current.join("\n")) return;
    lines.current = value.split("\n");
    draw(element, lines.current);
    if (element.childNodes.length > 0 && autoFocus && !element.contains(document.activeElement)) {
      span.current = endOf(lines.current);
      element.focus({ preventScroll: true });
      placeCaret(element, span.current.to);
      markActive(element, span.current.to.line, true);
    }
    // The value is the only input. The caret is kept by the editor itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // The heading serif. It is fetched with the first note on the screen.
  useEffect(() => {
    void import("@fontsource-variable/fraunces").catch(() => undefined);
  }, []);

  // The caret decides the line that shows its Markdown and the words that
  // the stripes read.
  useEffect(() => {
    const onSelection = () => {
      const element = box.current;
      const selection = getSelection();
      if (!element || !selection?.rangeCount || !element.contains(selection.anchorNode)) return;
      const anchor = pointOf(element, selection.anchorNode!, selection.anchorOffset);
      const focus = pointOf(element, selection.focusNode!, selection.focusOffset);
      if (!anchor || !focus) return;
      const forward =
        anchor.line < focus.line || (anchor.line === focus.line && anchor.offset <= focus.offset);
      span.current = forward ? { from: anchor, to: focus } : { from: focus, to: anchor };
      markActive(element, focus.line, selection.isCollapsed);
      refresh();
      // The note opens at its top. The scroll follows the caret only after
      // the user moves it or writes.
      if (moved.current) keepCaretClear(element, focus.line);
      if (open) measure();
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, [open, measure, refresh]);

  // Escape hides the tools before any other screen hears it. ⌘J or Ctrl+J
  // shows them without a typed key, for a user who writes from suggestions.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        if (open) setOpen(false);
        else openTools();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, openTools]);

  useEffect(() => onTools?.(open), [open, onTools]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    const scroller = box.current?.closest("[data-note-scroll]");
    scroller?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => {
      scroller?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [open, sentence, kind, measure]);

  // A phrase from the panel goes in at the caret.
  const composer = usePanel()?.composer;
  useEffect(() => {
    if (!composer) return;
    const held = { draft: "", insert, speaks: false };
    composer.current = held;
    return () => {
      if (composer.current === held) composer.current = null;
    };
  }, [composer, insert]);

  const onInput = (event: React.FormEvent<HTMLDivElement>) => {
    const element = box.current;
    if (!element) return;
    normalize(element);
    lines.current = [...element.childNodes].map((row) => row.textContent ?? "");
    element.toggleAttribute("data-empty", lines.current.join("") === "");
    // The caret line is drawn again, so a typed mark takes its place and a
    // word typed after a mark is not drawn as part of it.
    const selection = getSelection();
    const at =
      selection?.rangeCount && selection.isCollapsed && selection.anchorNode
        ? pointOf(element, selection.anchorNode, selection.anchorOffset)
        : null;
    if (at && !(event.nativeEvent as InputEvent).isComposing) {
      const row = element.childNodes[at.line] as HTMLElement;
      fill(row, row.textContent ?? "");
      placeCaret(element, at);
      span.current = { from: at, to: at };
    }
    refresh();
    onChange(lines.current.join("\n"));
    setOpen(true);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    moved.current = true;
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const { from, to } = span.current;
    const line = lines.current[from.line] ?? "";
    const lead = lineLead(line);
    // Enter on an empty item ends the list.
    if (lead && line === lead && !event.shiftKey && styleOf(lineKind(line))) {
      apply({ line: from.line, offset: 0 }, { line: from.line, offset: lead.length }, "", false);
      return;
    }
    apply(from, to, `\n${event.shiftKey ? "" : nextLead(line)}`, false);
    setOpen(true);
  };

  const onPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n");
    if (text) apply(span.current.from, span.current.to, text);
  };

  const style = (next: LineStyle) => {
    const { line, offset } = span.current.to;
    const made = toggleLineStyle(lines.current[line] ?? "", next, offset);
    setLine(line, made.text, made.caret);
  };

  const wrap = (mark: string) => {
    const { from, to } = span.current;
    const line = lines.current[from.line] ?? "";
    const end = to.line === from.line ? to.offset : line.length;
    const made = wrapInline(line, from.offset, end, mark);
    setLine(from.line, made.text, made.caret);
  };

  const deleteWord = () => {
    const { from, to } = span.current;
    if (from.line !== to.line || from.offset !== to.offset) return apply(from, to, "");
    const line = lines.current[to.line] ?? "";
    const start = wordStartBefore(line, to.offset);
    if (start < to.offset) {
      apply({ line: to.line, offset: start }, to, "");
    } else if (to.offset === 0 && to.line > 0) {
      const previous = lines.current[to.line - 1];
      apply({ line: to.line - 1, offset: previous.length }, to, "");
    }
  };

  const undo = () => {
    const last = history.current.at(-1);
    if (!last) return;
    history.current = history.current.slice(0, -1);
    setCanUndo(history.current.length > 0);
    commit(last.lines, last.caret);
  };

  const take = (next: string) => {
    const { line, offset } = span.current.to;
    const { start } = sentenceBefore(lines.current[line] ?? "", offset);
    apply({ line, offset: start }, { line, offset }, next);
  };

  const finish = (whole: string) => {
    const { line, offset } = span.current.to;
    const { start } = sentenceBefore(lines.current[line] ?? "", offset);
    apply({ line, offset: start }, { line, offset }, `${whole.trim()}\n`);
  };

  const pressed = styleOf(kind);

  return (
    <div ref={frame} className="note-frame relative">
      <div
        ref={box}
        role="textbox"
        aria-multiline
        aria-label={label}
        data-placeholder={placeholder}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onInput={onInput}
        onKeyDown={onKeyDown}
        onPointerDown={() => {
          moved.current = true;
        }}
        onPaste={onPaste}
        onBlur={onBlur}
        className="note-document caret-primary min-h-40 text-xl leading-relaxed focus:outline-none"
      />

      {open ? (
        <div
          ref={tray}
          role="group"
          aria-label="Writing tools"
          // The caret stays in the note while a key of the tools is pressed.
          onMouseDown={(event) => event.preventDefault()}
          style={{ top: top ?? 0, visibility: top === null ? "hidden" : undefined }}
          className={cn(
            "bg-background/95 rounded-surface absolute inset-x-0 z-20 flex flex-col gap-2.5 border p-3 shadow-lg backdrop-blur",
            above ? "origin-bottom" : "origin-top",
          )}
        >
          {/* One row. A narrow panel scrolls it sideways, so no key wraps
              away from the others. */}
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div role="toolbar" aria-label="Style" className="flex shrink-0 items-center gap-1.5">
              {LINE_STYLES.map((one) => (
                <button
                  key={one.style}
                  type="button"
                  aria-label={one.label}
                  aria-pressed={pressed === one.style}
                  onClick={() => style(one.style)}
                  className={cn(KEY, "aria-pressed:border-primary/40 aria-pressed:bg-primary/10 aria-pressed:text-brand")}
                >
                  {one.icon}
                </button>
              ))}
              <span aria-hidden className="bg-border mx-0.5 h-7 w-px shrink-0" />
              <button type="button" aria-label="Bold" onClick={() => wrap("**")} className={KEY}>
                <Bold aria-hidden />
              </button>
              <button type="button" aria-label="Italic" onClick={() => wrap("*")} className={KEY}>
                <Italic aria-hidden />
              </button>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-1.5">
              <button
                type="button"
                aria-label="Undo"
                aria-disabled={!canUndo}
                onClick={undo}
                className={KEY}
              >
                <Undo2 aria-hidden />
              </button>
              <button type="button" aria-label="Delete last word" onClick={deleteWord} className={KEY}>
                <Delete aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Hide writing tools"
                title="Hide (Esc)"
                onClick={() => setOpen(false)}
                className="focus-attention bg-foreground text-background inline-flex min-h-12 shrink-0 items-center rounded-control px-3 text-sm font-semibold"
              >
                Esc
              </button>
            </div>
          </div>

          {/* The rule shows only when the stripes have rows. */}
          <div className="border-t pt-2.5 empty:hidden">
            <Suggestions
              spaceId={spaceId}
              context={context}
              text={sentence}
              document={around(lines.current, span.current.to)}
              // The other lines are the words the user wrote before. The caret
              // line would only give back the words being typed.
              history={earlier(lines.current, span.current.to.line)}
              finishLabel="Add to the note"
              onTake={take}
              onSpeak={finish}
              onPin={(phrase) => onPin?.(phrase)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

const endOf = (lines: string[]): Span => {
  const caret = { line: lines.length - 1, offset: lines.at(-1)?.length ?? 0 };
  return { from: caret, to: caret };
};

/** The words of every other line, without their Markdown prefix. */
function earlier(lines: string[], caret: number): string[] {
  return lines
    .filter((_, index) => index !== caret)
    .map((line) => line.slice(lineLead(line).length).trim())
    .filter(Boolean);
}

/** The note before the caret and after it. */
function around(lines: string[], { line, offset }: Point) {
  const at = lines[line] ?? "";
  return {
    before: [...lines.slice(0, line), at.slice(0, offset)].join("\n"),
    after: [at.slice(offset), ...lines.slice(line + 1)].join("\n"),
  };
}

/** The words of a span, with a line break between lines. */
function textOf(lines: string[], { from, to }: Span): string {
  if (from.line === to.line) return lines[from.line].slice(from.offset, to.offset);
  return [
    lines[from.line].slice(from.offset),
    ...lines.slice(from.line + 1, to.line),
    lines[to.line].slice(0, to.offset),
  ].join("\n");
}

/** Draws every line, each with the pieces that show its format. */
function draw(element: HTMLElement, lines: string[]) {
  element.replaceChildren(
    ...lines.map((text) => {
      const row = document.createElement("div");
      fill(row, text);
      return row;
    }),
  );
  element.toggleAttribute("data-empty", lines.join("") === "");
}

function fill(row: HTMLElement, text: string) {
  const kind = lineKind(text);
  row.dataset.kind = kind;
  // A heading line is a heading for a screen reader too. The marks of the
  // other lines stay in the text, so a reader still says what each line is.
  if (kind === "h1" || kind === "h2") {
    row.setAttribute("role", "heading");
    row.setAttribute("aria-level", kind === "h1" ? "1" : "2");
  } else {
    row.removeAttribute("role");
    row.removeAttribute("aria-level");
  }
  row.replaceChildren(
    ...(text
      ? inlineParts(text).map((part) => {
          if (part.role === "text") return document.createTextNode(part.text);
          const piece = document.createElement(
            part.role === "bold" ? "strong" : part.role === "italic" ? "em" : "span",
          );
          if (part.role === "lead" || part.role === "mark") piece.dataset.mark = part.role;
          piece.textContent = part.text;
          return piece;
        })
      : [document.createElement("br")]),
  );
}

/**
 * Marks the line that holds the caret, so its Markdown shows.
 *
 * The line the caret left is drawn again, so a mark typed there takes its
 * format. A line is not drawn again during a selection, because the selection
 * holds the nodes of the line.
 */
function markActive(element: HTMLElement, line: number, collapsed: boolean) {
  const row = element.childNodes[line] as HTMLElement | undefined;
  for (const other of element.querySelectorAll<HTMLElement>(":scope > [data-active]")) {
    if (other === row) continue;
    other.removeAttribute("data-active");
    if (collapsed) fill(other, other.textContent ?? "");
  }
  row?.setAttribute?.("data-active", "");
}

/** Puts every loose node of the document in a line of its own. */
function normalize(element: HTMLElement) {
  const selection = getSelection();
  const node = selection?.anchorNode ?? null;
  const offset = selection?.anchorOffset ?? 0;
  let moved = false;
  for (const child of [...element.childNodes]) {
    if (child instanceof HTMLDivElement) continue;
    const row = document.createElement("div");
    element.replaceChild(row, child);
    row.append(child);
    moved = true;
  }
  if (element.childNodes.length === 0) {
    element.append(document.createElement("div"));
    moved = true;
  }
  if (moved && node?.isConnected && selection) {
    const range = document.createRange();
    range.setStart(node, Math.min(offset, node.textContent?.length ?? 0));
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/** The line and the character that a DOM position names. */
function pointOf(element: HTMLElement, node: Node, offset: number): Point | null {
  const rows = [...element.childNodes];
  if (node === element) {
    if (rows.length === 0) return { line: 0, offset: 0 };
    if (offset >= rows.length) {
      return { line: rows.length - 1, offset: rows.at(-1)?.textContent?.length ?? 0 };
    }
    return { line: offset, offset: 0 };
  }
  let row: Node | null = node;
  while (row && row.parentNode !== element) row = row.parentNode;
  if (!row) return null;
  const range = document.createRange();
  range.selectNodeContents(row);
  range.setEnd(node, offset);
  return { line: rows.indexOf(row as ChildNode), offset: range.toString().length };
}

/** Puts the caret at a line and a character. */
function placeCaret(element: HTMLElement, { line, offset }: Point) {
  const row = element.childNodes[line];
  const selection = getSelection();
  if (!row || !selection) return;
  const range = document.createRange();
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
  const texts: Node[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) texts.push(node);
  let left = offset;
  let placed = false;
  // At the end of a mark, the caret goes to the start of the words after it,
  // so typed words are not drawn as part of the mark.
  for (const [index, node] of texts.entries()) {
    const length = node.textContent?.length ?? 0;
    if (left < length || (left === length && index === texts.length - 1)) {
      range.setStart(node, left);
      placed = true;
      break;
    }
    left -= length;
  }
  if (!placed) range.setStart(row, row.childNodes.length && row.textContent ? row.childNodes.length : 0);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * The room at the foot of the note scroll that the reading bar takes. The
 * caret line stays above it, so the bar never covers the line in use.
 */
const CARET_ROOM_PX = 96;

/** The room above the caret line, so the line never sits on the top edge. */
const CARET_TOP_ROOM_PX = 24;

/** The box of the caret, or of its line when the caret has no box. */
function caretRect(element: HTMLElement, line: number): DOMRect | null {
  const selection = getSelection();
  const range =
    selection?.rangeCount && element.contains(selection.anchorNode)
      ? selection.getRangeAt(0)
      : null;
  const caret = typeof range?.getBoundingClientRect === "function" ? range.getBoundingClientRect() : null;
  if (caret && (caret.top !== 0 || caret.bottom !== 0)) return caret;
  const row = element.childNodes[line] as HTMLElement | undefined;
  return row?.getBoundingClientRect() ?? null;
}

/**
 * Scrolls the note until the caret line is clear of the reading bar at the
 * foot and has room above it at the top.
 */
function keepCaretClear(element: HTMLElement, line: number) {
  const scroller = element.closest<HTMLElement>("[data-note-scroll]");
  const caret = caretRect(element, line);
  if (!scroller || !caret) return;
  const view = scroller.getBoundingClientRect();
  // A hidden or tiny scroll has no room to keep.
  if (view.height <= CARET_ROOM_PX) return;
  const over = caret.bottom - (view.bottom - CARET_ROOM_PX);
  if (over > 0) {
    scroller.scrollTop += over;
    return;
  }
  const under = view.top + CARET_TOP_ROOM_PX - caret.top;
  if (under > 0) scroller.scrollTop = Math.max(0, scroller.scrollTop - under);
}
