import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { canReach, nextStep, previousStep, STEPS } from "../src/onboarding.ts";

const desktopRoot = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, desktopRoot), "utf8"));
}

async function readText(path) {
  return readFile(new URL(path, desktopRoot), "utf8");
}

test("desktop is an independent pnpm app", async () => {
  const packageJson = await readJson("package.json");

  assert.equal(packageJson.name, "@september/desktop");
  assert.equal(packageJson.scripts.dev, "vite");
  assert.equal(packageJson.scripts.build, "tsc --noEmit && vite build");
  assert.equal(packageJson.scripts["tauri:dev"], "tauri dev");
  assert.equal(packageJson.scripts["tauri:build"], "tauri build");
});

test("Tauri opens the independent UI at the 13-inch iPad baseline", async () => {
  const config = await readJson("src-tauri/tauri.conf.json");
  const [mainWindow] = config.app.windows;

  assert.equal(config.build.beforeDevCommand, "pnpm dev");
  assert.equal(config.build.beforeBuildCommand, "pnpm build");
  assert.equal(config.build.devUrl, "http://localhost:3010");
  assert.equal(config.build.frontendDist, "../dist");
  assert.equal(mainWindow.url, "/");
  assert.equal(mainWindow.width, 1376);
  assert.equal(mainWindow.height, 1032);
  assert.match(config.app.security.csp, /localhost:3010/);
  assert.doesNotMatch(config.app.security.csp, /localhost:3009/);
});

test("the macOS bundle declares its recording privacy reasons", async () => {
  const plist = await readText("src-tauri/Info.plist");

  assert.match(plist, /NSMicrophoneUsageDescription/);
  assert.match(plist, /NSCameraUsageDescription/);
});

test("the UI builds with Tailwind and the router", async () => {
  const packageJson = await readJson("package.json");

  assert.ok(packageJson.dependencies["@tanstack/react-router"]);
  assert.ok(packageJson.devDependencies["@tailwindcss/vite"]);
  assert.match(await readText("vite.config.ts"), /tailwindcss\(\)/);
  assert.match(await readText("src/styles.css"), /@import "tailwindcss"/);
});

test("each onboarding step has its own route", () => {
  assert.deepEqual(
    STEPS.map((step) => step.path),
    ["/welcome", "/profile", "/mode", "/finish"],
  );
});

test("steps move in order", () => {
  assert.equal(nextStep("/welcome"), "/profile");
  assert.equal(nextStep("/mode"), "/finish");
  assert.equal(nextStep("/finish"), null);
  assert.equal(previousStep("/welcome"), null);
  assert.equal(previousStep("/finish"), "/mode");
});

test("a step opens only after its required answers exist", () => {
  const blank = { name: "", mode: null };

  assert.equal(canReach("/welcome", blank), true);
  assert.equal(canReach("/profile", blank), true);
  assert.equal(canReach("/mode", blank), false);
  assert.equal(canReach("/mode", { name: "   ", mode: null }), false);
  assert.equal(canReach("/mode", { name: "Ravi", mode: null }), true);
  assert.equal(canReach("/finish", { name: "Ravi", mode: null }), false);
  assert.equal(canReach("/finish", { name: "Ravi", mode: "free" }), true);
});
