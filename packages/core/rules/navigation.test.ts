import { describe, expect, it } from "vitest";

import {
  appNav,
  CONNECTION_GUIDES,
  isConnectionId,
  navFor,
  openingPath,
  sectionFor,
  settingsNav,
  windowTitle,
  type Capabilities,
} from "./navigation.ts";

const mac: Capabilities = { dashboard: false, eyeTracker: true, floatingPanel: true };
const browser: Capabilities = { dashboard: true, eyeTracker: false, floatingPanel: false };

const spaces = [
  { title: "Amma", updated_at: 10 },
  { title: "Work Team", updated_at: 30 },
  { title: "Doctor", updated_at: 20 },
];

describe("the pages of a platform", () => {
  it("keeps only the pages that the platform offers", () => {
    expect(appNav(mac).map((page) => page.path)).toEqual([
      "/spaces",
      "/voice",
      "/eyetracker",
      "/help",
      "/settings",
    ]);
    expect(appNav(browser).map((page) => page.path)).toEqual([
      "/dashboard",
      "/spaces",
      "/voice",
      "/help",
      "/settings",
    ]);
  });

  it("resolves each page by its path", () => {
    for (const page of appNav(browser)) expect(navFor(page.path)).toBe(page);
  });

  it("offers the panel section only on a platform with a floating panel", () => {
    expect(settingsNav(mac).map((section) => section.path)).toContain("/settings/panel");
    expect(settingsNav(browser).map((section) => section.path)).not.toContain("/settings/panel");
  });
});

describe("the open settings section", () => {
  it("resolves each section path to its section", () => {
    for (const section of settingsNav(mac)) expect(sectionFor(section.path)).toBe(section);
  });

  it("keeps Services open on a connection page", () => {
    expect(sectionFor("/settings/connections/openrouter")).toBe(settingsNav(mac)[0]);
  });
});

describe("connections", () => {
  it("accepts each guide and refuses any other name", () => {
    for (const [provider, guide] of Object.entries(CONNECTION_GUIDES)) {
      expect(isConnectionId(provider)).toBe(true);
      expect(new URL(guide.url).protocol).toBe("https:");
    }
    expect(isConnectionId("unknown")).toBe(false);
  });
});

describe("the opening path", () => {
  it("reopens a saved mode of a space that exists", () => {
    for (const path of [
      "/spaces/amma/talk",
      "/spaces/amma/agent",
      "/spaces/amma/notes",
      "/spaces/doctor/notes/shopping",
    ]) {
      expect(openingPath(path, spaces, mac)).toBe(path);
    }
  });

  it("reopens a saved page, section, connection, or guide of the platform", () => {
    for (const { path } of appNav(mac)) expect(openingPath(path, spaces, mac)).toBe(path);
    for (const path of [
      "/voice/clone",
      "/settings/writing",
      "/settings/panel",
      "/settings/connections/openrouter",
      "/help/set-up-september",
    ]) {
      expect(openingPath(path, spaces, mac)).toBe(path);
    }
  });

  it("opens Talk of the most recent space for any other saved path", () => {
    const recent = "/spaces/work-team/talk";
    for (const path of [
      null,
      "/spaces/gone/talk",
      "/spaces/new",
      "/spaces/amma/notes/a/b",
      "/dashboard",
      "/welcome",
      "/spacesomething",
      "/settings/nowhere",
      "/settings/connections/nobody",
      "/help/no-such-guide",
    ]) {
      expect(openingPath(path, spaces, mac)).toBe(recent);
    }
  });

  it("refuses a page that the platform does not offer", () => {
    expect(openingPath("/settings/panel", spaces, browser)).toBe("/spaces/work-team/talk");
    expect(openingPath("/dashboard", spaces, browser)).toBe("/dashboard");
  });

  it("opens the first page of the platform with no spaces", () => {
    expect(openingPath(null, [], mac)).toBe("/spaces");
    expect(openingPath("/spaces/amma/talk", [], mac)).toBe("/spaces");
    expect(openingPath(null, [], browser)).toBe("/dashboard");
    expect(openingPath("/settings", [], mac)).toBe("/settings");
  });
});

describe("the window title", () => {
  it("names the mode of a space and the page", () => {
    expect(windowTitle("/spaces/amma/talk")).toBe("September — Talk");
    expect(windowTitle("/spaces/amma/notes/shopping")).toBe("September — Notes");
    expect(windowTitle("/spaces/amma/agent/")).toBe("September — Agent");
    expect(windowTitle("/voice/clone")).toBe("September — Clone your voice");
    expect(windowTitle("/settings/connections/elevenlabs")).toBe("September — ElevenLabs");
    expect(windowTitle("/spaces")).toBe("September — Spaces");
  });

  it("gives the app name alone for a path that names no screen", () => {
    expect(windowTitle("/spaces/amma")).toBe("September");
    expect(windowTitle("/spaces/amma/notes/a/b")).toBe("September");
  });
});
