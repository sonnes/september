// Per-user pull cursor (the last server `seq` we've applied), persisted so a
// reload resumes where it left off.

export interface CursorStore {
  get: () => number;
  set: (value: number) => void;
}

export function createCursorStore(userId: string): CursorStore {
  const key = `september.sync.cursor.${userId}`;
  return {
    get: () => Number(localStorage.getItem(key) ?? '0') || 0,
    set: (value) => localStorage.setItem(key, String(value)),
  };
}
