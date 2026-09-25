import { Fragment, useState, type ReactNode } from "react";

import { Input } from "@september/ui/components/input";
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
 * A list that picks one row of many.
 *
 * A dropdown is not a control for a dwell: it opens on a press, and it closes
 * when the pointer rests somewhere else. This list stays on the screen. Each
 * row is a 44px target in two columns, as `DESIGN.md` asks.
 *
 * The search field appears when the list is long enough to need one. A list
 * with `fixedHeight` scrolls inside a box of one height, so a screen with
 * several lists does not move when one of them grows.
 *
 * The `list` layout draws each row as a card: a radio mark, the name and its
 * detail, and the control of `after` inside the card. Each group gets its own
 * heading, and its cards fill the columns under it. The voice list uses it,
 * because a voice needs its description and its play button beside it.
 */
export function PickList<Row extends PickRow>({
  rows,
  value,
  onPick,
  label,
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
  const found = filter
    ? filter(rows, query)
    : rows.filter((row) => matchesWords(row.name, query));

  return (
    <div className="space-y-2">
      {/* ponytail: a short list is faster to read than to search. */}
      {rows.length > 8 ? (
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={label}
          aria-label={label}
          className="h-11 max-w-md"
        />
      ) : null}

      {found.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing has these words.</p>
      ) : layout === "list" ? (
        <ul
          className={`grid content-start gap-2 ${columns === 2 ? "sm:grid-cols-2" : ""} ${
            fixedHeight ? "h-44 overflow-y-auto pr-1" : ""
          }`}
        >
          {found.map((row, at) => (
            <Fragment key={row.id}>
              {row.group && row.group !== found[at - 1]?.group ? (
                <li
                  data-group
                  className="text-muted-foreground col-span-full pt-3 text-xs font-semibold first:pt-0"
                >
                  {row.group}
                </li>
              ) : null}
              <li
                className={`flex min-w-0 items-center gap-2 rounded-xl border pr-2 ${
                  row.id === value ? "border-primary bg-primary/5" : ""
                }`}
              >
                <button
                  type="button"
                  aria-current={row.id === value || undefined}
                  onClick={() => onPick(row.id)}
                  className="focus-visible:ring-ring hover:bg-accent/60 flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-4 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                >
                  <span
                    aria-hidden
                    className={`size-[18px] shrink-0 rounded-full border ${
                      row.id === value
                        ? "border-primary border-[6px]"
                        : "border-muted-foreground/50"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span data-row-name className="block truncate text-sm font-medium">
                      {row.name}
                    </span>
                    {row.detail ? (
                      <span className="text-muted-foreground block truncate text-xs">
                        {row.detail}
                      </span>
                    ) : null}
                  </span>
                  {row.note ? (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {row.note}
                    </span>
                  ) : null}
                </button>
                {after?.(row)}
              </li>
            </Fragment>
          ))}
        </ul>
      ) : (
        <ul
          className={`grid content-start gap-2 ${columns === 2 ? "sm:grid-cols-2" : ""} ${
            fixedHeight ? "h-44 overflow-y-auto pr-1" : ""
          }`}
        >
          {found.map((row, at) => (
            <Fragment key={row.id}>
              {row.group && row.group !== found[at - 1]?.group ? (
                <li
                  data-group
                  className="text-muted-foreground col-span-full pt-2 text-xs font-semibold"
                >
                  {row.group}
                </li>
              ) : null}
              {/* min-w-0 lets a long name truncate instead of pushing into
                  the next column. */}
              <li className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  aria-current={row.id === value || undefined}
                  onClick={() => onPick(row.id)}
                  className={`focus-visible:ring-ring flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border px-4 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                    row.id === value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent"
                  }`}
                >
                  <span data-row-name className="min-w-0 flex-1 truncate">
                    {row.name}
                  </span>
                  {row.note ? (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {row.note}
                    </span>
                  ) : null}
                </button>
                {after?.(row)}
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
