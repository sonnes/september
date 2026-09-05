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
