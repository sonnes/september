import { describe, expect, it } from "vitest";

import { ariaShortcut, KEYMAP, keyLabel, presses } from "./keymap.ts";

const key = (key: string, mods: Partial<Record<"metaKey" | "ctrlKey" | "altKey" | "shiftKey", boolean>> = {}) => ({
  key,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});

describe("presses", () => {
  it("matches Command and the key, and nothing with another modifier", () => {
    expect(presses(key("k", { metaKey: true }), KEYMAP.spaces)).toBe(true);
    expect(presses(key("K", { metaKey: true, shiftKey: true }), KEYMAP.spaces)).toBe(false);
    expect(presses(key("k", { ctrlKey: true }), KEYMAP.spaces)).toBe(false);
    expect(presses(key("k"), KEYMAP.spaces)).toBe(false);
  });

  it("takes Shift for a Shift binding", () => {
    expect(presses(key("V", { metaKey: true, shiftKey: true }), KEYMAP.voice)).toBe(true);
    expect(presses(key("v", { metaKey: true }), KEYMAP.voice)).toBe(false);
  });

  it("opens Help with the question mark, with or without Shift", () => {
    expect(presses(key("?", { metaKey: true, shiftKey: true }), KEYMAP.help)).toBe(true);
    expect(presses(key("?", { metaKey: true }), KEYMAP.help)).toBe(true);
  });

  it("clears the composer with Command and Backspace, with or without Shift", () => {
    expect(presses(key("Backspace", { metaKey: true }), KEYMAP.clear)).toBe(true);
    expect(presses(key("Backspace", { metaKey: true, shiftKey: true }), KEYMAP.clear)).toBe(true);
    expect(presses(key("Backspace", { metaKey: true, altKey: true }), KEYMAP.clear)).toBe(false);
  });

  it("takes Control for the writing tools as well as Command", () => {
    expect(presses(key("j", { ctrlKey: true }), KEYMAP.tools)).toBe(true);
    expect(presses(key("j", { metaKey: true }), KEYMAP.tools)).toBe(true);
  });
});

describe("the names of a binding", () => {
  it("gives the label and the aria-keyshortcuts value from one binding", () => {
    expect([keyLabel(KEYMAP.voice), ariaShortcut(KEYMAP.voice)]).toEqual(["⌘⇧V", "Meta+Shift+V"]);
    expect([keyLabel(KEYMAP.clear), ariaShortcut(KEYMAP.clear)]).toEqual(["⌘⌫", "Meta+Backspace"]);
    expect(ariaShortcut(KEYMAP.tools)).toBe("Meta+J Control+J");
  });
});
