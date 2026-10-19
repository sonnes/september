import { describe, expect, it } from "vitest";

import {
  DEFAULT_ACCESS,
  isDark,
  parseAccess,
  reachFor,
} from "./access";

describe("reachFor", () => {
  it("keeps the numbers of today for touch", () => {
    const reach = reachFor(DEFAULT_ACCESS);
    expect(reach.targetPx).toBe(48);
    expect(reach.stripes).toBe(6);
    expect(reach.slice).toBe(6);
    expect(reach.dwellMs).toBeNull();
    expect(reach.scanStepMs).toBeNull();
  });

  it("gives eye gaze large targets, wide gaps, and a dwell", () => {
    const reach = reachFor({ ...DEFAULT_ACCESS, input: "eyes" });
    expect(reach.targetPx).toBe(88);
    expect(reach.gapPx).toBe(24);
    expect(reach.dwellMs).toBe(800);
    expect(reach.stripes).toBe(4);
    expect(reach.slice).toBe(4);
  });

  it("gives a switch a scan step and no dwell", () => {
    const reach = reachFor({ ...DEFAULT_ACCESS, input: "switch" });
    expect(reach.scanStepMs).toBe(1200);
    expect(reach.dwellMs).toBeNull();
    expect(reach.targetPx).toBe(64);
  });

  it("uses the dwell time and the scan step the person chose", () => {
    expect(reachFor({ ...DEFAULT_ACCESS, input: "eyes", dwellMs: 1200 }).dwellMs).toBe(1200);
    expect(reachFor({ ...DEFAULT_ACCESS, input: "switch", scanStepMs: 2000 }).scanStepMs).toBe(2000);
  });

  it("makes the words larger for a larger text size", () => {
    const standard = reachFor(DEFAULT_ACCESS);
    const large = reachFor({ ...DEFAULT_ACCESS, textSize: "large" });
    const largest = reachFor({ ...DEFAULT_ACCESS, textSize: "largest" });
    expect(large.wordPx).toBeGreaterThan(standard.wordPx);
    expect(largest.wordPx).toBeGreaterThan(large.wordPx);
  });

  it("gives the text size as a scale for the rest of the screen", () => {
    expect(reachFor(DEFAULT_ACCESS).textScale).toBe(1);
    expect(reachFor({ ...DEFAULT_ACCESS, textSize: "largest" }).textScale).toBe(1.5);
  });

  it("reduces motion when the person asks, whatever the input", () => {
    expect(reachFor({ ...DEFAULT_ACCESS, motion: "reduced" }).motion).toBe("reduced");
    expect(reachFor({ ...DEFAULT_ACCESS, input: "eyes" }).motion).toBe("reduced");
  });
});

describe("isDark", () => {
  it("is off by default", () => {
    expect(isDark(DEFAULT_ACCESS.theme, true)).toBe(false);
  });

  it("follows the choice of the person", () => {
    expect(isDark("dark", false)).toBe(true);
    expect(isDark("light", true)).toBe(false);
  });

  it("follows the system when the person asks", () => {
    expect(isDark("system", true)).toBe(true);
    expect(isDark("system", false)).toBe(false);
  });
});

describe("parseAccess", () => {
  it("gives the default for nothing saved", () => {
    expect(parseAccess(undefined)).toEqual(DEFAULT_ACCESS);
    expect(parseAccess("eyes")).toEqual(DEFAULT_ACCESS);
  });

  it("keeps the valid fields and drops the rest", () => {
    expect(parseAccess({ input: "eyes", theme: "sepia", dwellMs: 900 })).toEqual({
      ...DEFAULT_ACCESS,
      input: "eyes",
      dwellMs: 900,
    });
  });

  it("keeps the click sound off when the person turned it off", () => {
    expect(parseAccess({ sound: "off" }).sound).toBe("off");
    expect(parseAccess({ sound: "loud" }).sound).toBe(DEFAULT_ACCESS.sound);
  });

  it("allows a scan step up to 30 seconds, ten times the slowest default", () => {
    expect(parseAccess({ scanStepMs: 30_000 }).scanStepMs).toBe(30_000);
  });

  it("refuses a dwell time or scan step outside the safe range", () => {
    expect(parseAccess({ dwellMs: 10 }).dwellMs).toBeUndefined();
    expect(parseAccess({ scanStepMs: 60_000 }).scanStepMs).toBeUndefined();
  });
});
