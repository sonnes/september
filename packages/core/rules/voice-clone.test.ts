import { describe, expect, it } from "vitest";

import { CLONE_LIMITS, validateVoiceClone } from "./voice-clone.ts";

const MB = 1024 * 1024;
const file = (name: string, size: number, type = "audio/mpeg") => ({ name, size, type });

describe("validateVoiceClone", () => {
  it("accepts named audio inside the limits", () => {
    expect(validateVoiceClone({ files: [file("a.mp3", MB)], name: "Me" })).toBeNull();
  });

  it("asks for a sample, a name, and audio", () => {
    expect(validateVoiceClone({ files: [], name: "Me" })).not.toBeNull();
    expect(validateVoiceClone({ files: [file("a.mp3", MB)], name: "  " })).not.toBeNull();
    expect(validateVoiceClone({ files: [file("a.txt", MB, "text/plain")], name: "Me" })).not.toBeNull();
  });

  it("refuses one sample over the file limit and samples over the total", () => {
    const big = file("big.mp3", CLONE_LIMITS.sampleBytes + 1);
    expect(validateVoiceClone({ files: [big], name: "Me" })).toContain("big.mp3");
    const many = Array.from({ length: 5 }, (_, at) => file(`${at}.mp3`, CLONE_LIMITS.sampleBytes));
    expect(validateVoiceClone({ files: many, name: "Me" })).not.toBeNull();
  });
});
