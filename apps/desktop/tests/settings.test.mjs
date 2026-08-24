import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { DEFAULT_DRAFT } from "../src/rules/onboarding.ts";
import {
  CONNECTION_GUIDES,
  sectionFor,
  SETTINGS_NAV,
} from "../src/rules/settings-nav.ts";

const desktopRoot = new URL("../", import.meta.url);
const readText = (path) => {
  const shared = path.match(/^src\/(blocks|layouts|pages)\/(.+)$/);
  const target = shared
    ? `../../packages/app-ui/${shared[1]}/${shared[2]}`
    : path;
  return readFile(new URL(target, desktopRoot), "utf8");
};

test("every settings section has a route", async () => {
  const main = await readText("src/main.tsx");

  assert.deepEqual(
    SETTINGS_NAV.map((item) => item.path),
    ["/settings", "/settings/writing", "/settings/usage"],
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
  assert.equal(sectionFor("/settings/usage").title, "Usage");
});

test("the setup screen lists the services and nothing else", async () => {
  const settings = await readText("src/pages/settings.tsx");

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
  const settings =
    (await readText("src/pages/settings.tsx")) +
    (await readText("src/layouts/settings.tsx"));

  assert.doesNotMatch(settings, /@tauri-apps\/api/);
  assert.doesNotMatch(settings, /localStorage|sessionStorage/);
});

test("setup and settings share one key panel", async () => {
  for (const file of ["src/pages/steps.tsx", "src/pages/settings.tsx"]) {
    assert.match(
      await readText(file),
      /from "@september\/app-ui\/blocks\/services"/,
      file,
    );
  }
  assert.match(await readText("src/blocks/services.tsx"), /export function KeyPanel/);
});

test("every settings section stays open", async () => {
  const settings = await readText("src/layouts/settings.tsx");

  assert.doesNotMatch(settings, /aria-expanded/);
  assert.doesNotMatch(settings, /Collapsible/);
});

test("an address opens in the browser, through os.ts", async () => {
  const capability = JSON.parse(await readText("src-tauri/capabilities/default.json"));

  assert.ok(capability.permissions.includes("shell:allow-open"));
  assert.match(await readText("src/services/os.ts"), /@tauri-apps\/plugin-shell/);
  assert.doesNotMatch(await readText("src/pages/settings.tsx"), /plugin-shell/);
});

test("the writing service knows what setup collected", async () => {
  // The speaking style and the personal words were collected and never read.
  assert.match(await readText("src/services/ai.ts"), /export function userContext/);
  assert.match(await readText("src/blocks/suggestions.tsx"), /globalMd: userContext\(\)/);
});

test("the model choice sits beside the key that lists it", async () => {
  const settings = await readText("src/pages/settings.tsx");
  const card = await readText("src/blocks/speech-settings.tsx");

  // A model list arrives only with a key, so the choice belongs on the
  // screen that holds the key. The card of the rail repeats it, where the
  // sound of a message is judged.
  assert.match(settings, /listModels/);
  assert.match(settings, /label="Search models"/);
  assert.match(card, /label="Search models"/);
});

test("the OpenRouter model sits beside its key too", async () => {
  const settings = await readText("src/pages/settings.tsx");
  const os = await readText("src/services/os.ts");
  const ai = await readText("src/services/ai.ts");

  assert.match(os, /export const listWritingModels/);
  assert.match(settings, /listWritingModels/);
  // The writing service reads the choice, so a request names one model.
  assert.match(ai, /writingModel/);
});

test("no chosen writing model means the free list of the app", () => {
  // An empty answer keeps the failover: the first free model that answers
  // writes the suggestion.
  assert.equal(DEFAULT_DRAFT.writingModel, "");
});

test("a settings screen draws with no saved setup", async () => {
  const settings = await readText("src/pages/settings.tsx");

  // `pnpm dev` runs the UI in a browser, where no Tauri backend answers and
  // `currentSetup()` is null. The screen must draw the defaults there.
  assert.match(settings, /currentSetup\(\) \?\? DEFAULT_DRAFT/);
  assert.doesNotMatch(settings, /setup!/);
});
