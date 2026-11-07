import { describe, expect, it } from "vitest";

import { appendToNote, noteContentUpdates, noteFromSlug, noteSlug, UNTITLED_NOTE } from "./notes.ts";

describe("noteContentUpdates", () => {
  it("names a note from its first six words on the first save", () => {
    expect(
      noteContentUpdates(undefined, "# Monday\n\nCall the **nurse** about the new pills today."),
    ).toEqual({
      content: "# Monday\n\nCall the **nurse** about the new pills today.",
      name: "Monday Call the nurse about the",
    });
  });

  it("names a note that still has the placeholder name", () => {
    expect(noteContentUpdates(UNTITLED_NOTE, "Shopping list")).toMatchObject({
      name: "Shopping list",
    });
  });

  it("keeps the name the user gave", () => {
    expect(noteContentUpdates("Visit", "Please bring Miso.")).toEqual({
      content: "Please bring Miso.",
    });
  });

  it("gives no name to a note with no words", () => {
    expect(noteContentUpdates(undefined, "  ")).toEqual({ content: "  " });
  });

  it("shortens a long name", () => {
    const word = "a".repeat(30);
    const name = noteContentUpdates(undefined, `${word} ${word} ${word}`).name!;

    expect(name.length).toBeLessThanOrEqual(64);
    expect(name.endsWith("...")).toBe(true);
  });
});

describe("appendToNote", () => {
  it("puts the words under the note as their own paragraph", () => {
    expect(appendToNote("First line.\n", " Second line. ")).toBe("First line.\n\nSecond line.");
  });

  it("starts an empty note with the words, and keeps a note for blank words", () => {
    expect(appendToNote("", "Hello")).toBe("Hello");
    expect(appendToNote("Hello", "  ")).toBe("Hello");
  });
});

describe("note slugs", () => {
  it("finds a note by the slug of its name", () => {
    const notes = [{ name: "Shopping List!" }, { name: null }];

    expect(noteSlug("Shopping List!")).toBe("shopping-list");
    expect(noteFromSlug("shopping-list", notes)).toBe(notes[0]);
    expect(noteFromSlug("note", notes)).toBe(notes[1]);
    expect(noteFromSlug("missing", notes)).toBeUndefined();
  });
});
