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

test("the app reopens a saved application route", () => {
  assert.equal(openingPath("/voice"), "/voice");
  assert.equal(openingPath("/spaces/amma/talk"), "/spaces/amma/talk");
  assert.equal(
    openingPath("/settings/connections/openrouter"),
    "/settings/connections/openrouter",
  );
});

test("the app uses its default route for transient or unknown saved routes", () => {
  const fallback = APP_NAV[0].path;

  assert.equal(openingPath("/spaces/new"), fallback);
  assert.equal(openingPath("/welcome"), fallback);
  assert.equal(openingPath("/spacesomething"), fallback);
  assert.equal(openingPath(null), fallback);
});

test("setup mode determines whether the connection step is included", () => {
  assert.deepEqual(
    stepsFor(free).map((step) => step.path),
    STEPS.filter((step) => step.path !== "/connect").map((step) => step.path),
  );
  assert.deepEqual(stepsFor(advanced), STEPS);
});

test("setup navigation moves through the steps for the selected mode", () => {
  assert.equal(nextStep("/welcome", free), "/privacy");
  assert.equal(nextStep("/mode", free), "/finish");
  assert.equal(previousStep("/finish", free), "/mode");
  assert.equal(nextStep("/mode", advanced), "/connect");
  assert.equal(previousStep("/finish", advanced), "/connect");
  assert.equal(nextStep("/finish", advanced), null);
});

test("setup steps unlock only after their required answers exist", () => {
  const blank = { name: "", mode: null };

  assert.equal(canReach("/welcome", blank), true);
  assert.equal(canReach("/profile", blank), true);
  assert.equal(canReach("/mode", blank), false);
  assert.equal(canReach("/mode", { name: "Ravi", mode: null }), true);
  assert.equal(canReach("/connect", free), false);
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
