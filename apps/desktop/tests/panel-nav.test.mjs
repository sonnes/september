import assert from "node:assert/strict";
import test from "node:test";

import { isSpaceModePath } from "../src/rules/panel-nav.ts";

test("the four space-mode paths of a space are space-mode paths", () => {
  assert.equal(isSpaceModePath("/spaces/amma/talk"), true);
  assert.equal(isSpaceModePath("/spaces/amma/notes"), true);
  assert.equal(isSpaceModePath("/spaces/amma/notes/shopping"), true);
  assert.equal(isSpaceModePath("/spaces/amma/agent"), true);
});

test("other paths are not space-mode paths", () => {
  assert.equal(isSpaceModePath("/spaces"), false);
  assert.equal(isSpaceModePath("/spaces/new"), false);
  assert.equal(isSpaceModePath("/spaces/amma"), false);
  assert.equal(isSpaceModePath("/spaces/amma/notes/a/b"), false);
  assert.equal(isSpaceModePath("/voice"), false);
  assert.equal(isSpaceModePath(null), false);
});
