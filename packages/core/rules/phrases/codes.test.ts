import { describe, expect, it } from "vitest";

import { buildPhrasesPrompt } from "../prompts/phrases.ts";
import { generateCode, matchCode, validateCode } from "./codes.ts";

describe("generateCode with audio tags", () => {
  it("reads the words only, so a tag does not change the code", () => {
    const plain = generateCode("Excuse me, I have something to say", { existingCodes: [] });
    expect(
      generateCode("[clears throat] Excuse me, I have something to say", { existingCodes: [] }),
    ).toBe(plain);
  });
});

describe("buildPhrasesPrompt with audio tags", () => {
  const input = { existing: [{ text: "[laughs] That is hilarious", pinned: true }], history: [] };

  it("has no tag rules by default", () => {
    expect(buildPhrasesPrompt(input).system).not.toContain("audio tag");
  });

  it("lets the model add a tag to a phrase with a clear feeling when tags are spoken", () => {
    const { system } = buildPhrasesPrompt({ ...input, tags: true });
    expect(system).toContain("<audio_tags>");
    expect(system.indexOf("<audio_tags>")).toBeLessThan(system.indexOf("Answer with JSON"));
  });
});

describe("phrase codes", () => {
  it("takes the initials of the content words", () => {
    expect(generateCode("I want to go to the bathroom", { existingCodes: [] })).toBe("iwgb");
  });

  it("never gives a code that is a common word or already in use", () => {
    const first = generateCode("Thank you", { existingCodes: [] });
    const second = generateCode("Tell you", { existingCodes: [first!] });
    expect(second).not.toBe(first);
    expect(validateCode("yes", { existingCodes: [] })).toMatchObject({ ok: false, reason: "dictionary" });
    expect(validateCode("TY", { existingCodes: ["ty"] })).toMatchObject({ ok: false, reason: "duplicate" });
    expect(validateCode(" Ty ", { existingCodes: [] })).toEqual({ ok: true, code: "ty" });
  });

  it("prefers the current space, then a pinned row, when two rows share a code", () => {
    const row = (id: string, space_id: string, pinned: boolean) => ({
      id, space_id, text: id, kind: "phrase" as const, code: "ty", pinned, created_at: 0, updated_at: 0,
    });
    const rows = [row("other", "b", true), row("loose", "a", false), row("kept", "a", true)];
    expect(matchCode("TY", rows, "a")?.id).toBe("kept");
  });
});
