import { describe, expect, it } from "vitest";

import { LANDING_TITLE, documentTitle } from "./titles.ts";

describe("documentTitle", () => {
  it("names the app after the page", () => {
    expect(documentTitle("Today")).toBe("Today · September");
  });

  // The tab is narrow, so the words that tell two tabs apart come first.
  it("puts the most particular part first", () => {
    expect(documentTitle("Thursday appointment", "Family")).toBe(
      "Thursday appointment · Family · September",
    );
  });

  it("drops a part that is not there yet", () => {
    expect(documentTitle("Talk", undefined)).toBe("Talk · September");
    expect(documentTitle(null, "Settings")).toBe("Settings · September");
    expect(documentTitle("  ", "Settings")).toBe("Settings · September");
  });

  it("names the app alone when the page has no name", () => {
    expect(documentTitle()).toBe("September");
  });
});

describe("LANDING_TITLE", () => {
  it("says what the app is, for a reader who has never seen it", () => {
    expect(LANDING_TITLE).toBe("September — faster communication, fewer keystrokes");
  });
});
