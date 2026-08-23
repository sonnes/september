import { useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { matchesWords } from "@/rules/pick";

/** One row of a list. `note` marks the row, for example `Paid`. */
export interface PickRow {
  id: string;
  name: string;
  note?: string;
}

/**
 * A list that picks one row of many.
 *
 * A dropdown is not a control for a dwell: it opens on a press, and it closes
 * when the pointer rests somewhere else. This list stays on the screen. Each
 * row is a 44px target in two columns, as `DESIGN.md` asks.
 *
 * The search field appears when the list is long enough to need one.
 */
export function PickList<Row extends PickRow>({
  rows,
  value,
  onPick,
  label,
  columns = 2,
  filter,
  after,
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
      ) : (
        <ul className={`grid gap-2 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
          {found.map((row) => (
            <li key={row.id} className="flex items-center gap-2">
              <button
                type="button"
                aria-current={row.id === value || undefined}
                onClick={() => onPick(row.id)}
                className={`focus-visible:ring-ring flex min-h-11 flex-1 items-center gap-2 rounded-xl border px-4 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                  row.id === value
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                {row.note ? (
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {row.note}
                  </span>
                ) : null}
              </button>
              {after?.(row)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
