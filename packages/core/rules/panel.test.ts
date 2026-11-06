import { describe, expect, it } from "vitest";

import { MOODS } from "./moods.ts";
import { escapeStep, moodForKey, moodKeyLabel, panelStateFrom, pressTab, tierFor } from "./panel.ts";

describe("panelStateFrom", () => {
  it("starts closed on the phrases when nothing is saved", () => {
    expect(panelStateFrom(null)).toEqual({ open: false, tab: "phrases" });
    expect(panelStateFrom(undefined)).toEqual({ open: false, tab: "phrases" });
  });

  it("brings back the tab the user left, open or closed", () => {
    expect(panelStateFrom({ open: true, tab: "voice" })).toEqual({ open: true, tab: "voice" });
    expect(panelStateFrom({ open: false, tab: "voice" })).toEqual({ open: false, tab: "voice" });
  });
});

describe("pressTab", () => {
  it("opens a closed card on the pressed tab", () => {
    expect(pressTab({ open: false, tab: "voice" }, "phrases")).toEqual({ open: true, tab: "phrases" });
  });

  it("moves an open card to another tab", () => {
    expect(pressTab({ open: true, tab: "phrases" }, "voice")).toEqual({ open: true, tab: "voice" });
  });

  it("closes the card when the open tab is pressed, and keeps the tab", () => {
    expect(pressTab({ open: true, tab: "voice" }, "voice")).toEqual({ open: false, tab: "voice" });
  });
});

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

describe("moodKeyLabel", () => {
  it("shows the Control key and the digit that moodForKey reads", () => {
    for (const mood of [...MOODS.map((one) => one.key), null]) {
      const label = moodKeyLabel(mood);
      expect(label.startsWith("⌃")).toBe(true);
      expect(moodForKey(label.slice(1))).toBe(mood);
    }
  });
});

describe("tierFor", () => {
  it("gives the tier of a panel width", () => {
    expect([tierFor(400), tierFor(700), tierFor(1000)]).toEqual(["compact", "regular", "wide"]);
  });
});
