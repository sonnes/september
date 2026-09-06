import { describe, expect, it } from "vitest";

import {
  composerAction,
  newSpaceMode,
  newSpaceTitle,
  spaceForSlug,
  spaceNeedsSetup,
} from "./spaces.ts";

const space = (id: string, title: string, context?: string) => ({
  id,
  title,
  context,
});

describe("spaceNeedsSetup", () => {
  it("holds while a space has never been described", () => {
    expect(spaceNeedsSetup(space("1", "Amber Cedar Meadow"), [])).toBe(true);
  });

  it("ends once the space says what it is for", () => {
    expect(
      spaceNeedsSetup(space("1", "Mum", "I speak to my mother here."), []),
    ).toBe(false);
  });

  it("ends once its agent has been spoken to", () => {
    expect(spaceNeedsSetup(space("1", "Amber Cedar Meadow"), [{}])).toBe(false);
  });

  // Words that are only spaces say nothing about what a space is for.
  it("reads an empty description as none at all", () => {
    expect(spaceNeedsSetup(space("1", "Amber Cedar Meadow", "  "), [])).toBe(
      true,
    );
  });
});

describe("newSpaceTitle", () => {
  it("names a space that has no name yet Untitled", () => {
    expect(newSpaceTitle([])).toBe("Untitled");
  });

  it("counts up as the name is taken", () => {
    expect(newSpaceTitle(["Untitled"])).toBe("Untitled 1");
    expect(newSpaceTitle(["Untitled", "Untitled 1"])).toBe("Untitled 2");
    expect(newSpaceTitle(["Untitled", "Untitled 1", "Untitled 2"])).toBe(
      "Untitled 3",
    );
  });

  // A deleted space leaves its number free, and a name nobody holds is free.
  it("takes a number a deleted space left behind", () => {
    expect(newSpaceTitle(["Untitled", "Untitled 2"])).toBe("Untitled 1");
  });

  // One slug names one space, and the slug is what the address carries.
  it("reads a name that differs only in its letters as taken", () => {
    expect(newSpaceTitle(["untitled"])).toBe("Untitled 1");
  });

  it("passes over the names of spaces the user chose", () => {
    expect(newSpaceTitle(["Mum", "Clinic"])).toBe("Untitled");
  });
});

describe("newSpaceMode", () => {
  // The agent sets a new space up, so a user who has one goes to it.
  it("opens the agent when it can answer", () => {
    expect(newSpaceMode(true)).toBe("agent");
  });

  it("opens Talk when no service is connected", () => {
    expect(newSpaceMode(false)).toBe("talk");
  });
});

describe("spaceForSlug", () => {
  const spaces = [space("1", "Mum"), space("2", "Clinic")];
  const seen = { id: "1", slug: "amber-cedar-meadow" };

  it("finds the space its slug names", () => {
    expect(spaceForSlug("clinic", spaces, null)).toEqual({
      space: spaces[1],
      renamed: false,
    });
  });

  // The first turn of a new space renames it, and the address must follow the
  // space the user is looking at rather than leave it.
  it("follows a space whose title changed under the address", () => {
    expect(spaceForSlug("amber-cedar-meadow", spaces, seen)).toEqual({
      space: spaces[0],
      renamed: true,
    });
  });

  // The address moved, so this is a link to a space that is not there, and
  // not the space in the screen changing its name.
  it("does not follow a rename when the address itself changed", () => {
    expect(spaceForSlug("deleted", spaces, seen)).toBeNull();
  });

  it("finds nothing for a slug and an id that name no space", () => {
    expect(spaceForSlug("gone", spaces, { id: "9", slug: "gone" })).toBeNull();
    expect(spaceForSlug("gone", spaces, null)).toBeNull();
  });

  it("prefers the slug over the space last seen", () => {
    expect(spaceForSlug("clinic", spaces, seen)).toEqual({
      space: spaces[1],
      renamed: false,
    });
  });
});

describe("the setup console", () => {
  it("asks what the space is for", () => {
    const action = composerAction("setup");
    expect(action.label).toBe("Set up space");
    expect(action.field).toBe("What is this space for?");
    expect(action.speaks).toBe(false);
  });
});
