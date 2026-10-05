import assert from "node:assert/strict";
import test from "node:test";

import {
  CONNECTION_GUIDES,
  isConnectionId,
  sectionFor,
  SETTINGS_NAV,
} from "../src/rules/settings-nav.ts";

test("settings paths resolve to their configured section", () => {
  for (const section of SETTINGS_NAV) {
    assert.equal(sectionFor(section.path), section);
  }
  assert.equal(sectionFor("/settings/connections/openrouter"), SETTINGS_NAV[0]);
});

test("the panel section opens at its own path", () => {
  assert.equal(sectionFor("/settings/panel").path, "/settings/panel");
});

test("connection identifiers and guide links validate at the settings boundary", () => {
  for (const [provider, guide] of Object.entries(CONNECTION_GUIDES)) {
    assert.equal(isConnectionId(provider), true);
    assert.equal(new URL(guide.url).protocol, "https:");
  }
  assert.equal(isConnectionId("unknown"), false);
});
