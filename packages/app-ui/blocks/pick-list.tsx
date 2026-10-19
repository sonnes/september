import { Fragment, useId, useState, type KeyboardEvent, type ReactNode } from "react";

import { Check } from "lucide-react";

import { cn } from "@september/ui";
import { Input } from "@september/ui/components/input";
import { Label } from "@september/ui/components/label";
import { matchesWords } from "@september/core/rules/pick";

/**
 * One row of a list. `note` marks the row, for example `Paid`. `detail` is a
 * second line under the name. A row with a `group` starts a heading when its
 * group differs from the row before it.
 */
export interface PickRow {
  id: string;
  name: string;
  note?: string;
  detail?: string;
  group?: string;
}

/**
 * Moves the choice with the arrow keys, as a screen reader user expects of a
 * radio group. The next choice takes the focus and is chosen.
 */
function moveChoice(event: KeyboardEvent<HTMLButtonElement>) {
  const step =
    event.key === "ArrowRight" || event.key === "ArrowDown"
      ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? -1
        : 0;
  if (!step) return;
  const group = event.currentTarget.closest('[role="radiogroup"]');
  const keys = [...(group?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])].filter(
    (key) => key.getAttribute("aria-disabled") !== "true",
  );
  const at = keys.indexOf(event.currentTarget);
  if (at < 0 || keys.length < 2) return;
  event.preventDefault();
  const next = keys[(at + step + keys.length) % keys.length]!;
  next.focus();
  next.click();
}

/**
 * One choice of a radio group, drawn as a key of 48px or more.
 *
 * The chosen key shows a check, so the state is not color alone. Only the
 * chosen key, or the first key when none is chosen, takes a Tab stop. The
 * arrow keys move between the choices.
 */
export function ChoiceKey({
  checked,
  tabbable,
  onChoose,
  value,
  disabled = false,
  className,
  children,
}: {
  checked: boolean;
  /** The key that takes the Tab stop of the group. */
  tabbable: boolean;
  onChoose: () => void;
  value?: string;
  /** The choice is not ready. It stays in place and says so. */
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      value={value}
      tabIndex={tabbable ? 0 : -1}
      onClick={() => !disabled && onChoose()}
      onKeyDown={moveChoice}
      className={cn(
        "focus-attention key-disabled bg-background text-foreground hover:bg-accent flex min-h-[var(--reach-target)] min-w-0 items-center gap-3 rounded-xl border px-4 py-2 text-left transition-colors",
        checked && "border-brand bg-primary/5",
        disabled && "cursor-default",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border-2",
          checked ? "border-brand bg-primary text-primary-foreground" : "border-input",
        )}
      >
        {checked ? <Check className="size-4" strokeWidth={3} /> : null}
      </span>
      {children}
    </button>
  );
}

/**
 * A list that picks one row of many.
 *
 * A dropdown is not a control for a dwell: it opens on a press, and it closes
 * when the pointer rests somewhere else. This list stays on the screen. It is
 * a radio group, and each row is a `ChoiceKey` of 48px or more.
 *
 * The search field appears when the list is long enough to need one. A list
 * with `fixedHeight` scrolls inside a box of one height, so a screen with
 * several lists does not move when one of them grows.
 *
 * The `list` layout draws each row as a card: the name and its detail, and
 * the control of `after` beside the key. Each group gets its own heading, and
 * its cards fill the columns under it. The voice list uses it, because a
 * voice needs its description and its play button beside it.
 */
export function PickList<Row extends PickRow>({
  rows,
  value,
  onPick,
  label,
  name,
  columns = 2,
  filter,
  after,
  fixedHeight = false,
  layout = "grid",
}: {
  rows: Row[];
  /** The id of the row in use. */
  value: string;
  onPick: (id: string) => void;
  /** What the search field says, for example `Search models`. */
  label: string;
  /** The name of the radio group, for example `Voices`. */
  name: string;
  /** How many rows fit across. The narrow card of the rail asks for one. */
  columns?: 1 | 2;
  /** The rows the words show. The words find a name by default. */
  filter?: (rows: Row[], query: string) => Row[];
  /** A control at the right of one row, for example a play button. */
  after?: (row: Row) => ReactNode;
  /** Scroll the rows inside a box of one height. */
  fixedHeight?: boolean;
  /** Tiles in a grid, or one bordered column of rows. */
  layout?: "grid" | "list";
}) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const found = filter
    ? filter(rows, query)
    : rows.filter((row) => matchesWords(row.name, query));

  return (
    <div className="space-y-2">
      {/* ponytail: a short list is faster to read than to search. */}
      {rows.length > 8 ? (
        <div className="flex max-w-md flex-col gap-1.5">
          <Label htmlFor={searchId}>{label}</Label>
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      ) : null}

      {found.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing has these words.</p>
      ) : layout === "list" ? (
        <ul
          role="radiogroup"
          aria-label={name}
          className={`grid content-start gap-2 ${columns === 2 ? "sm:grid-cols-2" : ""} ${
            fixedHeight ? "h-[calc(var(--reach-target)*4)] overflow-y-auto pr-1" : ""
          }`}
        >
          {found.map((row, at) => (
            <Fragment key={row.id}>
              {row.group && row.group !== found[at - 1]?.group ? (
                <li
                  role="none"
                  data-group
                  className="text-muted-foreground col-span-full pt-3 text-sm font-semibold first:pt-0"
                >
                  {row.group}
                </li>
              ) : null}
              <li role="none" className="flex min-w-0 items-center gap-2">
                <ChoiceKey
                  checked={row.id === value}
                  tabbable={tabbable(found, value, row)}
                  onChoose={() => onPick(row.id)}
                  className="flex-1"
                >
                  <span className="min-w-0 flex-1">
                    <span data-row-name className="block truncate text-base font-medium">
                      {row.name}
                    </span>
                    {row.detail ? (
                      <span className="text-muted-foreground block truncate text-sm">
                        {row.detail}
                      </span>
                    ) : null}
                  </span>
                  {row.note ? (
                    <span className="text-muted-foreground shrink-0 text-sm">
                      {row.note}
                    </span>
                  ) : null}
                </ChoiceKey>
                {after?.(row)}
              </li>
            </Fragment>
          ))}
        </ul>
      ) : (
        <ul
          role="radiogroup"
          aria-label={name}
          className={`grid content-start gap-2 ${columns === 2 ? "sm:grid-cols-2" : ""} ${
            fixedHeight ? "h-[calc(var(--reach-target)*4)] overflow-y-auto pr-1" : ""
          }`}
        >
          {found.map((row, at) => (
            <Fragment key={row.id}>
              {row.group && row.group !== found[at - 1]?.group ? (
                <li
                  role="none"
                  data-group
                  className="text-muted-foreground col-span-full pt-2 text-sm font-semibold"
                >
                  {row.group}
                </li>
              ) : null}
              {/* min-w-0 lets a long name truncate instead of pushing into
                  the next column. */}
              <li role="none" className="flex min-w-0 items-center gap-2">
                <ChoiceKey
                  checked={row.id === value}
                  tabbable={tabbable(found, value, row)}
                  onChoose={() => onPick(row.id)}
                  className="flex-1 text-base font-medium"
                >
                  <span data-row-name className="min-w-0 flex-1 truncate">
                    {row.name}
                  </span>
                  {row.note ? (
                    <span className="text-muted-foreground shrink-0 text-sm">
                      {row.note}
                    </span>
                  ) : null}
                </ChoiceKey>
                {after?.(row)}
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The chosen row takes the Tab stop, or the first row when none is chosen. */
function tabbable(rows: PickRow[], value: string, row: PickRow): boolean {
  return rows.some((one) => one.id === value) ? row.id === value : row === rows[0];
}
