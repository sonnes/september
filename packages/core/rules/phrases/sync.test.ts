import { describe, expect, it } from "vitest";

import { decidePhraseSync, sanitizeStarters } from "./sync.ts";

describe("decidePhraseSync", () => {
  it("seeds a space once it holds a message or a note", () => {
    expect(decidePhraseSync({ syncedCount: undefined, messageCount: 0 })).toBe("none");
    expect(decidePhraseSync({ syncedCount: undefined, messageCount: 1 })).toBe("seed");
    expect(
      decidePhraseSync({ syncedCount: undefined, messageCount: 0, hasContext: true }),
    ).toBe("seed");
  });

  it("writes the phrases again after six new messages", () => {
    expect(decidePhraseSync({ syncedCount: 3, messageCount: 8 })).toBe("none");
    expect(decidePhraseSync({ syncedCount: 3, messageCount: 9 })).toBe("regen");
  });
});

describe("sanitizeStarters", () => {
  it("trims the starters and keeps those of two to six words", () => {
    expect(
      sanitizeStarters([
        "  I need ",
        "",
        "Hello",
        "Can you help me with",
        "one two three four five six seven",
      ]),
    ).toEqual(["I need", "Can you help me with"]);
  });
});
