import { describe, expect, it } from "vitest";

import {
  HELP_CATEGORIES,
  HELP_GUIDES,
  HELP_HOME_SHORTCUTS,
  HELP_PLATFORMS,
  helpGuide,
  searchHelpGuides,
} from "./help.ts";

describe("the Help catalog", () => {
  it("resolves every guide and every internal reference", () => {
    const slugs = new Set(HELP_GUIDES.map((guide) => guide.slug));
    const categories = new Set(HELP_CATEGORIES.map((category) => category.id));
    const platforms = new Set(HELP_PLATFORMS.map((platform) => platform.key));

    expect(slugs.size).toBe(HELP_GUIDES.length);
    for (const guide of HELP_GUIDES) {
      expect(helpGuide(guide.slug)).toBe(guide);
      expect(categories.has(guide.category)).toBe(true);
      expect(guide.platforms.every((platform) => platforms.has(platform))).toBe(
        true,
      );
      expect(guide.related.every((slug) => slugs.has(slug))).toBe(true);
    }
  });

  it("resolves every home shortcut target", () => {
    for (const shortcut of HELP_HOME_SHORTCUTS) {
      if (shortcut.target.type === "guide") {
        expect(helpGuide(shortcut.target.slug)).toBeDefined();
      } else {
        expect(
          HELP_CATEGORIES.some(
            (category) => category.id === shortcut.target.categoryId,
          ),
        ).toBe(true);
      }
    }
  });
});

describe("Help search", () => {
  it("searches titles, summaries, keywords, and steps without caring about case", () => {
    expect(
      searchHelpGuides("PHRASE CODES").map((guide) => guide.slug),
    ).toContain("use-phrase-codes");
    expect(
      searchHelpGuides("prepared message").map((guide) => guide.slug),
    ).toContain("prepare-a-note");
    expect(searchHelpGuides("AAC").map((guide) => guide.slug)).toContain(
      "speak-your-first-message",
    );
    expect(
      searchHelpGuides("Press Speak").map((guide) => guide.slug),
    ).toContain("speak-your-first-message");
  });

  it("requires every search word and preserves catalog order", () => {
    const results = searchHelpGuides("voice preview");
    const positions = results.map((guide) => HELP_GUIDES.indexOf(guide));

    expect(results.length).toBeGreaterThan(0);
    expect(positions).toEqual(
      [...positions].sort((left, right) => left - right),
    );
    expect(
      results.every((guide) => {
        const text = [
          guide.title,
          guide.summary,
          ...guide.keywords,
          ...guide.steps,
        ]
          .join(" ")
          .toLocaleLowerCase();
        return text.includes("voice") && text.includes("preview");
      }),
    ).toBe(true);
  });

  it("returns the full catalog for an empty query", () => {
    expect(searchHelpGuides("  ")).toEqual(HELP_GUIDES);
  });
});
