import { describe, expect, it } from "vitest";

import {
  HELP_CATEGORIES,
  HELP_GUIDES,
  HELP_HOME_SHORTCUTS,
  HELP_PLATFORMS,
  groupHelpGuides,
  helpGuide,
  searchHelpGuides,
} from "./help.ts";

const GUIDE_TITLES = [
  "Set up September",
  "Speak your first message",
  "Learn the Talk screen",
  "Choose the browser or Mac app",
  "Use word and sentence suggestions",
  "Save a phrase",
  "Use phrase codes",
  "Find and replay an earlier message",
  "Create and switch spaces",
  "Tell September about a space",
  "Prepare a note",
  "Read or present a note",
  "Export text, audio, or video",
  "Choose and preview a voice",
  "Clone a voice",
  "Choose writing help",
  "Connect OpenRouter or ElevenLabs",
  "Speak into FaceTime or Zoom",
  "Set up the floating keyboard",
  "Grant Accessibility permission",
  "Use the input bar and shortcut panels",
  "Understand what stays on the device",
  "Understand what connected services receive",
  "Back up or restore your data",
  "Review typing saved and service use",
  "Fix missing sound",
  "Restore missing suggestions",
  "Reconnect a service",
  "Restore the microphone",
  "Make the floating keyboard type",
  "Get more help",
];

describe("the Help information architecture", () => {
  it("keeps the approved category order", () => {
    expect(HELP_CATEGORIES.map((category) => category.title)).toEqual([
      "Start here",
      "Communicate with fewer keystrokes",
      "Organize conversations",
      "Choose how September speaks and writes",
      "Use September on a Mac",
      "Privacy, data, and usage",
      "Fix a problem",
    ]);
  });

  it("contains every approved guide in category order", () => {
    expect(HELP_GUIDES.map((guide) => guide.title)).toEqual(GUIDE_TITLES);
    expect(groupHelpGuides().flatMap((group) => group.guides.map((guide) => guide.title))).toEqual(
      GUIDE_TITLES,
    );
  });

  it("gives every guide a unique stable slug and a complete written fallback", () => {
    const slugs = HELP_GUIDES.map((guide) => guide.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    for (const guide of HELP_GUIDES) {
      expect(guide.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(guide.summary.length).toBeGreaterThan(0);
      expect(guide.platforms.length).toBeGreaterThan(0);
      expect(guide.steps.length).toBeGreaterThan(0);
      expect(guide.steps.every((step) => step.length > 0)).toBe(true);
      expect(guide.expectedResult.length).toBeGreaterThan(0);
      expect(guide.recovery.length).toBeGreaterThan(0);
      expect(helpGuide(guide.slug)).toBe(guide);
    }
    expect(helpGuide("not-a-guide")).toBeUndefined();
  });

  it("keeps every related guide link valid", () => {
    const slugs = new Set(HELP_GUIDES.map((guide) => guide.slug));

    for (const guide of HELP_GUIDES) {
      expect(guide.related.every((slug) => slugs.has(slug))).toBe(true);
      expect(guide.related).not.toContain(guide.slug);
    }
  });

  it("uses the three platform labels promised to readers", () => {
    expect(HELP_PLATFORMS).toEqual([
      { key: "browser", label: "Browser" },
      { key: "mac-app", label: "Mac app" },
      { key: "mac-keyboard", label: "Mac keyboard" },
    ]);

    const platformKeys = new Set(HELP_PLATFORMS.map((platform) => platform.key));
    for (const guide of HELP_GUIDES) {
      expect(guide.platforms.every((platform) => platformKeys.has(platform))).toBe(true);
    }
  });

  it("leads with the three approved shortcuts and valid targets", () => {
    expect(HELP_HOME_SHORTCUTS.map((shortcut) => shortcut.title)).toEqual([
      "Speak your first message",
      "Fix a problem",
      "Use September in a call",
    ]);

    for (const shortcut of HELP_HOME_SHORTCUTS) {
      if (shortcut.target.type === "guide") {
        expect(helpGuide(shortcut.target.slug)).toBeDefined();
      } else {
        expect(HELP_CATEGORIES.some((category) => category.id === shortcut.target.categoryId)).toBe(
          true,
        );
      }
    }
  });

  it("uses the settled service vocabulary in reader-facing copy", () => {
    for (const guide of HELP_GUIDES) {
      const visible = [
        guide.title,
        guide.summary,
        ...guide.prerequisites,
        ...guide.steps,
        guide.expectedResult,
        guide.recovery,
      ].join(" ");

      expect(visible).not.toMatch(/\bprovider\b/i);
    }
  });

  it("describes space context and Mac setup as the product implements them", () => {
    expect(helpGuide("tell-september-about-a-space")?.recovery).toBe(
      "If writing help is off, keep the description. September can use it when writing help is available.",
    );
    expect(helpGuide("speak-into-facetime-or-zoom")?.steps).not.toContain(
      "Install or enable September Microphone when September offers it.",
    );
    expect(helpGuide("set-up-the-floating-keyboard")?.steps).toContain(
      "If the permission banner appears, choose Open Settings.",
    );
  });

  it("warns before a backup replaces local data", () => {
    const guide = helpGuide("back-up-or-restore-your-data");
    const text = [guide?.summary, ...(guide?.steps ?? []), guide?.recovery].join(" ");

    expect(guide?.platforms).toEqual(["browser", "mac-app"]);
    expect(text).toMatch(/API keys are not included/);
    expect(text).toMatch(/replaces your current settings and data/);
    expect(guide?.steps).toContain("Open Settings, then open Data.");
  });
});

describe("Help search", () => {
  it("matches a title without caring about case", () => {
    expect(searchHelpGuides("PHRASE CODES").map((guide) => guide.slug)).toContain(
      "use-phrase-codes",
    );
  });

  it("matches summaries", () => {
    expect(searchHelpGuides("prepared message").map((guide) => guide.slug)).toContain(
      "prepare-a-note",
    );
  });

  it("matches keywords", () => {
    expect(searchHelpGuides("AAC").map((guide) => guide.slug)).toContain(
      "speak-your-first-message",
    );
  });

  it("matches written steps", () => {
    expect(searchHelpGuides("Press Speak").map((guide) => guide.slug)).toContain(
      "speak-your-first-message",
    );
  });

  it("requires every search word and keeps catalog order", () => {
    const results = searchHelpGuides("voice preview");

    expect(results[0]?.slug).toBe("choose-and-preview-a-voice");
    expect(results.every((guide) => {
      const text = [guide.title, guide.summary, ...guide.keywords, ...guide.steps]
        .join(" ")
        .toLocaleLowerCase();
      return text.includes("voice") && text.includes("preview");
    })).toBe(true);
  });

  it("returns the full catalog for an empty query", () => {
    expect(searchHelpGuides("  ")).toEqual(HELP_GUIDES);
  });
});

describe("Help media slots", () => {
  it("ships the stable Talk-screen overview", () => {
    const media = helpGuide("learn-the-talk-screen")?.media?.[0];

    expect(media?.type).toBe("screenshot");
    expect(media?.src).toBe("/help/talk-screen.png");
  });

  it("gives every screenshot a useful text alternative", () => {
    const screenshots = HELP_GUIDES.flatMap((guide) => guide.media ?? []).filter(
      (medium) => medium.type === "screenshot",
    );

    expect(screenshots.length).toBeGreaterThan(0);
    for (const screenshot of screenshots) {
      expect(screenshot.alt.length).toBeGreaterThan(0);
    }
  });

  it("gives every video a title and written transcript", () => {
    const videos = HELP_GUIDES.flatMap((guide) => guide.media ?? []).filter(
      (medium) => medium.type === "video",
    );

    expect(videos.length).toBeGreaterThan(0);
    for (const video of videos) {
      expect(video.title.length).toBeGreaterThan(0);
      expect(video.transcript.length).toBeGreaterThan(0);
    }
  });

  it("does not require an asset before the written guide can render", () => {
    const plannedMedia = HELP_GUIDES.flatMap((guide) => guide.media ?? []);

    expect(plannedMedia.some((medium) => medium.src === undefined)).toBe(true);
  });
});
