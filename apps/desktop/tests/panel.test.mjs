import assert from "node:assert/strict";
import test from "node:test";

import { CLOSED_PANEL, panelStateFrom, pressTab } from "../src/rules/panel.ts";

test("the card starts closed, on the phrases", () => {
  assert.deepEqual(CLOSED_PANEL, { open: false, tab: "phrases" });
  assert.deepEqual(panelStateFrom(null), CLOSED_PANEL);
  assert.deepEqual(panelStateFrom(undefined), CLOSED_PANEL);
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
