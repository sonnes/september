import assert from "node:assert/strict";
import test from "node:test";

import { APP_NAV, navFor, openingPath } from "../src/rules/app-nav.ts";
import {
  canReach,
  isSetupDone,
  nextStep,
  previousStep,
  STEPS,
  stepsFor,
} from "../src/rules/onboarding.ts";

const free = { name: "Ravi", mode: "free" };
const advanced = { name: "Ravi", mode: "advanced" };

test("navigation resolves each configured destination", () => {
  for (const destination of APP_NAV) {
    assert.equal(navFor(destination.path), destination);
  }
});

const spaces = [
  { title: "Amma", updated_at: 10 },
  { title: "Work Team", updated_at: 30 },
  { title: "Doctor", updated_at: 20 },
];

test("the app reopens a saved space-mode path when its space exists", () => {
  assert.equal(openingPath("/spaces/amma/talk", spaces), "/spaces/amma/talk");
  assert.equal(
    openingPath("/spaces/doctor/notes/shopping", spaces),
    "/spaces/doctor/notes/shopping",
  );
  assert.equal(openingPath("/spaces/amma/agent", spaces), "/spaces/amma/agent");
});

test("the app reopens a saved page, settings section, connection, or guide", () => {
  for (const { path } of APP_NAV) {
    assert.equal(openingPath(path, spaces), path);
  }
  assert.equal(openingPath("/voice/clone", spaces), "/voice/clone");
  assert.equal(openingPath("/settings/writing", spaces), "/settings/writing");
  assert.equal(
    openingPath("/settings/connections/openrouter", spaces),
    "/settings/connections/openrouter",
  );
  assert.equal(
    openingPath("/help/set-up-september", spaces),
    "/help/set-up-september",
  );
});

test("the app opens Talk of the most recent space for any other saved path", () => {
  const recent = "/spaces/work-team/talk";
  assert.equal(openingPath(null, spaces), recent);
  assert.equal(openingPath("/spaces/gone/talk", spaces), recent);
  assert.equal(openingPath("/spaces/new", spaces), recent);
  assert.equal(openingPath("/dashboard", spaces), recent);
  assert.equal(openingPath("/welcome", spaces), recent);
  assert.equal(openingPath("/spacesomething", spaces), recent);
  assert.equal(openingPath("/settings/nowhere", spaces), recent);
  assert.equal(openingPath("/settings/connections/nobody", spaces), recent);
  assert.equal(openingPath("/help/no-such-guide", spaces), recent);
});

test("the app opens the Spaces list with no spaces", () => {
  assert.equal(openingPath(null, []), "/spaces");
  assert.equal(openingPath("/spaces/amma/talk", []), "/spaces");
  assert.equal(openingPath("/settings", []), "/settings");
});

test("all saved modes follow the same setup steps", () => {
  assert.deepEqual(
    stepsFor(free).map((step) => step.path),
    STEPS.map((step) => step.path),
  );
  assert.deepEqual(stepsFor(advanced), STEPS);
});

test("setup navigation moves through the steps for the selected mode", () => {
  assert.equal(nextStep("/welcome", free), "/profile");
  assert.equal(nextStep("/profile", free), "/connect");
  assert.equal(previousStep("/finish", free), "/connect");
  assert.equal(nextStep("/profile", advanced), "/connect");
  assert.equal(previousStep("/finish", advanced), "/connect");
  assert.equal(nextStep("/finish", advanced), null);
});

test("setup steps unlock only after their required answers exist", () => {
  const blank = { name: "", mode: null };

  assert.equal(canReach("/welcome", blank), true);
  assert.equal(canReach("/profile", blank), true);
  assert.equal(canReach("/connect", blank), false);
  assert.equal(canReach("/connect", { name: "Ravi", mode: null }), true);
  assert.equal(canReach("/connect", free), true);
  assert.equal(canReach("/connect", advanced), true);
  assert.equal(canReach("/finish", advanced), true);
});

test("setup completes when it has a name and a mode", () => {
  assert.equal(isSetupDone(null), false);
  assert.equal(isSetupDone({ name: "  ", mode: "free" }), false);
  assert.equal(isSetupDone({ name: "Ravi", mode: null }), false);
  assert.equal(isSetupDone(free), true);
  assert.equal(isSetupDone(advanced), true);
});
