import { describe, expect, it } from "vitest";

import { escapeStep, moodForKey } from "./panel.ts";

describe("escapeStep", () => {
  it("stops the voice first", () => {
    expect(escapeStep({ speaking: true, sheetOpen: true, draft: "hi" })).toBe(
      "stop",
    );
  });

  it("closes an open sheet or menu when the voice is quiet", () => {
    expect(escapeStep({ speaking: false, sheetOpen: true, draft: "" })).toBe(
      "close",
    );
  });

  it("hides the panel with an empty draft", () => {
    expect(escapeStep({ speaking: false, sheetOpen: false, draft: "" })).toBe(
      "hide",
    );
    expect(escapeStep({ speaking: false, sheetOpen: false, draft: "  " })).toBe(
      "hide",
    );
  });

  it("does nothing while the draft holds words", () => {
    expect(
      escapeStep({ speaking: false, sheetOpen: false, draft: "hello" }),
    ).toBe("none");
  });
});

describe("moodForKey", () => {
  it("gives the five moods for 1 to 5, in order", () => {
    expect(["1", "2", "3", "4", "5"].map(moodForKey)).toEqual([
      "warm",
      "playful",
      "low",
      "frustrated",
      "angry",
    ]);
  });

  it("clears the mood for 0", () => {
    expect(moodForKey("0")).toBeNull();
  });

  it("ignores other keys", () => {
    expect(moodForKey("6")).toBeUndefined();
    expect(moodForKey("a")).toBeUndefined();
  });
});
