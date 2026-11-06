import { describe, expect, it } from "vitest";

import {
  canReach,
  DEFAULT_DRAFT,
  isSetupDone,
  nextStep,
  previousStep,
  savedSetupFrom,
  stepIndex,
  type SavedSetup,
} from "./onboarding.ts";

describe("the setup steps", () => {
  it("moves forward and back through the steps", () => {
    expect(nextStep("/welcome")).toBe("/choose");
    expect(nextStep("/choose")).toBe("/profile");
    expect(nextStep("/profile")).toBe("/connect");
    expect(nextStep("/connect")).toBe("/finish");
    expect(nextStep("/finish")).toBeNull();
    expect(previousStep("/welcome")).toBeNull();
    expect(previousStep("/profile")).toBe("/choose");
    expect(previousStep("/finish")).toBe("/connect");
  });

  it("gives no place to a path that is not a step", () => {
    expect(stepIndex("/connect")).toBe(3);
    expect(stepIndex("/spaces")).toBe(-1);
  });

  it("unlocks the steps after About you only with a name", () => {
    const blank = { name: "  " };
    expect(canReach("/welcome", blank)).toBe(true);
    expect(canReach("/choose", blank)).toBe(true);
    expect(canReach("/profile", blank)).toBe(true);
    expect(canReach("/connect", blank)).toBe(false);
    expect(canReach("/finish", blank)).toBe(false);
    expect(canReach("/connect", { name: "Ravi" })).toBe(true);
    expect(canReach("/finish", { name: "Ravi" })).toBe(true);
  });
});

describe("a finished setup", () => {
  it("needs a name and a mode", () => {
    expect(isSetupDone(null)).toBe(false);
    expect(isSetupDone({ name: "  ", mode: "free" })).toBe(false);
    expect(isSetupDone({ name: "Ravi", mode: null } as never)).toBe(false);
    expect(isSetupDone({ name: "Ravi", mode: "free" })).toBe(true);
    expect(isSetupDone({ name: "Ravi", mode: "advanced" })).toBe(true);
  });
});

describe("a saved setup", () => {
  it("is nothing when nothing is saved", () => {
    expect(savedSetupFrom(null)).toBeNull();
  });

  it("turns the features on that an older setup never answered", () => {
    const older = { ...DEFAULT_DRAFT, id: "ravi", name: "Ravi" } as Partial<SavedSetup>;
    delete older.autoSuggestions;
    delete older.autoPhrases;
    delete older.agentEnabled;
    const read = savedSetupFrom(older as SavedSetup)!;
    expect(read.autoSuggestions).toBe(true);
    expect(read.autoPhrases).toBe(true);
    expect(read.agentEnabled).toBe(true);
    expect(read.id).toBe("ravi");
  });

  it("keeps a feature the user turned off", () => {
    const saved = { ...DEFAULT_DRAFT, id: "ravi", name: "Ravi", autoPhrases: false };
    expect(savedSetupFrom(saved)!.autoPhrases).toBe(false);
  });
});
