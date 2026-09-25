import { describe, expect, it } from "vitest";

import {
  draftParts,
  fileSound,
  isTag,
  speakableText,
  stripTags,
  tagBefore,
  tagLabel,
  tagsSpoken,
  wordRow,
} from "./audio-tags.ts";

const voice = (provider: string, modelId = "eleven_flash_v2_5") => ({
  provider,
  modelId,
  stability: 0.62,
  speed: 0.8,
});

describe("isTag", () => {
  it("knows a word in square brackets", () => {
    expect(isTag("[laughs]")).toBe(true);
    expect(isTag("[clears throat]")).toBe(true);
  });

  it("does not take a word or an empty pair for a tag", () => {
    expect(isTag("laughs")).toBe(false);
    expect(isTag("[]")).toBe(false);
    expect(isTag("[laughs")).toBe(false);
  });
});

describe("stripTags", () => {
  it("removes every tag and the spaces it leaves", () => {
    expect(stripTags("[laughs] That is funny. [sighs]")).toBe("That is funny.");
    expect(stripTags("Well, [sighs] I am not sure.")).toBe("Well, I am not sure.");
  });

  it("keeps a text without tags", () => {
    expect(stripTags("Hello there.")).toBe("Hello there.");
  });
});

describe("tagLabel", () => {
  it("gives the words inside the brackets", () => {
    expect(tagLabel("[clears throat]")).toBe("clears throat");
  });
});

describe("tagsSpoken", () => {
  it("is true for the Dialogue voice with any saved model", () => {
    expect(tagsSpoken(voice("dialogue"))).toBe(true);
  });

  it("is true for the ElevenLabs voice with Eleven v3", () => {
    expect(tagsSpoken(voice("elevenlabs", "eleven_v3"))).toBe(true);
  });

  it("is false for other ElevenLabs models and the system voice", () => {
    expect(tagsSpoken(voice("elevenlabs"))).toBe(false);
    expect(tagsSpoken(voice("system", "eleven_v3"))).toBe(false);
  });
});

describe("speakableText", () => {
  it("keeps the tags for a voice that reads them", () => {
    expect(speakableText("[laughs] Yes!", voice("dialogue"))).toBe("[laughs] Yes!");
  });

  it("never gives a tag to the system voice", () => {
    expect(speakableText("[laughs] Yes!", voice("system"))).toBe("Yes!");
  });

  it("removes the tags for a model that reads them aloud", () => {
    expect(speakableText("[whispers] Quiet now.", voice("elevenlabs"))).toBe(
      "Quiet now.",
    );
  });
});

describe("fileSound", () => {
  it("makes a Dialogue file with the settings that the Dialogue voice streams", () => {
    expect(fileSound("[laughs] Hi.", voice("dialogue"))).toEqual({
      text: "[laughs] Hi.",
      settings: { provider: "dialogue", modelId: "eleven_v3", stability: 0.5, speed: 1 },
    });
  });

  it("keeps the model and removes the tags for other voices", () => {
    expect(fileSound("[laughs] Hi.", voice("elevenlabs"))).toEqual({
      text: "Hi.",
      settings: voice("elevenlabs"),
    });
  });
});

describe("wordRow", () => {
  const found = ["and", "but", "[giggles]"];

  it("drops every tag when the voice does not read tags", () => {
    expect(wordRow(found, { tags: false, examples: ["laughs"], draft: "so " })).toEqual([
      "and",
      "but",
    ]);
  });

  it("puts at most two tags after the words, learned ones first", () => {
    expect(
      wordRow(found, { tags: true, examples: ["laughs", "sighs"], draft: "so " }),
    ).toEqual(["and", "but", "[giggles]", "[laughs]"]);
  });

  it("skips a tag that the draft already holds", () => {
    expect(
      wordRow(["and"], { tags: true, examples: ["laughs", "sighs"], draft: "[laughs] so " }),
    ).toEqual(["and", "[sighs]"]);
  });

  it("offers no tags for an empty draft", () => {
    expect(wordRow([], { tags: true, examples: ["laughs"], draft: "" })).toEqual([]);
  });
});

describe("tagBefore", () => {
  it("finds the tag that ends at the caret", () => {
    expect(tagBefore("so [clears throat]", 18)).toEqual({ start: 3, end: 18 });
  });

  it("finds the tag before the caret across one space", () => {
    expect(tagBefore("so [laughs] ", 12)).toEqual({ start: 3, end: 12 });
  });

  it("finds nothing after a word", () => {
    expect(tagBefore("so [laughs] yes", 15)).toBeNull();
  });
});

describe("draftParts", () => {
  it("splits a draft into words and tags", () => {
    expect(draftParts("[laughs] That is funny. [sighs]")).toEqual([
      { text: "[laughs]", tag: true },
      { text: " That is funny. ", tag: false },
      { text: "[sighs]", tag: true },
    ]);
  });

  it("keeps a draft without tags whole", () => {
    expect(draftParts("Hello")).toEqual([{ text: "Hello", tag: false }]);
  });
});
