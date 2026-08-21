import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { APP_NAV, BASE_VIEWPORT_WIDTH, isCompactWidth } from "../src/app-nav.ts";
import {
  deleteLastWord,
  filterSpaces,
  newSpaceTitle,
  spaceFromSlug,
  spaceSlug,
  timeAgo,
  transcriptPage,
} from "../src/spaces.ts";
import {
  canReach,
  isSetupDone,
  nextStep,
  previousStep,
  STEPS,
  stepsFor,
} from "../src/onboarding.ts";

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
  assert.equal(packageJson.scripts["tauri:dev"], "node scripts/tauri.mjs dev");
  assert.equal(packageJson.scripts["tauri:build"], "node scripts/tauri.mjs build");
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

const free = { name: "Ravi", mode: "free" };
const advanced = { name: "Ravi", mode: "advanced" };

test("each onboarding step has its own route", () => {
  assert.deepEqual(
    STEPS.map((step) => step.path),
    ["/welcome", "/profile", "/mode", "/connect", "/finish"],
  );
});

test("only advanced setup walks through the connect step", () => {
  const paths = (draft) => stepsFor(draft).map((step) => step.path);

  assert.deepEqual(paths(free), ["/welcome", "/profile", "/mode", "/finish"]);
  assert.deepEqual(paths({ name: "", mode: null }), paths(free));
  assert.deepEqual(paths(advanced), STEPS.map((step) => step.path));
});

test("steps move in order", () => {
  assert.equal(nextStep("/welcome", free), "/profile");
  assert.equal(nextStep("/finish", free), null);
  assert.equal(previousStep("/welcome", free), null);

  // Free setup jumps the connect step in both directions.
  assert.equal(nextStep("/mode", free), "/finish");
  assert.equal(previousStep("/finish", free), "/mode");

  assert.equal(nextStep("/mode", advanced), "/connect");
  assert.equal(nextStep("/connect", advanced), "/finish");
  assert.equal(previousStep("/finish", advanced), "/connect");
});

test("a step opens only after its required answers exist", () => {
  const blank = { name: "", mode: null };

  assert.equal(canReach("/welcome", blank), true);
  assert.equal(canReach("/profile", blank), true);
  assert.equal(canReach("/mode", blank), false);
  assert.equal(canReach("/mode", { name: "   ", mode: null }), false);
  assert.equal(canReach("/mode", { name: "Ravi", mode: null }), true);
  assert.equal(canReach("/finish", { name: "Ravi", mode: null }), false);
  assert.equal(canReach("/finish", free), true);

  // Only the advanced mode owns a key, so only it can open the connect step.
  assert.equal(canReach("/connect", { name: "Ravi", mode: null }), false);
  assert.equal(canReach("/connect", free), false);
  assert.equal(canReach("/connect", advanced), true);
});

test("the draft carries a service choice, never a key", async () => {
  const onboarding = await readText("src/onboarding.ts");

  assert.match(onboarding, /writingService/);
  assert.match(onboarding, /voiceService/);
  assert.doesNotMatch(onboarding, /apiKey|secret|Key:/i);
});

test("the UI uses shadcn primitives", async () => {
  const components = await readJson("components.json");

  assert.equal(components.tailwind.css, "src/styles.css");
  assert.equal(components.aliases.ui, "@/components/ui");

  for (const name of ["button", "input", "textarea", "label"]) {
    assert.match(
      await readText(`src/components/ui/${name}.tsx`),
      /export/,
      `${name} primitive is missing`,
    );
  }

  const steps = await readText("src/steps.tsx");
  assert.match(steps, /from "@\/components\/ui\/button"/);
  assert.doesNotMatch(steps, /PRIMARY_BUTTON/);
});

test("the brand and the step numbers live in a sidebar", async () => {
  const app = await readText("src/app.tsx");

  assert.match(app, /<aside/);
  assert.doesNotMatch(app, /<header/);
});

test("every section stays open", async () => {
  const steps = await readText("src/steps.tsx");

  assert.doesNotMatch(steps, /aria-expanded/);
  assert.doesNotMatch(steps, /showPersonalWords/);
});

test("each control has one label, and no label repeats its section title", async () => {
  const steps = await readText("src/steps.tsx");
  const value = (match) => match.split('"')[1];
  const ids = (steps.match(/\bid="onboarding-[a-z-]+"/g) ?? []).map(value);
  const labelled = (steps.match(/\bhtmlFor="onboarding-[a-z-]+"/g) ?? []).map(value);

  // Field owns the only Label, so a section title cannot repeat above a control.
  assert.equal((steps.match(/<Label/g) ?? []).length, 1);
  assert.match(steps, /htmlFor=\{htmlFor\}/);
  assert.deepEqual([...ids].sort(), [...labelled].sort());
  assert.equal(ids.length, 3);
});

test("the profile name starts from the operating-system name", async () => {
  assert.match(
    await readText("src-tauri/src/lib.rs"),
    /rpc::user_name/,
    "the backend must expose the name",
  );
  assert.match(await readText("src/os.ts"), /invoke<string>\("user_name"\)/);

  const packageJson = await readJson("package.json");
  assert.ok(packageJson.dependencies["@tauri-apps/api"]);

  // The draft starts with the name, so no effect races the first render.
  assert.match(await readText("src/app.tsx"), /name: osName/);
});

test("the Rust backend owns the private apfel sidecar", async () => {
  const cargo = await readText("src-tauri/Cargo.toml");
  const lib = await readText("src-tauri/src/lib.rs");
  const rpc = await readText("src-tauri/src/rpc.rs");
  const apfelConfig = await readJson("src-tauri/tauri.apfel.conf.json");
  const packageJson = await readJson("package.json");

  assert.match(cargo, /tauri-plugin-shell/);
  assert.match(cargo, /reqwest/);
  assert.deepEqual(apfelConfig.bundle.externalBin, ["binaries/apfel"]);
  assert.deepEqual(apfelConfig.bundle.resources, ["third-party/apfel-LICENSE"]);
  assert.match(await readText("src-tauri/third-party/apfel-LICENSE"), /MIT License/);
  assert.match(packageJson.scripts["apfel:prepare"], /prepare-apfel\.mjs/);
  assert.match(packageJson.scripts["tauri:dev"], /scripts\/tauri\.mjs dev/);
  assert.match(packageJson.scripts["tauri:build"], /scripts\/tauri\.mjs build/);
  assert.match(lib, /tauri_plugin_shell::init\(\)/);
  assert.match(lib, /rpc::apfel_status/);
  assert.match(lib, /rpc::apfel_generate/);
  assert.match(rpc, /ApfelState/);
});

test("the connect step asks by job and keeps keys out of the UI", async () => {
  const steps = await readText("src/steps.tsx");
  const os = await readText("src/os.ts");
  const lib = await readText("src-tauri/src/lib.rs");

  assert.match(steps, /export function ConnectStep/);
  assert.match(await readText("src/main.tsx"), /ConnectStep/);
  assert.match(steps, /RadioGroup/, "a job is a choice between services");

  // Only os.ts talks to Rust, so no component can hold a key.
  assert.doesNotMatch(steps, /\binvoke\b/);
  assert.doesNotMatch(steps, /localStorage|sessionStorage/);

  for (const command of [
    "provider_status",
    "provider_connect",
    "provider_forget",
    "provider_voices",
  ]) {
    assert.match(lib, new RegExp(`rpc::${command}\\b`), `${command} is not registered`);
    assert.match(os, new RegExp(`"${command}"`), `${command} has no bridge`);
  }
});

test("a choice keeps its height when it is selected", async () => {
  const steps = await readText("src/steps.tsx");
  const choice = steps.slice(steps.indexOf("function Choice("));

  // Selection changes the border only. A panel that appears on selection would
  // grow the card and push every choice below it down the page.
  assert.match(choice, /\{children\}/);
  assert.doesNotMatch(choice, /\{children && /);
  assert.doesNotMatch(steps, /selected && <KeyPanel/);
});

test("each service wears its own mark", async () => {
  const steps = await readText("src/steps.tsx");

  assert.match(steps, /function Mark\(/);
  assert.match(steps, /elevenlabs-mark\.svg/);
  assert.match(steps, /openrouter-mark\.svg/);

  // Each mark is the brand's own asset, not a redrawing of it.
  assert.match(
    await readText("public/elevenlabs-mark.svg"),
    /M468 292H528V584H468V292Z/,
    "ElevenLabs symbol, from elevenlabs.io/brand",
  );
  assert.match(
    await readText("public/openrouter-mark.svg"),
    /#7624F4/,
    "OpenRouter glyph, from openrouter.ai/brand/v2",
  );

  // The Apple logo is the U+F8FF glyph from the macOS system font, so the app
  // bundles no Apple asset. `system-ui` in the font stack carries it.
  assert.match(steps, /\\uF8FF|/, "Apple Intelligence wears the Apple logo");
  assert.match(await readText("src/styles.css"), /system-ui/);
});

test("the sidebar is an inset card like the step surface", async () => {
  const app = await readText("src/app.tsx");
  const shell = app.match(/<div className="([^"]*h-dvh[^"]*)"/)[1];
  const aside = app.match(/<aside className="([^"]*)"/)[1];
  const main = app.match(/<main className="([^"]*)"/)[1];

  // Both panels float on the page, so the page owns the inset and the gap.
  assert.match(shell, /\bp-2\b/);
  assert.match(shell, /\bgap-2\b/);
  for (const card of ["rounded-xl", "shadow-sm"]) {
    assert.ok(aside.includes(card), `sidebar needs ${card}`);
    assert.ok(main.includes(card), `step surface needs ${card}`);
  }
});

test("the welcome markers stay inside the scrolling step body", async () => {
  const steps = await readText("src/steps.tsx");
  const list = steps.match(/<ol className="([^"]*)"/)[1];
  const hang = Number(steps.match(/-left-\[([\d.]+)rem\]/)[1]) * 16;
  const space = (prefix) => {
    const found = list.match(new RegExp(`\\b${prefix}-(\\d+)\\b`));
    return found ? Number(found[1]) * 4 : 0;
  };

  // The body scrolls, so overflow-x clips at the list edge. The marker hangs
  // left of that edge, and only the list margin can give it room.
  const escapes = hang - 1 - space("pl");
  assert.ok(
    space("ml") >= escapes,
    `marker escapes ${escapes}px, list insets ${space("ml")}px`,
  );
});

test("the app layout keeps the sidebar beside an inset surface", async () => {
  const shell = await readText("src/shell.tsx");

  assert.match(shell, /SidebarProvider/);
  assert.match(shell, /<AppSidebar\b/);
  assert.match(shell, /SidebarInset/);
  assert.match(shell, /variant="inset"/);
  assert.match(shell, /collapsible="icon"/);
  // A definite viewport height, so the body scrolls and the shell does not.
  assert.match(shell, /h-svh/);
});

test("the app sidebar starts as a rail at the 13-inch iPad baseline", async () => {
  assert.equal(BASE_VIEWPORT_WIDTH, 1376);
  assert.ok(isCompactWidth(1376), "the baseline itself is compact");
  assert.ok(!isCompactWidth(1377), "a wider screen opens the full sidebar");

  const shell = await readText("src/shell.tsx");
  assert.match(shell, /defaultOpen=\{!isCompact\}/);
});

test("every app destination has a route and an icon", async () => {
  const main = await readText("src/main.tsx");
  const shell = await readText("src/shell.tsx");

  assert.ok(APP_NAV.length > 0);
  for (const item of APP_NAV) {
    assert.match(main, new RegExp(`"${item.path}"`), `${item.path} needs a route`);
    assert.match(shell, new RegExp(`"${item.path}":`), `${item.path} needs an icon`);
  }
});

test("setup and the app are separate layouts", async () => {
  const main = await readText("src/main.tsx");

  // The root route holds an outlet only, so a step never wears the app
  // sidebar and an app screen never wears the setup sidebar.
  assert.doesNotMatch(main, /createRootRoute\(\{\s*component: OnboardingLayout/);
  assert.match(main, /OnboardingLayout/);
  assert.match(main, /AppShell/);
  assert.match(main, /id: "setup"/);
  assert.match(main, /id: "app"/);
});

test("both sidebars show the published brand mark", async () => {
  const brand = await readText("src/brand.tsx");

  assert.match(brand, /"\/logo\.svg"/, "the mark comes from the published file");
  for (const file of ["src/app.tsx", "src/shell.tsx"]) {
    assert.match(await readText(file), /BrandMark/, `${file} needs the mark`);
  }
});

test("the app sidebar stays indigo, in the shadcn tokens", async () => {
  const styles = await readText("src/styles.css");

  assert.match(styles, /--sidebar:\s*var\(--color-indigo-500\)/);
  assert.match(styles, /--sidebar-foreground:\s*var\(--color-white\)/);
  assert.match(styles, /--sidebar-border:\s*var\(--color-indigo-400\)/);
  // The app is light only, so no theme block and no raw hsl values.
  assert.doesNotMatch(styles, /^\.dark\b/m);
  assert.doesNotMatch(styles, /hsl\(/);
});

test("setup ends inside the app layout", async () => {
  const steps = await readText("src/steps.tsx");

  assert.match(steps, new RegExp(`to: "${APP_NAV[0].path}"`));
});

test("setup is done once it has a name and a mode", () => {
  assert.ok(!isSetupDone(null), "a fresh install has no setup");
  assert.ok(!isSetupDone({ name: "  ", mode: "free" }), "a name is required");
  assert.ok(!isSetupDone({ name: "Ravi", mode: null }), "a mode is required");
  assert.ok(isSetupDone({ name: "Ravi", mode: "free" }));
  assert.ok(isSetupDone({ name: "Ravi", mode: "advanced" }));
});

test("the launch route sends a finished setup to the app", async () => {
  const main = await readText("src/main.tsx");

  assert.match(main, /isSetupDone\(currentSetup\(\)\)/);
  assert.match(main, /"\/dashboard"/);
  assert.match(main, /"\/welcome"/);
});

test("an app screen turns an unfinished setup back to the start", async () => {
  const main = await readText("src/main.tsx");
  const appLayout = main.match(/id: "app",[\s\S]*?\n\}\);/)[0];

  assert.match(appLayout, /beforeLoad/);
  assert.match(appLayout, /isSetupDone/);
  assert.match(appLayout, /to: "\/welcome"/);
});

test("setup keeps its answers before it opens the app", async () => {
  const os = await readText("src/os.ts");
  const steps = await readText("src/steps.tsx");

  // One setting holds the finished setup, and the module keeps the value it
  // wrote, so the guard right after setup reads the new answers.
  assert.match(os, /key: "setup"/);
  assert.match(os, /export function currentSetup/);
  assert.match(os, /export async function saveSetup/);
  assert.match(steps, /saveSetup\(draft\)/);
});

test("the brand and the nav icons share one left edge", async () => {
  const shell = await readText("src/shell.tsx");
  const brand = shell.match(/aria-label="September"\s+className="([^"]*)"/)[1];

  // `SidebarHeader` and `SidebarGroup` both inset by 8px, so the brand and
  // the nav buttons line up. Extra padding on either one breaks the edge.
  assert.match(shell, /<SidebarGroup>/);
  assert.doesNotMatch(brand, /\bp[xl]?-\d/, `brand row adds padding: ${brand}`);
});

// ------------------------------------------------------- spaces and Talk

test("a space slug carries no identifier", () => {
  assert.equal(spaceSlug("School — Homework Help"), "school-homework-help");
  assert.equal(spaceSlug("General"), "general");
  assert.equal(spaceSlug(""), "space");
  assert.equal(spaceSlug(undefined), "space");
});

test("a slug finds its space, or nothing", () => {
  const spaces = [
    { id: "a", title: "General" },
    { id: "b", title: "Homework Help" },
  ];

  assert.equal(spaceFromSlug("homework-help", spaces)?.id, "b");
  assert.equal(spaceFromSlug("general", spaces)?.id, "a");
  assert.equal(spaceFromSlug("gone", spaces), undefined);
});

test("the first space is General, and no two spaces share a slug", () => {
  assert.equal(newSpaceTitle([]), "General");
  assert.equal(newSpaceTitle(["General"]), "New space");
  assert.equal(newSpaceTitle(["General", "New space"]), "New space 2");
  assert.equal(newSpaceTitle(["General", "New space", "New space 2"]), "New space 3");
});

test("search keeps the spaces whose title holds the words", () => {
  const spaces = [
    { id: "a", title: "Doctor Ramesh" },
    { id: "b", title: "Homework Help" },
    { id: "c" },
  ];

  assert.deepEqual(filterSpaces(spaces, "").length, 3);
  assert.deepEqual(filterSpaces(spaces, "  ").length, 3);
  assert.deepEqual(filterSpaces(spaces, "doctor").map((s) => s.id), ["a"]);
  assert.deepEqual(filterSpaces(spaces, "HELP").map((s) => s.id), ["b"]);
  assert.deepEqual(filterSpaces(spaces, "nothing"), []);
});

test("the list says when a space last changed", () => {
  const now = Date.UTC(2026, 7, 21, 12, 0, 0);
  const ago = (seconds) => timeAgo(now - seconds * 1000, now);

  assert.equal(ago(20), "20 seconds ago");
  assert.equal(ago(90), "1 minute ago");
  assert.equal(ago(130), "2 minutes ago");
  assert.equal(ago(7200), "2 hours ago");
  assert.equal(ago(86400 * 3), "3 days ago");
  assert.equal(ago(86400 * 400), "last year");
});

test("deleting a space asks first, because the messages go with it", async () => {
  const talk = await readText("src/talk.tsx");

  assert.match(talk, /AlertDialog/);
  assert.match(talk, /cannot undo/);
  assert.match(talk, /variant="destructive"/);
  // The delete button opens the dialog. It must not delete on its own.
  assert.doesNotMatch(talk, /onClick=\{\(\) => deleteSpace\.mutate/);
});

test("the list has a search field", async () => {
  const talk = await readText("src/talk.tsx");

  assert.match(talk, /filterSpaces/);
  assert.match(talk, /aria-label="Search spaces"/);
});

test("the transcript pages newest first", () => {
  const rows = Array.from({ length: 20 }, (_, i) => i);

  const newest = transcriptPage(rows, 0, 8);
  assert.equal(newest.pageCount, 3);
  assert.deepEqual(newest.slice, [12, 13, 14, 15, 16, 17, 18, 19]);

  // The oldest page holds the remainder, and a page past the end clamps.
  assert.deepEqual(transcriptPage(rows, 2, 8).slice, [0, 1, 2, 3]);
  assert.equal(transcriptPage(rows, 9, 8).page, 2);
  assert.equal(transcriptPage([], 0, 8).pageCount, 1);
});

test("the composer drops one word at a time", () => {
  assert.equal(deleteLastWord("I want some water"), "I want some ");
  assert.equal(deleteLastWord("I want some water   "), "I want some ");
  assert.equal(deleteLastWord("water"), "");
  assert.equal(deleteLastWord(""), "");
});

test("the user id is the login name of the operating system", async () => {
  const os = await readText("src/os.ts");
  const rpc = await readText("src-tauri/src/rpc.rs");

  assert.match(rpc, /pub\(crate\) fn user_id/);
  assert.match(rpc, /whoami::fallible::username/);
  assert.match(os, /invoke<string>\("user_id"\)/);
  assert.match(os, /export function currentUserId/);
});

test("setup freezes the user id, so a later read cannot move the spaces", async () => {
  const os = await readText("src/os.ts");
  const saveSetup = os.match(/export async function saveSetup[\s\S]*?\n\}/)[0];

  // The identifier goes into the setup setting one time. `currentUserId`
  // prefers that value over a new read of the operating system.
  assert.match(saveSetup, /id: osUser/);
  assert.match(os, /currentSetup\(\)\?\.id \?\? osUser/);
});

test("only data.ts and os.ts talk to Rust", async () => {
  const files = ["src/talk.tsx", "src/speech.ts", "src/player.ts", "src/voice.tsx"];
  for (const file of files) {
    assert.doesNotMatch(await readText(file), /@tauri-apps\/api/, file);
  }
});

test("the system voice speaks in the WebView, with no key and no Rust", async () => {
  const speech = await readText("src/speech.ts");

  assert.match(speech, /speechSynthesis/);
  assert.match(speech, /SpeechSynthesisUtterance/);
});

test("spaces and messages read through TanStack Query", async () => {
  const packageJson = await readJson("package.json");
  const data = await readText("src/data.ts");
  const main = await readText("src/main.tsx");

  assert.ok(packageJson.dependencies["@tanstack/react-query"]);
  assert.match(main, /QueryClientProvider/);
  assert.match(data, /queryKey: \["spaces"\]/);
  assert.match(data, /"space_list"/);
  assert.match(data, /"message_list"/);
  assert.match(data, /"message_put"/);
});

test("a failed command carries a message the screen can show", async () => {
  const data = await readText("src/data.ts");

  // Tauri rejects with a string, so `error.message` would be empty. One
  // wrapper turns every rejection into an Error.
  assert.match(data, /function call</);
  assert.match(data, /new Error\(String\(reason\)\)/);
  assert.equal(data.match(/invoke</g)?.length, 1, "every command goes through call()");
});

test("Talk is a route inside a space", async () => {
  const main = await readText("src/main.tsx");

  assert.match(main, /"\/spaces\/\$slug\/talk"/);
  assert.match(main, /SpacesScreen/);
  assert.match(main, /TalkScreen/);
});

// --------------------------------------------------------- voice and audio

test("a voice file is named for the settings and the words", async () => {
  const rust = await readText("src-tauri/src/speech.rs");

  assert.match(rust, /Sha256::digest/);
  assert.match(rust, /split_whitespace/);
  // Three decimal places, so 0.5 and 0.50 give one name.
  assert.match(rust, /\{:\.3\}\|\{:\.3\}\|\{:\.3\}/);
});

test("the audio file reaches the WebView through the asset protocol", async () => {
  const os = await readText("src/os.ts");
  const config = await readJson("src-tauri/tauri.conf.json");

  assert.match(os, /convertFileSrc/);
  assert.equal(config.app.security.assetProtocol.enable, true);
  assert.deepEqual(config.app.security.assetProtocol.scope, ["$APPLOCALDATA/audio/*"]);
});

test("the player holds one sound at a time", async () => {
  const player = await readText("src/player.ts");

  assert.match(player, /export function play/);
  assert.match(player, /export function stop/);
  // A new sound stops the sound before it.
  assert.match(player, /stop\(\);/);
});

test("every voice meets one interface", async () => {
  const speech = await readText("src/speech.ts");

  assert.match(speech, /interface SpeechProvider/);
  assert.match(speech, /id: "system"/);
  assert.match(speech, /id: "elevenlabs"/);
  assert.match(speech, /export function providerFor/);
});

test("the cloud voice falls back to the system voice", async () => {
  const speech = await readText("src/speech.ts");
  const cloud = speech.match(/const cloudVoice[\s\S]*?\n\}\);/)[0];

  // A person who cannot speak must not meet silence.
  assert.match(cloud, /catch/);
  assert.match(cloud, /systemVoice\(settings\)\.speak\(text\)/);
});

test("the speech settings hold everything that shapes the sound", async () => {
  const speech = await readText("src/speech.ts");
  const defaults = speech.match(/DEFAULT_SPEECH[\s\S]*?\};/)[0];

  for (const key of ["provider", "voiceId", "modelId", "stability", "similarity", "speed"]) {
    assert.match(defaults, new RegExp(`\\b${key}:`), key);
  }
});

test("the Voice screen keeps its choices in one setting", async () => {
  const os = await readText("src/os.ts");
  const main = await readText("src/main.tsx");

  assert.match(os, /key: "speech"/);
  assert.match(os, /export function currentSpeech/);
  assert.match(main, /VoiceScreen/);
});

test("a message keeps no audio path", async () => {
  const data = await readText("src/data.ts");

  assert.doesNotMatch(data, /audio_path/);
});
