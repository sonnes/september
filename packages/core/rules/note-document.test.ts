import { describe, expect, it } from "vitest";

import {
  inlineParts,
  lineKind,
  nextLead,
  notePreview,
  replaceRange,
  sentenceBefore,
  styleOf,
  toggleLineStyle,
  wordStartBefore,
  wrapInline,
} from "./note-document.ts";
import { markdownToVoiceText } from "./notes.ts";

describe("lineKind", () => {
  it("names each Markdown line by its prefix", () => {
    expect(lineKind("# Holiday")).toBe("h1");
    expect(lineKind("## Before lunch")).toBe("h2");
    expect(lineKind("- Do abacus")).toBe("li");
    expect(lineKind("* Do abacus")).toBe("li");
    expect(lineKind("2. Read")).toBe("ol");
    expect(lineKind("- [ ] Read")).toBe("task");
    expect(lineKind("- [x] Read")).toBe("done");
    expect(lineKind("> Before dinner")).toBe("quote");
    expect(lineKind("---")).toBe("hr");
    expect(lineKind("Rest of the time")).toBe("p");
    expect(lineKind("#hashtag")).toBe("p");
  });
});

describe("styleOf", () => {
  it("gives the style button that a line kind belongs to", () => {
    expect(styleOf("done")).toBe("task");
    expect(styleOf("h2")).toBe("h2");
    expect(styleOf("p")).toBeNull();
    expect(styleOf("hr")).toBeNull();
  });
});

describe("toggleLineStyle", () => {
  it("adds a prefix and keeps the caret on the same word", () => {
    expect(toggleLineStyle("Before lunch", "h2", 6)).toEqual({
      text: "## Before lunch",
      caret: 9,
    });
  });

  it("swaps one prefix for another", () => {
    expect(toggleLineStyle("- Read", "task", 6)).toEqual({
      text: "- [ ] Read",
      caret: 10,
    });
  });

  it("removes the prefix on a second tap", () => {
    expect(toggleLineStyle("> Before dinner", "quote", 8)).toEqual({
      text: "Before dinner",
      caret: 6,
    });
    expect(toggleLineStyle("- [x] Read", "task", 10)).toEqual({
      text: "Read",
      caret: 4,
    });
  });

  it("keeps a caret inside the old prefix at the start of the words", () => {
    expect(toggleLineStyle("## Title", "h1", 1)).toEqual({
      text: "# Title",
      caret: 2,
    });
  });
});

describe("wrapInline", () => {
  it("wraps the selected words and puts the caret after the mark", () => {
    expect(wrapInline("You can have 1 hour of TV", 13, 19, "**")).toEqual({
      text: "You can have **1 hour** of TV",
      caret: 23,
    });
  });

  it("leaves the trailing space of a selection outside the marks", () => {
    expect(wrapInline("Rest of", 0, 5, "*")).toEqual({
      text: "*Rest* of",
      caret: 6,
    });
  });

  it("wraps the word at the caret when nothing is selected", () => {
    expect(wrapInline("Rest of the time", 9, 9, "**")).toEqual({
      text: "Rest of **the** time",
      caret: 15,
    });
    expect(wrapInline("Rest of", 4, 4, "**")).toEqual({
      text: "**Rest** of",
      caret: 8,
    });
  });

  it("opens an empty pair between two spaces", () => {
    expect(wrapInline("Rest  of", 5, 5, "**")).toEqual({
      text: "Rest **** of",
      caret: 7,
    });
  });

  it("does not wrap the list prefix", () => {
    expect(wrapInline("- Read", 1, 1, "**")).toEqual({
      text: "- **Read**",
      caret: 10,
    });
  });
});

describe("sentenceBefore", () => {
  it("reads from the start of the words of the line", () => {
    expect(sentenceBefore("- Do 1 page", 11)).toEqual({ start: 2, text: "Do 1 page" });
  });

  it("starts after the last finished sentence", () => {
    expect(sentenceBefore("It is late. Then you", 20)).toEqual({
      start: 12,
      text: "Then you",
    });
  });

  it("reads only up to the caret", () => {
    expect(sentenceBefore("Then you can go", 8)).toEqual({ start: 0, text: "Then you" });
  });

  it("is empty right after a finished sentence", () => {
    expect(sentenceBefore("It is late. ", 12)).toEqual({ start: 12, text: "" });
  });
});

describe("replaceRange", () => {
  const lines = ["# Holiday", "Rest of the", "Last"];

  it("replaces text inside one line and puts the caret after it", () => {
    expect(
      replaceRange(lines, { line: 1, offset: 8 }, { line: 1, offset: 11 }, "time "),
    ).toEqual({
      lines: ["# Holiday", "Rest of time ", "Last"],
      caret: { line: 1, offset: 13 },
    });
  });

  it("joins the lines that a range crosses", () => {
    expect(
      replaceRange(lines, { line: 1, offset: 4 }, { line: 2, offset: 0 }, ""),
    ).toEqual({
      lines: ["# Holiday", "RestLast"],
      caret: { line: 1, offset: 4 },
    });
  });

  it("splits pasted text with line breaks into lines", () => {
    expect(
      replaceRange(lines, { line: 2, offset: 4 }, { line: 2, offset: 4 }, "\n- one\n- two"),
    ).toEqual({
      lines: ["# Holiday", "Rest of the", "Last", "- one", "- two"],
      caret: { line: 4, offset: 5 },
    });
  });
});

describe("wordStartBefore", () => {
  it("finds the start of the word before the caret, with its space", () => {
    expect(wordStartBefore("Then you ", 9)).toBe(5);
    expect(wordStartBefore("Then you", 8)).toBe(5);
  });

  it("stops at the prefix of the line", () => {
    expect(wordStartBefore("- Do", 4)).toBe(2);
    expect(wordStartBefore("- ", 2)).toBe(2);
  });
});

describe("nextLead", () => {
  it("continues a list on the next line", () => {
    expect(nextLead("- Read")).toBe("- ");
    expect(nextLead("3. Read")).toBe("4. ");
    expect(nextLead("- [x] Read")).toBe("- [ ] ");
    expect(nextLead("> Before dinner")).toBe("> ");
  });

  it("starts a plain line after a heading or a paragraph", () => {
    expect(nextLead("## Before lunch")).toBe("");
    expect(nextLead("Rest of the time")).toBe("");
  });
});

describe("inlineParts", () => {
  it("marks the prefix, the bold words, and the italic words", () => {
    expect(inlineParts("- Do **1 page** of *abacus*")).toEqual([
      { text: "- ", role: "lead" },
      { text: "Do ", role: "text" },
      { text: "**", role: "mark" },
      { text: "1 page", role: "bold" },
      { text: "**", role: "mark" },
      { text: " of ", role: "text" },
      { text: "*", role: "mark" },
      { text: "abacus", role: "italic" },
      { text: "*", role: "mark" },
    ]);
  });

  it("keeps every character of the line", () => {
    const line = "## A **b c** d *e* ** f";
    expect(inlineParts(line).map((part) => part.text).join("")).toBe(line);
  });
});

describe("markdownToVoiceText", () => {
  it("does not say the box of a task line", () => {
    expect(markdownToVoiceText("- [ ] Read\n- [x] Write")).toBe("Read Write");
  });
});

describe("notePreview", () => {
  it("gives the first line of words, without its marks", () => {
    expect(notePreview("# Day\n\n- Read **this** part", "Plans")).toBe("Day");
  });

  it("skips a line that only repeats the name", () => {
    expect(notePreview("Holiday\nI want you to bring a paper.", "Holiday")).toBe(
      "I want you to bring a paper.",
    );
  });

  it("is empty for a note with no words", () => {
    expect(notePreview("\n\n", "w")).toBe("");
  });
});
