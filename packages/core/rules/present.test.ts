import { describe, expect, it } from "vitest";

import {
  STAGE_PADDING_RATIO,
  activeCaptionIndex,
  alignmentToWords,
  captionProgress,
  CHUNK_CHARACTER_LIMIT,
  chunkFontRatio,
  DEFAULT_TONE,
  exportFileName,
  exportReason,
  presentChunks,
  presentSettings,
  stepChunk,
  wordsToCaptions,
} from "./present.ts";

describe("the chunks of a note", () => {
  it("has nothing to present without words", () => {
    expect(presentChunks("")).toEqual([]);
    expect(presentChunks("   \n\n  ")).toEqual([]);
  });

  it("says the words, not the markup", () => {
    const [heading, line] = presentChunks(
      "# Monday\n\n- Ask about the **ramp**",
    );

    expect(heading.text).toBe("Monday");
    expect(line.text).toBe("Ask about the ramp");
  });

  it("gives one chunk to each sentence", () => {
    const chunks = presentChunks(
      "We met in June. She still laughs at my jokes.",
    );

    expect(chunks.map((chunk) => chunk.text)).toEqual([
      "We met in June.",
      "She still laughs at my jokes.",
    ]);
  });

  it("splits a long sentence at its clauses", () => {
    const long =
      "I have known Maya for thirty years, since the summer we shared a house by the river, " +
      "and she still laughs at my jokes, even the ones I have told a hundred times before.";
    const chunks = presentChunks(long);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(CHUNK_CHARACTER_LIMIT);
    }
    expect(chunks.map((chunk) => chunk.text).join(" ")).toBe(long);
  });

  it("splits a long sentence with no clauses at a word", () => {
    const long = `${"word ".repeat(40)}end`;
    const chunks = presentChunks(long);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(CHUNK_CHARACTER_LIMIT);
    }
  });
});

describe("moving through a presentation", () => {
  it("stops at the first and the last chunk", () => {
    expect(stepChunk(0, 4, -1)).toBe(0);
    expect(stepChunk(0, 4, 1)).toBe(1);
    expect(stepChunk(3, 4, 1)).toBe(3);
    expect(stepChunk(2, 4, -1)).toBe(1);
    expect(stepChunk(0, 0, 1)).toBe(0);
  });
});

describe("the timing a video needs", () => {
  const alignment = {
    characters: [
      "W",
      "e",
      " ",
      "m",
      "e",
      "t",
      ".",
      " ",
      "[",
      "l",
      "]",
      "S",
      "h",
      "e",
    ],
    start_times: [
      0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3,
    ],
    end_times: [
      0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4,
    ],
  };

  it("reads words from the character alignment, and drops the audio tags", () => {
    expect(alignmentToWords(alignment)).toEqual([
      { text: "We", startTime: 0, endTime: 0.2 },
      { text: "met.", startTime: 0.3, endTime: 0.7 },
      { text: "She", startTime: 1.1, endTime: 1.4 },
    ]);
  });

  it("gathers the words into captions of six", () => {
    const words = "one two three four five six seven eight"
      .split(" ")
      .map((text, index) => ({
        text,
        startTime: index * 0.2,
        endTime: index * 0.2 + 0.2,
      }));

    expect(
      wordsToCaptions(words).map((caption) => caption.words.length),
    ).toEqual([6, 2]);
  });

  it("closes a caption at the end of a sentence", () => {
    const words = ["Hello.", "Then", "more"].map((text, index) => ({
      text,
      startTime: index * 0.2,
      endTime: index * 0.2 + 0.2,
    }));

    expect(
      wordsToCaptions(words).map((caption) => caption.words.length),
    ).toEqual([1, 2]);
  });

  it("holds the caption that has started", () => {
    const captions = wordsToCaptions([
      { text: "Hello.", startTime: 0, endTime: 1 },
      { text: "Then.", startTime: 1, endTime: 2 },
    ]);

    expect(activeCaptionIndex(captions, -1)).toBe(0);
    expect(activeCaptionIndex(captions, 1.5)).toBe(1);
    expect(activeCaptionIndex(captions, 9)).toBe(1);
    expect(activeCaptionIndex([], 1)).toBe(-1);
    expect(captionProgress(captions[0], 0.5)).toBe(0.5);
    expect(captionProgress(captions[0], 9)).toBe(1);
  });
});

describe("what a note exports to", () => {
  it("names the file after the note", () => {
    expect(exportFileName("Letter to Dr Shah", "text")).toBe(
      "letter-to-dr-shah.md",
    );
    expect(exportFileName(undefined, "video")).toBe("note.mp4");
  });

  it("writes the words with no voice at all", () => {
    expect(
      exportReason("text", { provider: "system", voiceId: null, video: false }),
    ).toBe(null);
  });

  it("enables exports only when their service requirements are met", () => {
    const system = {
      provider: "system" as const,
      voiceId: "alex",
      video: true,
    };

    expect(exportReason("audio", system)).not.toBe(null);
    expect(exportReason("video", system)).not.toBe(null);

    const cloud = {
      provider: "elevenlabs" as const,
      voiceId: null,
      video: true,
    };
    expect(exportReason("audio", cloud)).not.toBe(null);

    const ready = {
      provider: "elevenlabs" as const,
      voiceId: "v1",
      video: true,
    };
    expect(exportReason("audio", ready)).toBe(null);
    expect(exportReason("video", ready)).toBe(null);
    expect(exportReason("video", { ...ready, video: false })).not.toBe(null);
  });
});

describe("what the app remembers about presenting", () => {
  it("starts on the default tone, speaking", () => {
    expect(presentSettings(null)).toEqual({ tone: DEFAULT_TONE, spoken: true });
    expect(presentSettings({ tone: "sage", spoken: false })).toEqual({
      tone: "sage",
      spoken: false,
    });
  });
});

describe("the size of a chunk on the stage", () => {
  // A bold capital is about 0.62 of the font size wide, wider than the
  // average glyph.
  const widest = (text: string) => Math.max(...text.split(/\s+/).map((word) => word.length)) * 0.62;
  const usable = 1 - STAGE_PADDING_RATIO * 2;

  it("keeps the longest word of a heading on one line of the stage", () => {
    for (const aspect of [1.4, 1.43, 0.75, 1.78]) {
      const ratio = chunkFontRatio("Questions for the doctor", "display", aspect);
      expect(ratio * widest("Questions for the doctor")).toBeLessThanOrEqual(usable);
    }
  });

  // The lines that the words take when they wrap at word ends, with each
  // glyph about 0.52 of the font size wide.
  const lines = (text: string, ratio: number) => {
    const room = usable / (ratio * 0.52);
    let count = 1;
    let used = 0;
    for (const word of text.split(/\s+/)) {
      const need = used === 0 ? word.length : used + 1 + word.length;
      if (need > room && used > 0) {
        count += 1;
        used = word.length;
      } else {
        used = need;
      }
    }
    return count;
  };

  it("keeps the wrapped lines of a heading inside the height of the stage", () => {
    const text = "Questions for the doctor";
    for (const aspect of [0.525, 0.62, 1.4, 1.78]) {
      const ratio = chunkFontRatio(text, "display", aspect);
      expect(lines(text, ratio) * 1.08 * ratio).toBeLessThanOrEqual(0.62 * aspect);
    }
  });

  it("keeps the longest word of a sentence on one line of the stage", () => {
    const text = "Remember the physiotherapy appointment";
    const ratio = chunkFontRatio(text, "support", 1.4);
    expect(ratio * widest(text)).toBeLessThanOrEqual(usable);
  });
});
