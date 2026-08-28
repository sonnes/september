import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CLOSED_PANEL,
  PANEL_TABS,
  panelStateFrom,
  pressTab,
} from "../src/rules/panel.ts";

const desktopRoot = new URL("../", import.meta.url);
const readText = (path) => {
  const shared = path.match(/^src\/(blocks|layouts|pages)\/(.+)$/);
  const target = shared
    ? `../../packages/app-ui/${shared[1]}/${shared[2]}`
    : path;
  return readFile(new URL(target, desktopRoot), "utf8");
};

// ------------------------------------------------------------- the rules

test("the rail holds the phrases and the voice, in that order", () => {
  assert.deepEqual(
    PANEL_TABS.map((tab) => tab.key),
    ["phrases", "voice"],
  );
  assert.deepEqual(
    PANEL_TABS.map((tab) => tab.title),
    ["Phrases", "Voice"],
  );
});

test("the card starts closed, on the phrases", () => {
  assert.deepEqual(CLOSED_PANEL, { open: false, tab: "phrases" });
  assert.deepEqual(panelStateFrom(null), CLOSED_PANEL);
  assert.deepEqual(panelStateFrom(undefined), CLOSED_PANEL);
});

test("the answer given before the rail had tabs still opens the phrases", () => {
  // The setting held a boolean while Phrases was the only tab. A user who
  // left the card open must find it open.
  assert.deepEqual(panelStateFrom(true), { open: true, tab: "phrases" });
  assert.deepEqual(panelStateFrom(false), { open: false, tab: "phrases" });
});

test("the tab the user left comes back, open or closed", () => {
  assert.deepEqual(panelStateFrom({ open: true, tab: "voice" }), {
    open: true,
    tab: "voice",
  });
  assert.deepEqual(panelStateFrom({ open: false, tab: "voice" }), {
    open: false,
    tab: "voice",
  });
});

test("a tab that no longer exists opens the phrases", () => {
  // A retired tab must not leave the card empty.
  assert.deepEqual(panelStateFrom({ open: true, tab: "camera" }), {
    open: true,
    tab: "phrases",
  });
  assert.deepEqual(panelStateFrom("phrases"), CLOSED_PANEL);
  assert.deepEqual(panelStateFrom(7), CLOSED_PANEL);
});

test("a press opens a tab, and the open tab closes the card", () => {
  const closed = CLOSED_PANEL;
  const phrases = pressTab(closed, "phrases");
  assert.deepEqual(phrases, { open: true, tab: "phrases" });

  // Another tab moves the card. It does not close it.
  const voice = pressTab(phrases, "voice");
  assert.deepEqual(voice, { open: true, tab: "voice" });

  // The tab that is open closes the card and stays chosen.
  assert.deepEqual(pressTab(voice, "voice"), { open: false, tab: "voice" });

  // A closed card opens on the tab that was pressed.
  assert.deepEqual(pressTab({ open: false, tab: "voice" }, "phrases"), {
    open: true,
    tab: "phrases",
  });
});

// ------------------------------------------------------------ the screens

test("the rail draws every tab and keeps what the user left open", async () => {
  const panel = await readText("src/blocks/space-panel.tsx");
  const os = await readText("src/services/os.ts");

  // One rail, made from the rules, so a new tab is one row of data.
  assert.match(panel, /PANEL_TABS\.map/);
  assert.match(panel, /pressTab/);
  assert.match(panel, /<Phrases/);
  assert.match(panel, /<SpeechSettings/);
  assert.doesNotMatch(panel, /CameraSettings|useVirtualCamera/);

  // The state crosses a restart in the same setting as before.
  assert.match(os, /panelStateFrom/);
  assert.match(os, /key: "panel-open"/);

  // Talk and Notes each draw their own rail. The module holds what was
  // written, so a mode switch cannot take the card back to the tab the app
  // started on.
  assert.match(os, /export function currentPanel/);
  assert.match(panel, /useState\(currentPanel\)/);
});

test("both modes of a space draw the same rail", async () => {
  for (const page of ["src/pages/talk.tsx", "src/pages/notes.tsx"]) {
    const source = await readText(page);
    assert.match(source, /from "@september\/app-ui\/blocks\/space-panel"/, page);
    assert.match(source, /<PanelRail/, page);
  }
});

test("the rail holds the model and the sound, and nothing else", async () => {
  const settings = await readText("src/blocks/speech-settings.tsx");
  const voice = await readText("src/pages/voice.tsx");

  // The card asks the two questions a user asks while talking: which model,
  // and how it sounds. Both are heard in the next sentence.
  assert.match(settings, /Which model/);
  assert.match(settings, /How it sounds/);
  assert.match(settings, /saveSpeech\(/);

  // The Voice screen keeps neither of them.
  assert.doesNotMatch(voice, /How it sounds|<Slider/);
  assert.doesNotMatch(voice, /listModels/);
});

test("who speaks and which voice are on the Voice screen, not in the card", async () => {
  const settings = await readText("src/blocks/speech-settings.tsx");
  const voice = await readText("src/pages/voice.tsx");

  // The service is chosen once and rarely changed, and an account holds a
  // hundred voices, each one to be heard before it is chosen. Neither
  // question fits a 320px card beside a conversation.
  assert.doesNotMatch(settings, /Who speaks|RadioGroup/);
  assert.doesNotMatch(settings, /listVoices|Which voice/);
  assert.match(voice, /Who speaks/);
  assert.match(voice, /listVoices\(\)/);
  assert.match(voice, /Which voice/);
});

test("the model choice is in the card as well as beside the key", async () => {
  const settings = await readText("src/blocks/speech-settings.tsx");
  const keys = await readText("src/pages/settings.tsx");

  // The account key lists the models, so the choice stays with the key. The
  // card repeats it, because the sound of a message is the model as much as
  // the voice.
  assert.match(keys, /listModels/);
  assert.match(settings, /listModels/);
  assert.match(settings, /modelId/);
});
