import { describe, expect, it } from "vitest";

import {
  activeCaptionIndex,
  alignmentToWords,
  captionProgress,
  captionRoles,
  CHUNK_CHARACTER_LIMIT,
  chunkFontRatio,
  chunkProgress,
  DEFAULT_TONE,
  EXPORT_ARTIFACTS,
  exportFileName,
  exportReason,
  PRESENT_TONES,
  presentChunks,
  presentSettings,
  presentTone,
  roleSpec,
  stepChunk,
  wordsToCaptions,
} from "./present.ts";

describe("the tones of a presentation", () => {
  it("offers seven tones in two families, indigo first", () => {
    expect(PRESENT_TONES.map((tone) => tone.key)).toEqual([
      "indigo",
      "ink",
      "paper",
      "cream",
      "sage",
      "blush",
      "sky",
    ]);
    expect(DEFAULT_TONE).toBe("indigo");
    expect(PRESENT_TONES.filter((tone) => tone.family === "keycap")).toHaveLength(3);
    expect(PRESENT_TONES.filter((tone) => tone.family === "reading")).toHaveLength(4);
  });

  it("gives every tone a background, two text tones, and an accent", () => {
    for (const tone of PRESENT_TONES) {
      for (const colour of [tone.background, tone.display, tone.support, tone.accent]) {
        expect(colour).toMatch(/^#[0-9a-f]{6}$/);
      }
      expect(tone.name.length).toBeGreaterThan(0);
    }
  });

  it("signs the keycap tones with the mark and the paper tints with the wordmark", () => {
    expect(presentTone("indigo").mark).toBe("keycap");
    expect(presentTone("cream").mark).toBe("wordmark");
    // A tone that no longer exists must not leave the screen without colours.
    expect(presentTone("stone" as never).key).toBe(DEFAULT_TONE);
  });

  it("sets the display role in the serif only for the paper tints", () => {
    expect(roleSpec("display", "keycap").fontFamily).toMatch(/Noto Sans/);
    expect(roleSpec("display", "reading").fontFamily).toMatch(/Fraunces/);
    expect(roleSpec("support", "reading").fontFamily).toMatch(/Noto Sans/);
    expect(roleSpec("display", "keycap").maxFontRatio).toBeGreaterThan(
      roleSpec("support", "keycap").maxFontRatio,
    );
  });
});

describe("the chunks of a note", () => {
  it("has nothing to present without words", () => {
    expect(presentChunks("")).toEqual([]);
    expect(presentChunks("   \n\n  ")).toEqual([]);
  });

  it("says the words, not the markup", () => {
    const [heading, line] = presentChunks("# Monday\n\n- Ask about the **ramp**");

    expect(heading.text).toBe("Monday");
    expect(line.text).toBe("Ask about the ramp");
  });

  it("gives one chunk to each sentence", () => {
    const chunks = presentChunks("We met in June. She still laughs at my jokes.");

    expect(chunks.map((chunk) => chunk.text)).toEqual([
      "We met in June.",
      "She still laughs at my jokes.",
    ]);
  });

  it("shows a heading and the first words of a section large", () => {
    const chunks = presentChunks(
      "# Maya\n\nWe met in June. She still laughs.\n\n---\n\nThe second part. And more of it.",
    );

    expect(chunks.map((chunk) => `${chunk.section}:${chunk.role}`)).toEqual([
      "0:display",
      "0:display",
      "0:support",
      "1:display",
      "1:support",
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

  it("keeps every chunk text until images arrive", () => {
    expect(presentChunks("A note.").every((chunk) => chunk.kind === "text")).toBe(true);
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

  it("fills the strip as the chunks pass", () => {
    expect(chunkProgress(0, 4)).toBe(0.25);
    expect(chunkProgress(3, 4)).toBe(1);
    expect(chunkProgress(0, 0)).toBe(0);
  });
});

describe("the size of the words on the stage", () => {
  it("fills the stage with a short chunk and shrinks a long one", () => {
    const display = roleSpec("display", "keycap");
    const short = chunkFontRatio("Maya", "display", 0.75);
    const long = chunkFontRatio("Maya ".repeat(40), "display", 0.75);

    expect(short).toBe(display.maxFontRatio);
    expect(long).toBeLessThan(short);
    expect(long).toBeGreaterThanOrEqual(display.minFontRatio);
  });

  it("gives a taller stage more room for the same words", () => {
    const words = "She still laughs at my jokes, even the ones I retell.";

    expect(chunkFontRatio(words, "support", 1.6)).toBeGreaterThan(
      chunkFontRatio(words, "support", 0.5),
    );
  });
});

describe("the timing a video needs", () => {
  const alignment = {
    characters: ["W", "e", " ", "m", "e", "t", ".", " ", "[", "l", "]", "S", "h", "e"],
    start_times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3],
    end_times: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4],
  };

  it("reads words from the character alignment, and drops the audio tags", () => {
    expect(alignmentToWords(alignment)).toEqual([
      { text: "We", startTime: 0, endTime: 0.2 },
      { text: "met.", startTime: 0.3, endTime: 0.7 },
      { text: "She", startTime: 1.1, endTime: 1.4 },
    ]);
  });

  it("gathers the words into captions of six", () => {
    const words = "one two three four five six seven eight".split(" ").map((text, index) => ({
      text,
      startTime: index * 0.2,
      endTime: index * 0.2 + 0.2,
    }));

    expect(wordsToCaptions(words).map((caption) => caption.words.length)).toEqual([6, 2]);
  });

  it("closes a caption at the end of a sentence", () => {
    const words = ["Hello.", "Then", "more"].map((text, index) => ({
      text,
      startTime: index * 0.2,
      endTime: index * 0.2 + 0.2,
    }));

    expect(wordsToCaptions(words).map((caption) => caption.words.length)).toEqual([1, 2]);
  });

  it("shows the first caption large, and a continuation small", () => {
    const captions = wordsToCaptions([
      { text: "Hello.", startTime: 0, endTime: 0.2 },
      { text: "Then", startTime: 0.2, endTime: 0.4 },
      { text: "more", startTime: 0.4, endTime: 0.6 },
    ]);

    expect(captionRoles(captions)).toEqual(["display", "display"]);
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
  it("offers text, audio, and video, in that order", () => {
    expect(EXPORT_ARTIFACTS.map((artifact) => artifact.kind)).toEqual([
      "text",
      "audio",
      "video",
    ]);
    expect(EXPORT_ARTIFACTS.map((artifact) => artifact.extension)).toEqual([
      "md",
      "mp3",
      "mp4",
    ]);
  });

  it("names the file after the note", () => {
    expect(exportFileName("Letter to Dr Shah", "text")).toBe("letter-to-dr-shah.md");
    expect(exportFileName(undefined, "video")).toBe("note.mp4");
  });

  it("writes the words with no voice at all", () => {
    expect(
      exportReason("text", { provider: "system", voiceId: null, video: false }),
    ).toBe(null);
  });

  it("says why the sound and the video wait", () => {
    const system = { provider: "system" as const, voiceId: "alex", video: true };

    expect(exportReason("audio", system)).toMatch(/ElevenLabs/);
    expect(exportReason("video", system)).toMatch(/ElevenLabs/);

    const cloud = { provider: "elevenlabs" as const, voiceId: null, video: true };
    expect(exportReason("audio", cloud)).toMatch(/voice/);

    const ready = { provider: "elevenlabs" as const, voiceId: "v1", video: true };
    expect(exportReason("audio", ready)).toBe(null);
    expect(exportReason("video", ready)).toBe(null);
    expect(exportReason("video", { ...ready, video: false })).toMatch(/browser/);
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

  it("forgets a tone that no longer exists", () => {
    expect(presentSettings({ tone: "stone", spoken: true }).tone).toBe(DEFAULT_TONE);
  });
});
