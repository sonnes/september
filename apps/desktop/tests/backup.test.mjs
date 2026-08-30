import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PORTABLE_SETTING_KEYS } from "../../../packages/core/rules/backup.ts";
import { PANEL_TABS } from "../../../packages/core/rules/panel.ts";
import { PRESENT_TONES } from "../../../packages/core/rules/present.ts";
import { USAGE_EVENT_TYPES } from "../../../packages/core/rules/usage-summary.ts";

const desktopRoot = new URL("../", import.meta.url);
const readText = (path) => readFile(new URL(path, desktopRoot), "utf8");

/**
 * The values a `matches!` arm in the backend accepts.
 *
 * The Rust validator cannot import the shared rules, so it writes them out.
 * These tests hold the two copies together: a value added to a rule and not
 * to the backend would leave the desktop app refusing a valid backup from
 * the browser, and no round trip through the fixture would show it.
 */
function accepts(source, subject) {
  const start = source.indexOf(subject);
  assert.notEqual(start, -1, `the backend no longer tests ${subject}`);
  const after = start + subject.length;
  const arm = source.slice(after, source.indexOf(")", after));
  return [...arm.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function named(source, opening, closing) {
  const start = source.indexOf(opening);
  assert.notEqual(start, -1, `the backend no longer holds ${opening}`);
  const after = start + opening.length;
  const block = source.slice(after, source.indexOf(closing, after));
  return [...block.matchAll(/["']([a-z0-9-]+)["']/g)].map((match) => match[1]);
}

test("the backend accepts the panel tabs the shared rule defines", async () => {
  const backend = await readText("src-tauri/src/repository.rs");
  const tabs = PANEL_TABS.map((tab) => tab.key);

  assert.deepEqual(accepts(backend, "contents.settings.panel.tab.as_str(),"), tabs);
  // The export path repairs a retired tab against the same list.
  assert.deepEqual(accepts(backend, "panel.tab.as_str(),"), tabs);
});

test("the backend accepts the presentation tones the shared rule defines", async () => {
  const backend = await readText("src-tauri/src/repository.rs");

  assert.deepEqual(
    accepts(backend, "contents.settings.present.tone.as_str(),"),
    PRESENT_TONES.map((tone) => tone.key),
  );
});

test("the backend accepts the usage events the shared rule defines", async () => {
  const backend = await readText("src-tauri/src/repository.rs");

  assert.deepEqual(accepts(backend, "event.event_type.as_str(),"), [
    ...USAGE_EVENT_TYPES,
  ]);
});

test("one list names the settings a restore replaces", async () => {
  const backend = await readText("src-tauri/src/repository.rs");
  const rpc = await readText("src-tauri/src/rpc.rs");
  const keys = [...PORTABLE_SETTING_KEYS];

  // Erased, written again, and announced: three copies of one list. A key
  // missing from the erasure survives a replacement; a key missing from the
  // write is lost by one.
  assert.deepEqual(
    named(backend, "DELETE FROM settings WHERE key IN (", ")").sort(),
    [...keys].sort(),
  );
  assert.deepEqual(
    named(backend, "let mut settings = vec![", "transaction.commit()").sort(),
    [...keys].sort(),
  );
  assert.deepEqual(named(rpc, "SettingsChanged {\n            keys: [", "]").sort(), [
    ...keys,
  ].sort());
});
