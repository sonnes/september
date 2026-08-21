import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CONNECTION_GUIDES,
  sectionFor,
  SETTINGS_NAV,
} from "../src/settings-nav.ts";

const desktopRoot = new URL("../", import.meta.url);
const readText = (path) => readFile(new URL(path, desktopRoot), "utf8");

test("every settings section has a route", async () => {
  const main = await readText("src/main.tsx");

  assert.deepEqual(
    SETTINGS_NAV.map((item) => item.path),
    ["/settings", "/settings/writing"],
  );
  // A child route holds the tail of its address, under the settings layout.
  assert.match(main, /path: "\/settings",\n  component: SettingsLayout/);
  for (const item of SETTINGS_NAV) {
    const tail = item.path.slice("/settings".length) || "/";
    assert.match(main, new RegExp(`path: "${tail}"`), item.path);
  }
  assert.match(main, /path: "\/connections\/\$provider"/);
});

test("Setup stays the open section while a key is added", () => {
  assert.equal(sectionFor("/settings").title, "Setup");
  assert.equal(sectionFor("/settings/connections/openrouter").title, "Setup");
  assert.equal(sectionFor("/settings/writing").title, "Writing help");
});

test("the setup screen lists the services and nothing else", async () => {
  const settings = await readText("src/settings.tsx");

  // The mode is an answer of the setup steps. This screen shows only the
  // services, so a user changes a key here and nothing more.
  assert.doesNotMatch(settings, /ModeCard|SETUP_MODES|SetupMode/);
  assert.match(settings, /title="Connections"/);
});

test("each cloud service has a guide and an address", () => {
  for (const provider of ["openrouter", "elevenlabs"]) {
    const guide = CONNECTION_GUIDES[provider];
    assert.ok(guide.lede.length > 0, provider);
    assert.ok(guide.steps.length > 0, provider);
    assert.match(guide.url, /^https:\/\//, provider);
  }
});

test("the settings screens hold no key and no command", async () => {
  const settings = await readText("src/settings.tsx");

  assert.doesNotMatch(settings, /@tauri-apps\/api/);
  assert.doesNotMatch(settings, /localStorage|sessionStorage/);
});

test("setup and settings share one key panel", async () => {
  for (const file of ["src/steps.tsx", "src/settings.tsx"]) {
    assert.match(await readText(file), /from "\.\/services"/, file);
  }
  assert.match(await readText("src/services.tsx"), /export function KeyPanel/);
});

test("every settings section stays open", async () => {
  const settings = await readText("src/settings.tsx");

  assert.doesNotMatch(settings, /aria-expanded/);
  assert.doesNotMatch(settings, /Collapsible/);
});

test("an address opens in the browser, through os.ts", async () => {
  const capability = JSON.parse(await readText("src-tauri/capabilities/default.json"));

  assert.ok(capability.permissions.includes("shell:allow-open"));
  assert.match(await readText("src/os.ts"), /@tauri-apps\/plugin-shell/);
  assert.doesNotMatch(await readText("src/settings.tsx"), /plugin-shell/);
});

test("the writing service knows what setup collected", async () => {
  // The speaking style and the personal words were collected and never read.
  assert.match(await readText("src/ai.ts"), /export function userContext/);
  assert.match(await readText("src/suggestions.tsx"), /globalMd: userContext\(\)/);
});
