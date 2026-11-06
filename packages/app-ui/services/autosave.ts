import { useEffect, useRef, useState } from "react";

import { platform } from "@platform/adapter";

export type SaveState = "saved" | "saving" | "failed";

export interface Autosave<T> {
  value: T;
  state: SaveState;
  /** Shows the value at once and starts a write. */
  write: (next: T) => void;
  /** Writes the last value again after a failed write. */
  retry: () => void;
  /** The value of the last write, for a callback that runs after a render. */
  current: () => T;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * A value that saves on each edit, so a person who types slowly never loses
 * words to a save they forgot to press.
 *
 * Writes run one at a time, in order, and only the newest sets the state. `save` can return the value that the
 * store keeps, for example a note title that the store fills in. A new value
 * of `stored` replaces the field only when no write waits, so another writer,
 * such as the agent, does not lose to an older field. The close warning stays
 * on while a write waits or failed.
 */
export function useAutosave<T>(
  stored: T,
  save: (value: T) => Promise<T | void>,
): Autosave<T> {
  const [value, setValue] = useState(stored);
  const [state, setState] = useState<SaveState>("saved");
  const held = useRef(stored);
  const revision = useRef(0);
  const received = useRef(stored);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  if (state === "saved" && !same(received.current, stored) && !same(held.current, stored)) {
    held.current = stored;
    setValue(stored);
  }
  received.current = stored;

  const start = (next: T) => {
    const version = ++revision.current;
    setState("saving");
    const done = queue.current.then(() => save(next));
    queue.current = done.catch(() => undefined);
    done.then(
      (kept) => {
        if (version !== revision.current) return;
        if (kept !== undefined && !same(kept, held.current)) {
          held.current = kept;
          setValue(kept);
        }
        setState("saved");
      },
      () => {
        if (version === revision.current) setState("failed");
      },
    );
  };

  useEffect(() => {
    if (state === "saved") return;
    return platform.device.guardUnsavedChanges();
  }, [state]);

  return {
    value,
    state,
    write: (next) => {
      held.current = next;
      setValue(next);
      start(next);
    },
    retry: () => start(held.current),
    current: () => held.current,
  };
}
