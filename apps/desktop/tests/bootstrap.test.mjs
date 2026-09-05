import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import {
  APP_NAV,
  BASE_VIEWPORT_WIDTH,
  isCompactWidth,
  openingPath,
} from "../src/rules/app-nav.ts";
import {
  decidePhraseSync,
  dedupeAgainstPinned,
  generateCode,
  isCommonWord,
  isKept,
  matchCode,
  mineShortcuts,
  normalizeMinedText,
  pinnedPhrase,
  sanitizeStarters,
  topPhrases,
  topRows,
  trailingWord,
  validateCode,
} from "../src/rules/phrases.ts";
import {
  appendTokens,
  boardPhrases,
  codeExpansionText,
  composeSuggestions,
  joinTokens,
  stripeForText,
  stripePhrases,
  tileScale,
  TILE_SCALE_MIN,
  tokenize,
} from "../src/rules/stripes.ts";
import {
  composerAction,
  deleteLastWord,
  filterSpaces,
  freeTitle,
  isAutoTitle,
  MODEL_WAIT_MS,
  newSpaceTitle,
  NEW_SPACE_CONTEXT,
  NEW_SPACE_OPENERS,
  spaceFromSlug,
  spaceModeFrom,
  spaceSlug,
  rememberSpaceMode,
  timeAgo,
  transcriptPage,
} from "../src/rules/spaces.ts";
import { AGENT_MAX_WRITES } from "@september/core/rules/agent";
import {
  buildSpaceContextPrompt,
  buildSuggestionPrompt,
  spaceDescriptionFrom,
} from "../src/rules/prompts.ts";
import {
  appendToNote,
  markdownToVoiceText,
  noteContentUpdates,
  noteFromSlug,
  noteNameFromContent,
  noteNameIsUnset,
  noteSlug,
} from "../src/rules/notes.ts";
import {
  canReach,
  isSetupDone,
  nextStep,
  previousStep,
  STEPS,
  stepsFor,
} from "../src/rules/onboarding.ts";

const desktopRoot = new URL("../", import.meta.url);
const sharedRuleFiles = new Set([
  "agent.ts",
  "notes.ts",
  "panel.ts",
  "present.ts",
  "phrases.ts",
  "pick.ts",
  "prompts.ts",
  "spaces.ts",
  "stripes.ts",
  "usage-summary.ts",
]);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, desktopRoot), "utf8"));
}

async function readText(path) {
  const sharedRule = path.match(/^src\/rules\/([^/]+\.ts)$/)?.[1];
  if (sharedRule && sharedRuleFiles.has(sharedRule)) {
    return readFile(
      new URL(`../../packages/core/rules/${sharedRule}`, desktopRoot),
      "utf8",
    );
  }
  const sharedUi = path.match(/^src\/(blocks|layouts|pages)\/([^/]+\.tsx)$/);
  if (sharedUi) {
    return readFile(
      new URL(
        `../../packages/app-ui/${sharedUi[1]}/${sharedUi[2]}`,
        desktopRoot,
      ),
      "utf8",
    );
  }
  return readFile(new URL(path, desktopRoot), "utf8");
}

test("desktop is an independent pnpm app", async () => {
  const packageJson = await readJson("package.json");

  assert.equal(packageJson.name, "@september/desktop");
  assert.equal(packageJson.scripts.dev, "vite");
  assert.equal(packageJson.scripts.build, "tsc --noEmit && vite build");
  assert.equal(packageJson.scripts["tauri:dev"], "node scripts/tauri.mjs dev");
  assert.equal(
    packageJson.scripts["tauri:build"],
    "node scripts/tauri.mjs build",
  );
});

test("Tauri opens the independent UI at the 13-inch iPad baseline", async () => {
  const config = await readJson("src-tauri/tauri.conf.json");
  const [mainWindow] = config.app.windows;

  assert.equal(config.productName, "September");
  assert.equal(mainWindow.title, "September");
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

test("every desktop page gives the September window a title", async () => {
  const { windowTitle } = await import("../src/rules/app-nav.ts");
  const capabilities = await readJson("src-tauri/capabilities/default.json");
  const main = await readText("src/main.tsx");
  const os = await readText("src/services/os.ts");

  assert.deepEqual(
    [
      "/",
      "/welcome",
      "/profile",
      "/mode",
      "/connect",
      "/finish",
      "/dashboard",
      "/spaces",
      "/spaces/new",
      "/spaces/general/talk",
      "/spaces/general/agent",
      "/spaces/general/notes",
      "/spaces/general/notes/appointment",
      "/voice",
      "/voice/clone",
      "/help",
      "/help/set-up-september",
      "/settings",
      "/settings/writing",
      "/settings/usage",
      "/settings/connections/openrouter",
      "/settings/connections/elevenlabs",
    ].map(windowTitle),
    [
      "September",
      "September — Welcome",
      "September — About you",
      "September — Choose setup",
      "September — Connect",
      "September — Finish",
      "September — Today",
      "September — Spaces",
      "September — New space",
      "September — Talk",
      "September — Agent",
      "September — Notes",
      "September — Notes",
      "September — Voice",
      "September — Clone your voice",
      "September — Help",
      "September — Set up September",
      "September — Services",
      "September — Writing help",
      "September — Usage",
      "September — OpenRouter",
      "September — ElevenLabs",
    ],
  );
  assert.ok(capabilities.permissions.includes("core:window:allow-set-title"));
  assert.match(main, /setWindowTitle\(windowTitle\(toLocation\.pathname\)\)/);
  assert.match(os, /getCurrentWindow\(\)\.setTitle\(title\)/);
});

test("the macOS bundle declares its recording privacy reasons", async () => {
  const plist = await readText("src-tauri/Info.plist");

  assert.match(plist, /NSMicrophoneUsageDescription/);
  assert.match(plist, /NSAudioCaptureUsageDescription/);
  assert.match(plist, /NSCameraUsageDescription/);
  assert.match(plist, /point at controls with your eyes/);
});

test("the UI builds with Tailwind and the router", async () => {
  const packageJson = await readJson("package.json");

  assert.ok(packageJson.dependencies["@tanstack/react-router"]);
  assert.ok(packageJson.devDependencies["@tailwindcss/vite"]);
  assert.match(await readText("vite.config.ts"), /tailwindcss\(\)/);
  assert.match(
    await readText("src/styles.css"),
    /@import "@september\/ui\/theme\.css"/,
  );
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
  assert.deepEqual(
    paths(advanced),
    STEPS.map((step) => step.path),
  );
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

test("the draft carries model configurations, never a key", async () => {
  const onboarding = await readText("src/rules/onboarding.ts");

  assert.match(onboarding, /ModelSettings/);
  assert.match(onboarding, /defaultModel/);
  assert.match(onboarding, /suggestionsModel/);
  assert.doesNotMatch(onboarding, /writingService|writingModel/);
  assert.match(onboarding, /voiceService/);
  assert.doesNotMatch(onboarding, /apiKey|secret|Key:/i);
});

test("the UI uses shadcn primitives", async () => {
  const components = await readJson("components.json");

  assert.equal(components.tailwind.css, "../../packages/ui/theme.css");
  assert.equal(components.aliases.ui, "@september/ui/components");

  for (const name of ["button", "input", "textarea", "label"]) {
    assert.match(
      await readText(`../../packages/ui/components/${name}.tsx`),
      /export/,
      `${name} primitive is missing`,
    );
  }

  const steps = await readText("src/pages/steps.tsx");
  assert.match(steps, /from "@september\/ui\/components\/button"/);
  assert.doesNotMatch(steps, /PRIMARY_BUTTON/);
});

test("the brand and the step numbers live in a sidebar", async () => {
  const app = await readText("src/layouts/onboarding.tsx");

  assert.match(app, /<aside/);
  assert.doesNotMatch(app, /<header/);
});

test("every section stays open", async () => {
  const steps = await readText("src/pages/steps.tsx");

  assert.doesNotMatch(steps, /aria-expanded/);
  assert.doesNotMatch(steps, /showPersonalWords/);
});

test("each control has one label, and no label repeats its section title", async () => {
  const steps = await readText("src/pages/steps.tsx");
  const value = (match) => match.split('"')[1];
  const ids = (steps.match(/\bid="onboarding-[a-z-]+"/g) ?? []).map(value);
  const labelled = (steps.match(/\bhtmlFor="onboarding-[a-z-]+"/g) ?? []).map(
    value,
  );

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
  assert.match(
    await readText("src/services/os.ts"),
    /invoke<string>\("user_name"\)/,
  );

  const packageJson = await readJson("package.json");
  assert.ok(packageJson.dependencies["@tauri-apps/api"]);

  // The draft starts with the name, so no effect races the first render.
  assert.match(await readText("src/layouts/onboarding.tsx"), /name: osName/);
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
  assert.match(
    await readText("src-tauri/third-party/apfel-LICENSE"),
    /MIT License/,
  );
  assert.match(packageJson.scripts["apfel:prepare"], /prepare-apfel\.mjs/);
  assert.match(packageJson.scripts["tauri:dev"], /scripts\/tauri\.mjs dev/);
  assert.match(packageJson.scripts["tauri:build"], /scripts\/tauri\.mjs build/);
  assert.match(lib, /tauri_plugin_shell::init\(\)/);
  assert.match(lib, /rpc::apfel_status/);
  assert.match(lib, /rpc::apfel_generate/);
  assert.match(rpc, /ApfelState/);
});

test("apfel starts only when asked and restarts after a failed health check", async () => {
  const rpc = await readText("src-tauri/src/rpc.rs");
  const apfel = await readText("src-tauri/src/apfel.rs");

  assert.doesNotMatch(rpc, /block_on\(apfel\.initialize/);
  assert.match(rpc, /state\.status\(&app\)\.await/);
  assert.match(rpc, /state\.generate\(&app, request\)\.await/);
  assert.match(apfel, /async fn ready/);
  assert.match(apfel, /current\.client\.status\(\)\.await/);
  assert.match(apfel, /managed\.take\(\)/);
});

test("the connect step asks by job and keeps keys out of the UI", async () => {
  const steps = await readText("src/pages/steps.tsx");
  const os = await readText("src/services/os.ts");
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
    "provider_models",
  ]) {
    assert.match(
      lib,
      new RegExp(`rpc::${command}\\b`),
      `${command} is not registered`,
    );
    assert.match(os, new RegExp(`"${command}"`), `${command} has no bridge`);
  }
});

test("a choice keeps its height when it is selected", async () => {
  const steps = await readText("src/pages/steps.tsx");
  const choice = steps.slice(steps.indexOf("function Choice("));

  // Selection changes the border only. A panel that appears on selection would
  // grow the card and push every choice below it down the page.
  assert.match(choice, /\{children\}/);
  assert.doesNotMatch(choice, /\{children && /);
  assert.doesNotMatch(steps, /selected && <KeyPanel/);
});

test("each service wears its own mark", async () => {
  // Setup and settings share one mark, so a brand asset is named one time.
  const steps = await readText("src/blocks/services.tsx");

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
  assert.match(await readText("../../packages/ui/theme.css"), /system-ui/);
});

test("the sidebar is an inset card like the step surface", async () => {
  const app = await readText("src/layouts/onboarding.tsx");
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
  const steps = await readText("src/pages/steps.tsx");
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
  const shell = await readText("src/layouts/app.tsx");

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

  const shell = await readText("src/layouts/app.tsx");
  assert.match(shell, /defaultOpen=\{!isCompact\}/);
});

test("every app destination has a route and an icon", async () => {
  const main = await readText("src/main.tsx");
  const shell = await readText("src/layouts/app.tsx");

  assert.ok(APP_NAV.length > 0);
  for (const item of APP_NAV) {
    assert.match(
      main,
      new RegExp(`"${item.path}"`),
      `${item.path} needs a route`,
    );
    assert.match(
      shell,
      new RegExp(`"${item.path}":`),
      `${item.path} needs an icon`,
    );
  }
});

test("the Eye tracker test bed is in the app sidebar", () => {
  assert.deepEqual(
    APP_NAV.find((item) => item.path === "/eyetracker"),
    {
      path: "/eyetracker",
      title: "Eye tracker",
      description: "Test eye tracking inside the camera box.",
    },
  );
});

test("Help has matching home and guide routes outside the setup guard", async () => {
  const main = await readText("src/main.tsx");
  const guardedRoutes = main.match(
    /appRoute\.addChildren\(\[[\s\S]*?\n  \]\)/,
  )?.[0];

  assert.match(main, /HelpScreen/);
  assert.match(main, /path: "\/help\/\$guideSlug"/);
  assert.match(main, /helpGuide\(params\.guideSlug\)/);
  assert.match(main, /redirect\(\{ to: "\/help" \}\)/);
  assert.ok(guardedRoutes);
  assert.doesNotMatch(guardedRoutes, /path: "\/help"/);
  assert.doesNotMatch(guardedRoutes, /path: "\/help\/\$guideSlug"/);
});

test("onboarding opens setup Help without unmounting or changing its draft", async () => {
  const onboarding = await readText("src/layouts/onboarding.tsx");
  const inlineHelp = onboarding.match(/<Sheet>[\s\S]*?<\/Sheet>/)?.[0];

  assert.ok(inlineHelp, "onboarding needs an inline Help sheet");
  assert.match(inlineHelp, /<SheetTrigger asChild>/);
  assert.match(inlineHelp, /<Button/);
  assert.match(inlineHelp, /min-h-11/);
  assert.match(inlineHelp, /HelpGuideContent/);
  assert.match(onboarding, /helpGuide\("set-up-september"\)/);
  assert.doesNotMatch(inlineHelp, /setDraft|Navigate|to=/);
});

test("the app opens where the user left it", () => {
  assert.equal(openingPath("/voice"), "/voice");
  assert.equal(openingPath("/spaces/amma/talk"), "/spaces/amma/talk");
  assert.equal(
    openingPath("/settings/connections/openrouter"),
    "/settings/connections/openrouter",
  );

  // A setup step must never come back. An address of nothing is not a screen.
  assert.equal(openingPath("/welcome"), "/dashboard");
  assert.equal(openingPath("/"), "/dashboard");
  assert.equal(openingPath("/spacesomething"), "/dashboard");
  assert.equal(openingPath(null), "/dashboard");
});

test("the last screen is kept in one setting", async () => {
  const os = await readText("src/services/os.ts");
  const main = await readText("src/main.tsx");

  assert.match(os, /key: "lastPath"/);
  assert.match(os, /export function currentPath/);
  assert.match(os, /export async function savePath/);
  // The router keeps every arrival, and the first route reads the last one.
  assert.match(main, /router\.subscribe\("onResolved"/);
  assert.match(main, /openingPath\(currentPath\(\)\)/);
});

test("setup and the app are separate layouts", async () => {
  const main = await readText("src/main.tsx");

  // The root route holds an outlet only, so a step never wears the app
  // sidebar and an app screen never wears the setup sidebar.
  assert.doesNotMatch(
    main,
    /createRootRoute\(\{\s*component: OnboardingLayout/,
  );
  assert.match(main, /OnboardingLayout/);
  assert.match(main, /AppShell/);
  assert.match(main, /id: "setup"/);
  assert.match(main, /id: "app"/);
});

test("both sidebars show the published brand mark", async () => {
  const brand = await readText("src/blocks/brand.tsx");

  assert.match(
    brand,
    /"\/logo\.svg"/,
    "the mark comes from the published file",
  );
  for (const file of ["src/layouts/onboarding.tsx", "src/layouts/app.tsx"]) {
    assert.match(await readText(file), /BrandMark/, `${file} needs the mark`);
  }
});

test("the app sidebar stays indigo, in the shadcn tokens", async () => {
  const styles = await readText("../../packages/ui/theme.css");

  assert.match(styles, /--sidebar:\s*var\(--color-indigo-500\)/);
  assert.match(styles, /--sidebar-foreground:\s*var\(--color-white\)/);
  assert.match(styles, /--sidebar-border:\s*var\(--color-indigo-400\)/);
  // The shared theme keeps both applications on the same dark-mode tokens.
  assert.match(styles, /^\.dark\b/m);
  assert.doesNotMatch(styles, /hsl\(/);
});

test("setup ends inside the app layout", async () => {
  const steps = await readText("src/pages/steps.tsx");

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
  const os = await readText("src/services/os.ts");
  const steps = await readText("src/pages/steps.tsx");

  // One setting holds the finished setup, and the module keeps the value it
  // wrote, so the guard right after setup reads the new answers.
  assert.match(os, /key: "setup"/);
  assert.match(os, /export function currentSetup/);
  assert.match(os, /export async function saveSetup/);
  assert.match(steps, /saveSetup\(draft\)/);
});

test("the brand and the nav icons share one left edge", async () => {
  const shell = await readText("src/layouts/app.tsx");
  const brand = shell.match(
    /aria-label="September home"\s+className="([^"]*)"/,
  )[1];

  // The brand is the way home, as a site's own name is.
  assert.match(shell, /<Link\s+to="\/"\s+aria-label="September home"/);

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

test("the first space is General, and a later one takes three words", () => {
  // The pick is given, so the name is the same in every run of this test.
  const first = () => 0;

  assert.equal(newSpaceTitle([]), "General");

  const name = newSpaceTitle(["General"], first);
  assert.equal(name.split(" ").length, 3);
  // No word comes twice inside one name.
  assert.equal(new Set(name.toLowerCase().split(" ")).size, 3);
  // A model may still rename it, because the user did not choose it.
  assert.equal(isAutoTitle(name), true);

  // Two spaces with one title share one slug, and an address then opens the
  // wrong space. A name that a space holds is never given a second time.
  assert.notEqual(newSpaceTitle(["General", name], first), name);
});

test("search keeps the spaces whose title holds the words", () => {
  const spaces = [
    { id: "a", title: "Doctor Ramesh" },
    { id: "b", title: "Homework Help" },
    { id: "c" },
  ];

  assert.deepEqual(filterSpaces(spaces, "").length, 3);
  assert.deepEqual(filterSpaces(spaces, "  ").length, 3);
  assert.deepEqual(
    filterSpaces(spaces, "doctor").map((s) => s.id),
    ["a"],
  );
  assert.deepEqual(
    filterSpaces(spaces, "HELP").map((s) => s.id),
    ["b"],
  );
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
  const talk = await readText("src/pages/spaces.tsx");

  assert.match(talk, /AlertDialog/);
  assert.match(talk, /cannot undo/);
  assert.match(talk, /variant="destructive"/);
  // The delete button opens the dialog. It must not delete on its own.
  assert.doesNotMatch(talk, /onClick=\{\(\) => deleteSpace\.mutate/);
});

test("the list has a search field", async () => {
  const talk = await readText("src/pages/spaces.tsx");

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
  const os = await readText("src/services/os.ts");
  const rpc = await readText("src-tauri/src/rpc.rs");

  assert.match(rpc, /pub\(crate\) fn user_id/);
  assert.match(rpc, /whoami::fallible::username/);
  assert.match(os, /invoke<string>\("user_id"\)/);
  assert.match(os, /export function currentUserId/);
});

test("setup freezes the user id, so a later read cannot move the spaces", async () => {
  const os = await readText("src/services/os.ts");
  const saveSetup = os.match(/export async function saveSetup[\s\S]*?\n\}/)[0];

  // The identifier goes into the setup setting one time. `currentUserId`
  // prefers that value over a new read of the operating system.
  assert.match(saveSetup, /id: osUser/);
  assert.match(os, /currentSetup\(\)\?\.id \?\? osUser/);
});

test("only data.ts and os.ts talk to Rust", async () => {
  // The service modules (`os.ts`, `data.ts`, `ai.ts`) are the only callers.
  const files = [
    "src/pages/talk.tsx",
    "src/pages/spaces.tsx",
    "src/blocks/space.tsx",
    "src/services/speech.ts",
    "src/services/player.ts",
    "src/pages/voice.tsx",
    "src/blocks/suggestions.tsx",
    "src/blocks/phrase-panel.tsx",
    "src/blocks/space-panel.tsx",
    "src/blocks/speech-settings.tsx",
    "src/services/phrase-sync.ts",
  ];
  for (const file of files) {
    assert.doesNotMatch(await readText(file), /@tauri-apps\/api/, file);
  }
});

test("spaces and messages read through TanStack Query", async () => {
  const packageJson = await readJson("package.json");
  const data = await readText("src/services/data.ts");
  const main = await readText("src/main.tsx");

  assert.ok(packageJson.dependencies["@tanstack/react-query"]);
  assert.match(main, /QueryClientProvider/);
  assert.match(data, /queryKey: \["spaces"\]/);
  assert.match(data, /"space_list"/);
  assert.match(data, /"message_list"/);
  assert.match(data, /"message_put"/);
});

test("a failed command carries a message the screen can show", async () => {
  const data = await readText("src/services/data.ts");

  // Tauri rejects with a string, so `error.message` would be empty. One
  // wrapper turns every rejection into an Error.
  assert.match(data, /function call</);
  assert.match(data, /new Error\(String\(reason\)\)/);
  assert.equal(
    data.match(/invoke</g)?.length,
    1,
    "every command goes through call()",
  );
});

test("Talk is a route inside a space", async () => {
  const main = await readText("src/main.tsx");

  assert.match(main, /"\/spaces\/\$slug\/talk"/);
  assert.match(main, /SpacesScreen/);
  assert.match(main, /TalkScreen/);
});

// --------------------------------------------------------- voice and audio

test("one setting owns the voice, and setup seeds it", async () => {
  const os = await readText("src/services/os.ts");
  const steps = await readText("src/pages/steps.tsx");

  // The `services` setting had no reader, so the voice chosen at /connect was
  // lost. `/voice` owns the voice, in the `speech` setting, and setup seeds it.
  assert.doesNotMatch(os, /saveServices/);
  assert.doesNotMatch(os, /"services"/);
  assert.match(steps, /saveSpeech\(/);
  assert.match(
    await readText("src/blocks/speech-settings.tsx"),
    /saveSpeech\(/,
  );
});

test("a voice file is named for the settings and the words", async () => {
  const rust = await readText("src-tauri/src/speech.rs");

  assert.match(rust, /Sha256::digest/);
  assert.match(rust, /split_whitespace/);
  // Three decimal places, so 0.5 and 0.50 give one name.
  assert.match(rust, /\{:\.3\}\|\{:\.3\}\|\{:\.3\}/);
});

test("the audio file reaches the WebView through the asset protocol", async () => {
  const os = await readText("src/services/os.ts");
  const config = await readJson("src-tauri/tauri.conf.json");

  assert.match(os, /convertFileSrc/);
  assert.equal(config.app.security.assetProtocol.enable, true);
  assert.deepEqual(config.app.security.assetProtocol.scope, [
    "$APPLOCALDATA/audio/*",
  ]);
});

test("the player holds one sound at a time", async () => {
  const player = await readText("src/services/player.ts");

  assert.match(player, /export function play/);
  assert.match(player, /export function stop/);
  // A new sound stops the sound before it.
  assert.match(player, /stop\(\);/);
});

test("every voice meets one interface", async () => {
  const speech = await readText("src/services/speech.ts");

  assert.match(speech, /interface SpeechProvider/);
  assert.match(speech, /id: "system"/);
  assert.match(speech, /id: "elevenlabs"/);
  assert.match(speech, /export function providerFor/);
});

test("the cloud voice falls back to the system voice", async () => {
  const speech = await readText("src/services/speech.ts");
  const cloud = speech.match(/const cloudVoice[\s\S]*?\n\}\);/)[0];

  // A person who cannot speak must not meet silence.
  assert.match(cloud, /catch/);
  assert.match(cloud, /systemVoice\(settings\)\.speak\(text, signal\)/);
});

test("spoken messages use the native audio process", async () => {
  const os = await readText("src/services/os.ts");
  const speech = await readText("src/services/speech.ts");

  assert.match(os, /speech_system/);
  assert.match(os, /speech_file_play/);
  assert.match(os, /speech_native_stop/);
  assert.match(speech, /speakSystem/);
  assert.match(speech, /playSpeechFile/);
  assert.doesNotMatch(speech, /globalThis\.speechSynthesis/);
  assert.doesNotMatch(speech, /audioUrl\(path\)/);
});

test("the Talk audio selector controls the calling-app microphone", async () => {
  const os = await readText("src/services/os.ts");
  const talk = await readText("src/blocks/space.tsx");
  const voice = await readText("src/pages/voice.tsx");
  const audio = await readText("src-tauri/src/audio.rs");

  assert.match(os, /virtual_microphone_status/);
  assert.match(os, /virtual_microphone_start/);
  assert.match(os, /virtual_microphone_stop/);
  // macOS publishes no way to read its audio-recording answer, so a refused
  // microphone is silent and says nothing. The app names the setting.
  assert.match(audio, /fn microphone_detail\(/);
  assert.match(audio, /Audio Recording/);
  assert.match(talk, /microphone\.data\?\.detail/);
  assert.match(talk, /function AudioSelector/);
  assert.match(talk, /DropdownMenuCheckboxItem/);
  assert.match(talk, /September Microphone/);
  assert.match(talk, /calling apps/);
  assert.doesNotMatch(talk, /devices\.length < 2\) return null/);
  assert.doesNotMatch(voice, /virtualMicrophone/);
  assert.doesNotMatch(voice, /September Microphone/);
});

test("the native voices wait on a callback, not on a clock", async () => {
  const native = await readText("src-tauri/native/audio.m");

  assert.match(native, /dispatch_semaphore_wait/);
  assert.doesNotMatch(native, /sleepForTimeInterval/);
  // A framework class is shared with code September does not own.
  assert.doesNotMatch(native, /@synchronized\(\[AV/);
  assert.match(native, /SeptemberSpeechLock\(\)/);
  assert.match(native, /SeptemberDeviceLock\(\)/);
  // The composition key takes a CFNumber, and @NO is a CFBoolean.
  assert.match(native, /kAudioAggregateDeviceIsPrivateKey\) : @0/);
});

test("eye control uses the camera without reinstalling a virtual camera", async () => {
  const sources = await Promise.all([
    readText("src/services/os.ts"),
    readText("../web/src/services/os.ts"),
    readText("src/blocks/space-panel.tsx"),
    readText("src/blocks/space.tsx"),
    readText("src/blocks/present.tsx"),
    readText("src-tauri/src/lib.rs"),
    readText("src-tauri/src/rpc.rs"),
    readText("src-tauri/build.rs"),
    readText("scripts/tauri.mjs"),
  ]);
  const makefile = await readFile(
    new URL("../../../Makefile", import.meta.url),
    "utf8",
  );

  for (const source of [...sources, makefile]) {
    assert.doesNotMatch(
      source,
      /virtual.camera|September Camera|CameraSettings|useCameraOverlay|build-camera-extension|desktop-logs/i,
    );
  }

  const config = await readJson("src-tauri/tauri.conf.json");
  assert.equal(
    config.bundle.macOS.files[
      "Library/SystemExtensions/app.september.desktop.camera.systemextension"
    ],
    undefined,
  );

  const plist = await readText("src-tauri/Info.plist");
  const entitlements = await readText("src-tauri/September.entitlements");
  assert.match(plist, /NSCameraUsageDescription/);
  assert.doesNotMatch(plist, /NSSystemExtensionUsageDescription/);
  assert.match(entitlements, /com\.apple\.security\.device\.camera/);
  assert.doesNotMatch(
    entitlements,
    /com\.apple\.developer\.system-extension\.install/,
  );

  for (const path of [
    "scripts/build-camera-extension.mjs",
    "src-tauri/native/camera.m",
    "src-tauri/src/camera.rs",
    "src-tauri/camera-extension/Info.plist",
    "src/blocks/camera-settings.tsx",
  ]) {
    await assert.rejects(() => readText(path), { code: "ENOENT" });
  }
});

test("eye tracking exists only in one camera-box test bed", async () => {
  const main = await readText("src/main.tsx");
  const page = await readText("src/eye-tracker.tsx");
  const service = await readText("src/services/gaze.ts");
  const gaze = await readText("src-tauri/src/gaze.rs");
  const manifest = await readText("src-tauri/Cargo.toml");

  assert.match(main, /"\/eyetracker"/);
  assert.match(main, /EyeTracker/);
  assert.doesNotMatch(main, /GazePointer|EyeControlLayer|debug\/eye-control/);
  assert.match(page, /Camera feed/);
  assert.match(page, /data-testid="eye-pointer"/);
  assert.match(page, /overflow-hidden/);
  assert.match(page, /stopGaze/);
  assert.match(page, /Calibrate/);
  assert.match(page, /calibrationPoints/);
  assert.match(gaze, /face_crop/);
  assert.doesNotMatch(
    page,
    /Tracking log|\.click\(|localStorage|sessionStorage/i,
  );
  assert.match(service, /new Channel<GazeEvent>/);
  for (const command of ["gaze_start", "gaze_stop"]) {
    assert.match(service, new RegExp(command));
    assert.match(gaze, new RegExp(command));
  }
  assert.doesNotMatch(
    `${service}\n${gaze}`,
    /gaze_calibration|DebugFrame|event: "sample"|GazeEvent::Sample/,
  );
  assert.match(manifest, /cidre/);
  assert.doesNotMatch(
    `${service}\n${gaze}\n${manifest}`,
    /enigo|mouse_move|MouseControllable/,
  );
});
test("a Developer ID build embeds the host provisioning profile", async () => {
  const config = await readJson("src-tauri/tauri.conf.json");
  const script = await readText("scripts/tauri.mjs");

  assert.equal(
    config.bundle.macOS.files["embedded.provisionprofile"],
    "./embedded.provisionprofile",
  );
  assert.match(script, /APPLE_PROVISIONING_PROFILE/);
});

test("the root Makefile releases a notarized desktop DMG", async () => {
  const makefile = await readFile(
    new URL("../../../Makefile", import.meta.url),
    "utf8",
  );

  assert.match(makefile, /^desktop-release:/m);
  assert.match(makefile, /\. \.\/\.envrc/);
  assert.match(makefile, /pnpm -C apps\/desktop tauri:build/);
  assert.match(makefile, /xcrun notarytool submit/);
  assert.match(makefile, /xcrun stapler staple/);
  assert.match(makefile, /xcrun stapler validate/);
  assert.match(makefile, /spctl --assess --type open/);
  assert.match(makefile, /shasum -a 256/);
});

test("the speech settings hold everything that shapes the sound", async () => {
  const speech = await readText("src/services/speech.ts");
  const defaults = speech.match(/DEFAULT_SPEECH[\s\S]*?\};/)[0];

  for (const key of [
    "provider",
    "voiceId",
    "modelId",
    "stability",
    "similarity",
    "speed",
  ]) {
    assert.match(defaults, new RegExp(`\\b${key}:`), key);
  }
});

test("the key screen chooses the model, and the rail repeats the choice", async () => {
  const settings = await readText("src/pages/settings.tsx");
  const card = await readText("src/blocks/speech-settings.tsx");
  const os = await readText("src/services/os.ts");

  // The account key lists the models, so the model sits with the key.
  assert.match(os, /export const listModels/);
  assert.match(settings, /listModels/);
  assert.match(settings, /modelId/);
  // The card of the rail asks the same question, beside the voice it shapes.
  assert.match(card, /listModels/);
  assert.match(card, /modelId/);
});

test("voice cloning crosses the native provider boundary as raw audio", async () => {
  const lib = await readText("src-tauri/src/lib.rs");
  const rpc = await readText("src-tauri/src/rpc.rs");

  assert.match(lib, /rpc::provider_clone_voice\b/);
  assert.match(rpc, /InvokeBody::Raw/);
  assert.match(rpc, /multipart\/form-data/);
  assert.match(rpc, /State<'_, ProviderKeys>/);
  assert.match(rpc, /keys\s*\.get\(Provider::ElevenLabs\)/);
});

test("the Voice screen keeps its choices in one setting", async () => {
  const os = await readText("src/services/os.ts");
  const main = await readText("src/main.tsx");

  assert.match(os, /key: "speech"/);
  assert.match(os, /export function currentSpeech/);
  assert.match(main, /VoiceScreen/);
});

test("a message keeps no audio path", async () => {
  const data = await readText("src/services/data.ts");

  assert.doesNotMatch(data, /audio_path/);
});

// ------------------------------------------------- phrases and suggestions

test("a code comes from the initials of the content words", () => {
  const options = { existingCodes: [] };

  assert.equal(generateCode("Thank you", options), "ty");
  // Stopwords drop out, and four initials are the most a code takes.
  assert.equal(generateCode("I want to go to the bathroom", options), "iwgb");
  // One content word is not enough to name.
  assert.equal(generateCode("Hello", options), undefined);
});

test("a code never takes a word the user would type", () => {
  // "so" and "no" are words, so the generator moves away from them.
  assert.notEqual(generateCode("Sit outside", { existingCodes: [] }), "so");
  assert.equal(isCommonWord("so"), true);
  assert.equal(isCommonWord("iwgb"), false);

  const taken = generateCode("Thank you", { existingCodes: ["ty"] });
  assert.notEqual(taken, "ty");
  assert.match(String(taken), /^[a-z0-9]{2,5}$/);
});

test("a code the user types is checked before it is kept", () => {
  const existingCodes = ["ty"];

  assert.deepEqual(validateCode("TY ", { existingCodes: [] }), {
    ok: true,
    code: "ty",
  });
  assert.equal(validateCode("a", { existingCodes }).reason, "format");
  assert.equal(validateCode("water", { existingCodes }).reason, "dictionary");
  assert.equal(validateCode("ty", { existingCodes }).reason, "duplicate");
});

test("the word at the caret triggers a code, and a finished word does not", () => {
  assert.equal(trailingWord("I want ty"), "ty");
  assert.equal(trailingWord("I want ty "), "");

  const rows = [
    {
      id: "a",
      space_id: "other",
      text: "Thank you",
      kind: "phrase",
      code: "ty",
      pinned: false,
    },
    {
      id: "b",
      space_id: "here",
      text: "Thanks a lot",
      kind: "phrase",
      code: "ty",
      pinned: false,
    },
  ];

  // The space the user is in wins a conflict.
  assert.equal(matchCode("TY", rows, "here")?.id, "b");
  assert.equal(matchCode("nothing", rows, "here"), undefined);
});

test("a regeneration keeps the phrases the user pinned", () => {
  assert.deepEqual(
    dedupeAgainstPinned(["Thank you"], ["thank you", "I am cold", "I am cold"]),
    ["I am cold"],
  );

  const rows = [
    { id: "1", text: "AI one", kind: "phrase", pinned: false },
    { id: "2", text: "Kept", kind: "phrase", pinned: true },
    { id: "3", text: "Can you please", kind: "starter", pinned: false },
  ];
  assert.deepEqual(topPhrases(rows, 5), ["Kept", "AI one"]);
  assert.deepEqual(
    topRows(rows, 5, "starter").map((r) => r.id),
    ["3"],
  );
});

test("a starter is an opening, not a sentence", () => {
  assert.deepEqual(
    sanitizeStarters([
      "  Can you please check ",
      "",
      "No",
      "one two three four five six seven",
    ]),
    ["Can you please check"],
  );
});

test("the phrases are written again after six new messages", () => {
  assert.equal(
    decidePhraseSync({ syncedCount: undefined, messageCount: 0 }),
    "none",
  );
  assert.equal(
    decidePhraseSync({ syncedCount: undefined, messageCount: 1 }),
    "seed",
  );
  assert.equal(decidePhraseSync({ syncedCount: 4, messageCount: 9 }), "none");
  assert.equal(decidePhraseSync({ syncedCount: 4, messageCount: 10 }), "regen");
});

test("a stripe hides the words the user already typed", () => {
  assert.deepEqual(tokenize("I am cold."), ["I", "am", "cold", "."]);
  assert.equal(joinTokens(["I", "am", "cold", "."]), "I am cold. ");

  const stripe = stripeForText("I am cold today", "i am ");
  assert.equal(stripe.hidden, 2);
  assert.equal(stripe.tokens.length, 4);
});

test("taking a code swaps the typed trigger for the phrase", () => {
  assert.equal(codeExpansionText("I said ty", "thank you"), "I said thank you");
  assert.equal(appendTokens("I am", "very cold"), "I am very cold ");
});

test("an empty composer shows the saved phrases, and typing shows the answers", () => {
  // Nothing typed: the rows are what the user keeps.
  const blank = composeSuggestions({
    typed: "",
    mdPhrases: ["I am cold"],
    starters: ["Can you please"],
    history: ["I am hungry"],
    llm: ["I am tired"],
  });
  assert.deepEqual(
    blank.map((s) => s.source),
    ["md", "starter", "llm"],
  );

  // A sentence started: the past messages and the model come first, because
  // they follow the words that are there. The saved phrases come after.
  const started = composeSuggestions({
    typed: "I am",
    mdPhrases: ["I am cold"],
    starters: ["I am not"],
    history: ["I am hungry"],
    llm: ["I am tired"],
  });
  assert.deepEqual(
    started.map((s) => s.source),
    ["history", "llm", "md", "starter"],
  );

  // History still answers one time for one message.
  const once = composeSuggestions({
    typed: "I am h",
    mdPhrases: [],
    history: ["I am hungry", "I am hungry"],
    llm: [],
  });
  assert.deepEqual(
    once.map((s) => s.text),
    ["I am hungry"],
  );
});

test("a prompt carries no example message, and the context decides", async () => {
  const prompts = await readText("src/rules/prompts.ts");
  const phrases = await readText("src/rules/phrases.ts");

  // A written example teaches the model one stereotype of a disabled user,
  // and the model then writes that user instead of this one.
  assert.doesNotMatch(prompts, /<example/);
  assert.doesNotMatch(prompts, /I need help/);
  assert.doesNotMatch(phrases, /e\.g\. "Can you please check/);

  // The app says one thing about the user. The context says the rest.
  assert.doesNotMatch(prompts, /speech or motor difficulties/);
  assert.doesNotMatch(phrases, /speech or motor difficulties/);
  assert.match(prompts, /The User is using a communication app/);
  assert.match(prompts, /the wording from the user context/);
  assert.match(phrases, /space context/);

  // With no example, the shape of the answer must be written out.
  const blank = { globalMd: "", spaceMd: "", history: [] };
  for (const typed of ["", "I am"]) {
    const { system } = buildSuggestionPrompt({ ...blank, typed });
    assert.match(system, /Answer with JSON: \{"suggestions"/, typed);
  }
});

test("a one-word phrase does not spend a row of the stripe", () => {
  const texts = [
    "Yes",
    "Please",
    "What are you",
    "How was your day",
    "I am cold",
  ];

  // A one-word phrase goes to the chips, so the cap must count the rows that
  // a stripe can draw, and not the rows that come before the filter.
  assert.deepEqual(stripePhrases(texts, 3), [
    "What are you",
    "How was your day",
    "I am cold",
  ]);
  assert.deepEqual(stripePhrases(texts, 1), ["What are you"]);
  assert.deepEqual(
    stripePhrases(boardPhrases(texts), 3),
    stripePhrases(texts, 3),
  );
});

test("a new space asks what it is for before it exists", async () => {
  const spaces = await readText("src/pages/agent.tsx");
  const list = await readText("src/pages/spaces.tsx");
  const dock = await readText("src/blocks/space.tsx");
  const main = await readText("src/main.tsx");

  // The plus opens a screen. It no longer makes an empty space and leaves.
  assert.match(main, /path: "\/spaces\/new"/);
  // The screen is the first turn of the space's agent, so it lives beside it.
  assert.match(spaces, /function NewSpaceScreen/);
  assert.match(spaces, /What is this space for\?/);
  for (const [name, file] of [
    ["list", list],
    ["dock", dock],
  ]) {
    assert.match(file, /to: "\/spaces\/new"/, name);
  }

  // The words of the user become the note of the space before any model
  // runs, and the space's own agent reads them as its first request.
  assert.match(spaces, /context: said/);
  assert.match(spaces, /agentSaidRow\(space\.id, "user", said\)/);
});

test("a new space offers openers to press, so the first words cost nothing", async () => {
  // A space is for one person, one place, or one subject, and each opener
  // names one of the three.
  assert.equal(NEW_SPACE_OPENERS.length, 3);

  for (const opener of NEW_SPACE_OPENERS) {
    // Each one stops mid-sentence on purpose: the stripe and the word tiles
    // carry on from there. A finished sentence would put words in the mouth
    // of the user, which is the one thing this screen must not do.
    assert.match(opener, / $/);
    assert.ok(opener.length <= 24, opener);
  }

  const spaces = await readText("src/pages/agent.tsx");

  // One `Openers` block draws them, here and in the Agent empty state.
  const block = await readText("src/blocks/agent-transcript.tsx");
  assert.match(spaces, /openers=\{NEW_SPACE_OPENERS\}/);
  assert.match(block, /export function Openers/);
  assert.match(block, /openers\.map/);

  // They sit with the question, above Skip: a way in for a user who does not
  // know what to write, next to the way out for a user with nothing to say.
  assert.ok(
    spaces.indexOf("openers={NEW_SPACE_OPENERS}") <
      spaces.indexOf("Skip for now"),
    "the openers must come before Skip",
  );

  // The row stays while the question does, so a press never unmounts the
  // control that was pressed and drops the focus to the body.
  const openers = block.match(/openers\.map[\s\S]*?\n\s+\)\)\}/)[0];
  assert.doesNotMatch(openers, /!words/);
});

test("the new space screen writes through the one console", async () => {
  const spaces = await readText("src/pages/agent.tsx");

  // This screen asks for the most free typing in the app, and it used to be
  // the one surface with no help for it: a bare textarea, in an app whose
  // reason to exist is fewer keystrokes. It takes the console that every
  // other writing surface takes, so the word tiles, the codes, the stripe,
  // undo, and delete-last-word are all here.
  assert.match(spaces, /<Composer/);
  assert.match(spaces, /mode="new"/);
  assert.doesNotMatch(spaces, /<textarea/);

  // No space exists, so there is no context to write from. The engine gets
  // the frame instead, and the words the user has said everywhere else.
  assert.match(spaces, /NEW_SPACE_CONTEXT/);
  assert.match(spaces, /useAllMessages/);
});

test("a space that does not exist yet asks SQLite for nothing", async () => {
  const data = await readText("src/services/data.ts");

  // The console draws before a space exists. An empty id must not reach
  // `validate_identifier`, which rejects an identifier of no bytes, because
  // the stripe would then carry that error instead of words.
  assert.match(data, /enabled: Boolean\(spaceId\)/);
  assert.match(data, /enabled: spaceId !== ""/);
});

test("the work of a new space happens inside the space it made", async () => {
  const spaces = await readText("src/pages/agent.tsx");
  const make = spaces.match(/const make = async[\s\S]*?\n  \};\n/)[0];

  // The create screen is a doorway, not a destination. Only the local writes
  // are awaited — the space, the words of the user, and the turn that opens
  // its conversation — and every one of them is on disk before the address
  // changes.
  assert.match(make, /await create\(\)/);
  assert.match(make, /context: said/);
  assert.match(make, /writeAgentMessage\(agentSaidRow\(space\.id, "user", said\)\)/);

  // The naming and the phrases run on without this screen, so nothing here
  // waits for a model and there is no progress to draw.
  assert.match(make, /void introduce\(/);
  assert.doesNotMatch(make, /await introduce/);
  assert.doesNotMatch(spaces, /createSteps|CreateProgress|StepState/);

  // The user lands in the space, in Agent, watching their own words.
  assert.match(make, /spaceParams\(space, "agent"\)/);
  assert.ok(
    make.indexOf("void introduce(") < make.indexOf("spaceParams(space, \"agent\")"),
    "the work must be started before the screen steps out of the way",
  );
});

test("a new space that could not be made keeps the words that asked for it", async () => {
  const spaces = await readText("src/pages/agent.tsx");
  const make = spaces.match(/const make = async[\s\S]*?\n  \};\n/)[0];

  // Every failure used to be silent: the button went back to Create space
  // with the words still in the field and nothing said.
  assert.match(make, /catch/);
  assert.match(spaces, /<Problem error=/);

  // There is no half-made space to patch any more. The three local writes
  // either all land and the screen leaves, or none of them does and the
  // words are still in the field for a second press.
  assert.doesNotMatch(spaces, /Open the space anyway/);
  assert.doesNotMatch(spaces, /if \(made\) return made/);
  assert.ok(
    make.indexOf("rememberDraft(\"\")") < make.indexOf("void introduce("),
    "the draft is only cleared once the space holds the words",
  );
});

test("nobody waits on a model, and no model runs for ever", async () => {
  const spaces = await readText("src/pages/agent.tsx");

  // Cancel used to be disabled for the whole run, across two model calls
  // with no timeout. There is nothing to cancel now: by the time a model is
  // called, the user is already inside the space it is naming.
  assert.match(spaces, /AbortSignal\.timeout\(INTRODUCTION_WAIT_MS\)/);
  const cancel = spaces.match(/const cancel = [\s\S]*?\n  \};\n/)[0];
  assert.doesNotMatch(cancel, /abort\(\)/);

  // The reply lands whatever happened, so a screen reading the transcript
  // can always tell work in flight from work that is done.
  const introduce = spaces.match(/async function introduce\([\s\S]*?\n\}\n/)[0];
  assert.match(introduce, /catch/);
  assert.match(introduce, /writeAgentMessage\(/);
});

test("the words of the user are what the first turn reads", async () => {
  const spaces = await readText("src/pages/agent.tsx");
  const make = spaces.match(/const make = async[\s\S]*?\n  \};\n/)[0];

  // The words reach the space and the transcript before the turn runs, so
  // the model reads them as the request it is answering.
  assert.match(make, /context: said/);
  assert.match(make, /agentSaidRow\(space\.id, "user", said\)/);
  assert.ok(
    make.indexOf('agentSaidRow(space.id, "user", said)') <
      make.indexOf("void introduce("),
    "the words must be in the transcript before the turn runs",
  );
});

test("a title from the model must take a free slug too", async () => {
  const rules = await readText("src/rules/agent.ts");

  // `newSpaceTitle` gives out a name no other space holds, and the model's
  // title used to be written straight over it with no such check. Two spaces
  // then shared one address, and the dock tab of the new one opened the old.
  // The executor holds the check now, so it covers a rename the agent
  // proposes on any day, not only the day the space was made.
  const configure = rules.match(/if \(!freeTitle\(input\.title, others\)\)[\s\S]{0,120}/)[0];
  assert.match(configure, /freeTitle/);
});

test("the words of a new space are not lost to a press or a restart", async () => {
  const os = await readText("src/services/os.ts");
  const spaces = await readText("src/pages/agent.tsx");

  // Every other writing surface in September saves with no Save button,
  // because a user who types slowly must never lose words to a button they
  // did not press. A paragraph typed by switch is worth more than a note,
  // not less.
  assert.match(os, /new-space-draft/);
  assert.match(spaces, /rememberDraft/);

  // Cancel with words in the field asks before it throws them away.
  assert.match(spaces, /setDiscarding/);
  assert.match(spaces, /variant="destructive"/);
});

test("a space that was skipped is asked again what it is for", async () => {
  const talk = await readText("src/pages/talk.tsx");
  const notes = await readText("src/pages/notes.tsx");

  // Skip leaves a space with a made-up name and no note, and nothing invited
  // the user to fill that in. Talk has no working-set slot on the desktop, so
  // About exists only as a tab inside Notes mode, which is a long way to walk
  // for something the user was never told mattered.
  assert.match(talk, /Tell September what this space is for/);
  assert.match(talk, /space\.context/);

  // The invitation lands on About, not on a note beside it. An address that
  // names a note still wins, so a deep link is not taken over.
  assert.match(notes, /useState\(!wanted && !space\.context/);
});

test("a half-written new space is not a screen to open on", () => {
  assert.equal(openingPath("/spaces/new"), "/dashboard");
  assert.equal(openingPath("/spaces/general/talk"), "/spaces/general/talk");
});

test("a space with a note gets its phrases before the first message", () => {
  // A space made from a note holds no message, and its stripe would be empty
  // without this. The note is enough for a model to write the phrases.
  assert.equal(
    decidePhraseSync({
      syncedCount: undefined,
      messageCount: 0,
      hasContext: true,
    }),
    "seed",
  );
  assert.equal(
    decidePhraseSync({
      syncedCount: undefined,
      messageCount: 0,
      hasContext: false,
    }),
    "none",
  );
  // A space that already wrote its phrases waits for six new messages, note
  // or no note.
  assert.equal(
    decidePhraseSync({ syncedCount: 0, messageCount: 1, hasContext: true }),
    "none",
  );
});

test("a new space opens at once, and its phrases land behind it", async () => {
  const spaces = await readText("src/pages/agent.tsx");
  const sync = await readText("src/services/phrase-sync.ts");

  // The screen used to hold the user until every write landed, because
  // opening Talk early would have filled the suggestion stripe under a hand
  // already reaching for it. Agent has no stripe, so that reason is gone.
  const agent = spaces.match(/function Agent\(\{ space, spaces \}[\s\S]*?\n\}\n/)[0];
  assert.match(agent, /suggestions=\{false\}/);

  // One seed, not two. `seedPhrases` existed only for the create screen, and
  // the hook already writes the phrases of a space that reaches Talk without
  // them — which is also what happens when the first turn does not.
  assert.doesNotMatch(sync, /export async function seedPhrases/);
  assert.match(sync, /decidePhraseSync/);

  // The turn writes behind the screen, so the caches it filled must be
  // dropped when it lands.
  assert.match(spaces, /invalidateQueries\(\{\s*queryKey: \["agent-messages", space\.id\],?\s*\}\)/);
  assert.match(spaces, /invalidateQueries\(\{ queryKey: \["phrases"\] \}\)/);
});

test("Skip opens the space at once, and asks no model", async () => {
  const spaces = await readText("src/pages/agent.tsx");

  // Skip means skip. With one handler behind both buttons, a user who wrote a
  // line and then pressed Skip waited for the model anyway.
  assert.match(spaces, /onClick={skip}/);
  assert.doesNotMatch(spaces, /onClick={make}[\s\S]*onClick={make}/);
});

test("a model that writes nothing leaves the space unsynced", async () => {
  const sync = await readText("src/services/phrase-sync.ts");

  // With the count written anyway, a space whose seed gave nothing waits for
  // six messages before it tries again.
  assert.match(sync, /if \(rows\.length === 0\) return/);
});

test("a kept phrase is built in one place, and never made twice", () => {
  const rows = [
    {
      id: "1",
      space_id: "s",
      text: "Thank you",
      kind: "phrase",
      code: "ty",
      pinned: true,
      created_at: 0,
      updated_at: 0,
    },
  ];

  // The space already holds it, whatever the case and the spaces around it.
  assert.equal(pinnedPhrase("  thank YOU ", "s", rows), null);

  const row = pinnedPhrase("Please call the nurse", "s", rows, 5);
  assert.equal(row.space_id, "s");
  assert.equal(row.kind, "phrase");
  assert.equal(row.pinned, true);
  assert.equal(row.created_at, 5);
  // The code comes from the generator, never from a model.
  assert.equal(row.code, "pcn");

  // A code that another row holds is not given out twice.
  const taken = [...rows, { ...row, id: "2" }];
  assert.notEqual(pinnedPhrase("Please call nurse", "s", taken).code, "pcn");
});

test("a shortcut idea needs five messages and an unused code", () => {
  const at = Date.UTC(2026, 7, 21);
  const said = (text, n) =>
    Array.from({ length: n }, (_, i) => ({
      id: `m${text}${i}`,
      type: "user",
      text,
      created_at: at - i * 1000,
    }));

  const ideas = mineShortcuts(
    [...said("Please call the nurse", 6), ...said("Hello", 9)],
    {
      existingPhrases: [],
      dismissed: new Set(),
      now: at,
    },
  );

  assert.equal(ideas.length, 1);
  assert.equal(ideas[0].text, "Please call the nurse");
  assert.equal(ideas[0].count, 6);
  assert.match(ideas[0].code, /^[a-z0-9]{2,5}$/);

  // A dismissed idea never comes back.
  const dismissed = mineShortcuts(said("Please call the nurse", 6), {
    existingPhrases: [],
    dismissed: new Set([normalizeMinedText("Please call the nurse")]),
    now: at,
  });
  assert.deepEqual(dismissed, []);
});

test("a code answers without waiting for the model", async () => {
  const suggestions = await readText("src/blocks/suggestions.tsx");

  // The code row is built from local rows, in the same pass as the rest.
  assert.match(suggestions, /matchCode\(word, allPhrases, spaceId\)/);
  assert.match(suggestions, /codeExpansionText/);
  // Only the model rows wait.
  assert.match(suggestions, /THINK_AFTER_MS = 200/);
});

test("a model never writes over a phrase the user keeps", async () => {
  const sync = await readText("src/services/phrase-sync.ts");
  const data = await readText("src/services/data.ts");
  const rust = await readText("src-tauri/src/repository.rs");

  assert.match(sync, /dedupeAgainstPinned/);
  assert.match(sync, /replace\.mutateAsync/);
  assert.match(data, /"phrase_replace_ai"/);
  // Rust erases only the rows that are not pinned, in one transaction.
  assert.match(
    rust,
    /DELETE FROM saved_phrases WHERE space_id = \?1 AND pinned = 0/,
  );
  assert.match(rust, /a replacement phrase must not be pinned/);
});

test("the codes of new rows come from the app, never from the model", async () => {
  const sync = await readText("src/services/phrase-sync.ts");

  assert.match(sync, /generateCode\(text, \{ existingCodes \}\)/);
});

test("the phrases panel wears the layout of the web app", async () => {
  const panel = await readText("src/blocks/phrase-panel.tsx");

  // A form adds a phrase and its code, which the panel had no way to do.
  assert.match(panel, /aria-label="Add a phrase"/);
  assert.match(panel, /aria-label="Code \(optional\)"/);
  // Kept rows come first, under their own label, then the written ones.
  assert.match(panel, /function PhraseGroup/);
  assert.match(panel, /Suggested/);
  // One line for one phrase, not a card: a press puts it in the composer.
  assert.match(panel, /onInsert/);
  // A code is a badge that opens a small field, not a field on every row.
  assert.match(panel, /function CodeBadge/);
  // DESIGN.md asks for a 44px target. The web app uses 36px here.
  assert.doesNotMatch(panel, /size-9\b/);
  assert.match(panel, /size-11/);
});

test("the pin of a kept phrase is solid, in the stripe and in the panel", async () => {
  const row = (text, pinned) => ({
    id: text,
    space_id: "s",
    text,
    kind: "phrase",
    pinned,
    created_at: 0,
    updated_at: 0,
  });
  const rows = [row("Thank you", true), row("I am cold", false)];

  // The case and the spaces around a phrase do not count.
  assert.equal(isKept(" thank YOU ", rows), true);
  // A model wrote this one, so a regeneration can take it away.
  assert.equal(isKept("I am cold", rows), false);
  assert.equal(isKept("Hello", rows), false);

  // The gutter of the stripe fills the pin, as the row of the panel does.
  const panel = await readText("src/blocks/phrase-panel.tsx");
  const suggestions = await readText("src/blocks/suggestions.tsx");
  assert.match(panel, /row\.pinned && "fill-current"/);
  assert.match(suggestions, /kept && "fill-current"/);
  // The label says the same thing, for a user who does not see the fill.
  assert.match(suggestions, /You keep this phrase/);
});

test("a phrase from the panel reaches the composer of both screens", async () => {
  for (const file of ["src/pages/talk.tsx", "src/pages/notes.tsx"]) {
    assert.match(await readText(file), /onInsert=\{/, file);
  }
});

test("a shortcut idea the user turned down is kept out for good", async () => {
  const os = await readText("src/services/os.ts");
  const panel = await readText("src/blocks/phrase-panel.tsx");

  // A setting, not the browser storage, so it lives with the rest of the app.
  assert.match(os, /key: "dismissed-ideas"/);
  assert.match(panel, /rememberDismissed/);
  assert.match(panel, /normalizeMinedText/);
});

test("a tile shrinks so a long row stays on one line", () => {
  const short = [{ chars: 9, tokens: 2 }];
  // "Could you please pass me the glass of water, thank you." in the composer
  // of the 1376 px window: 13 tiles, and about 745 px to hold them.
  const long = [{ chars: 46, tokens: 13 }];

  // A short row is never shrunk.
  assert.equal(tileScale(short, 745), 1);
  // A long row shrinks to fit the width it was given.
  assert.ok(tileScale(long, 745) < 1);
  assert.ok(tileScale(long, 745) > tileScale(long, 500));
  // The widest row decides for every row.
  assert.equal(tileScale([...short, ...long], 745), tileScale(long, 745));

  // The padding of each tile counts, not the letters alone. Eleven one-letter
  // words are wider than one word of eleven letters.
  assert.ok(
    tileScale([{ chars: 11, tokens: 11 }], 400) <
      tileScale([{ chars: 11, tokens: 1 }], 400),
  );

  // It never shrinks past the floor, where a tile stops being pressable.
  assert.equal(tileScale(long, 10), TILE_SCALE_MIN);
  // No width to fit yet: leave the tiles alone.
  assert.equal(tileScale(long, 0), 1);
});

test("the first space starts with phrases, so the stripe is never empty", async () => {
  const data = await readText("src/services/data.ts");

  assert.match(data, /STARTER_PACK/);
  assert.match(data, /pinned: true/);
});

test("no tile is ever out of reach", async () => {
  const suggestions = await readText("src/blocks/suggestions.tsx");

  // Past the shrink floor a row scrolls. It must not clip its own tiles.
  assert.match(suggestions, /overflow-x-auto/);
  assert.doesNotMatch(suggestions, /flex-1 gap-1 overflow-hidden/);
});

test("the composer offers the next word while the user writes", async () => {
  const suggestions = await readText("src/blocks/suggestions.tsx");

  assert.match(suggestions, /useSuggestions\(spaceId \|\| undefined, text\)/);
  // The engine owns the rule for a part-written word against a finished one.
  assert.match(suggestions, /applySuggestion\(text, word\)/);
  assert.doesNotMatch(
    suggestions,
    /replace\(\/\\S\+\$\//,
    "the UI must not split the text itself",
  );
});

test("the word row is its own lane, nearest the composer", async () => {
  const suggestions = await readText("src/blocks/suggestions.tsx");

  // A word from the engine is not a saved phrase and not a sentence, so it
  // rides the warm lane. It sits closest to the text the user is writing.
  assert.ok(
    suggestions.indexOf("border-chart-1/50") >
      suggestions.indexOf("LANE[stripe.source]"),
    "the word row must come after the sentence rows",
  );
});

test("colour is never the only sign of where a row came from", async () => {
  const suggestions = await readText("src/blocks/suggestions.tsx");
  const mark = suggestions.match(/function SourceMark[\s\S]*?\n\}\n/)[0];

  // Every source has a mark in the gutter, so a user who does not read colour
  // still knows what a row is.
  for (const source of ["code", "starter", "history", "md"]) {
    assert.match(mark, new RegExp(`source === "${source}"`), source);
  }
  // The row from a model is the one without a mark.
  assert.match(mark, /quiet baseline/);
});

test("the tiles use the sizes and the tokens of the web app", async () => {
  const suggestions = await readText("src/blocks/suggestions.tsx");
  const stripes = await readText("src/rules/stripes.ts");
  const styles = await readText("../../packages/ui/theme.css");

  // The pixel sizes mirror `STRIPE_BASE` in the web app, and they live beside
  // the scale that uses them.
  assert.match(stripes, /fontPx: 16/);
  assert.match(stripes, /minHeightPx: 46/);
  assert.match(stripes, /punctPadXPx: 10/);
  assert.match(suggestions, /rounded-chip/);
  assert.match(suggestions, /rounded-control/);

  // Those class names need their tokens, with the values of apps/web.
  assert.match(styles, /--radius-chip: 0\.875rem/);
  assert.match(styles, /--radius-control: 0\.75rem/);
  assert.match(styles, /--chart-1: oklch\(0\.646 0\.222 41\.116\)/);
  assert.match(styles, /--chart-2: oklch\(0\.6 0\.118 184\.704\)/);
});

test("a hover shows the words a press would take", async () => {
  const suggestions = await readText("src/blocks/suggestions.tsx");

  assert.match(suggestions, /index <= hover\.index/);
  assert.match(suggestions, /active \? lane\.active : lane\.idle/);
});

// ------------------------------------------------- the name of a new space

test("a title September wrote is known apart from one the user typed", () => {
  // The model may rename a space that still holds its made-up title.
  assert.equal(isAutoTitle("General"), true);
  assert.equal(isAutoTitle("New space"), true);
  assert.equal(isAutoTitle("New space 2"), true);
  assert.equal(isAutoTitle("new space 12"), true);

  // A name of three words is made up too.
  const made = newSpaceTitle(["General"], () => 0);
  assert.equal(isAutoTitle(made), true);

  // A title the user typed is the user's. The model never takes it.
  assert.equal(isAutoTitle("Mum"), false);
  assert.equal(isAutoTitle("New space plans"), false);
  assert.equal(isAutoTitle(undefined), false);
  // Three words, but not the words of the app.
  assert.equal(isAutoTitle("Sunday with my sister"), false);
  assert.equal(isAutoTitle("Talk to Mum"), false);
});

test("a title that another space already holds is not free", () => {
  assert.equal(freeTitle("Mum", ["Dad", "General"]), "Mum");
  assert.equal(freeTitle("Mum", []), "Mum");

  // The slug decides, not the letters, because the slug is the address.
  assert.equal(freeTitle("Mum", ["mum"]), null);
  assert.equal(freeTitle("Doctor Ramesh", ["doctor — ramesh"]), null);

  // A title of no letters names no space.
  assert.equal(freeTitle("  ", ["Mum"]), null);
  assert.equal(freeTitle("", []), null);
});

test("the words of a new space frame the suggestions as a description", () => {
  // With no space yet, there is no context to write from. Without a frame the
  // model answers as if the user were talking to somebody, because the
  // suggestion prompts are written for a conversation.
  const { system } = buildSuggestionPrompt({
    globalMd: "",
    spaceMd: NEW_SPACE_CONTEXT,
    history: [],
    typed: "I speak to my",
  });

  assert.match(system, /<user_context>/);
  assert.ok(system.includes(NEW_SPACE_CONTEXT));
  // The frame is written as the user, the same as every other context.
  assert.match(NEW_SPACE_CONTEXT, /^I /);
});

test("the first turn of a new space sets it up without asking", async () => {
  const rules = await readText("src/rules/agent.ts");
  const agent = await readText("src/pages/agent.tsx");

  // The work used to be a list of ticking rows that the screen navigated away
  // from the moment it finished, and then two bespoke services beside the
  // agent. It is the space's own agent now, on its own first turn, making
  // ordinary tool calls into the ordinary transcript.
  const prompt = rules.match(/const INTRODUCTION_SYSTEM_PROMPT = `[\s\S]*?`;/)[0];
  assert.match(prompt, /inspect_space/);
  assert.match(prompt, /configure_space/);
  assert.match(prompt, /change_phrase/);
  assert.match(prompt, /first person/);
  // The ordinary prompt promises the user approves every write. This one must
  // not, or the model stops and asks on the screen that made the space.
  assert.doesNotMatch(prompt, /must approve/);

  assert.match(agent, /intro: true/);
});

test("a rename that another space already holds is refused, and says why", async () => {
  const block = await readText("src/blocks/space.tsx");
  const title = block.match(/export function SpaceTitle\([\s\S]*?\n\}\n/)[0];

  // `newSpaceTitle` works hard to give out a free name, and a rename could
  // undo that in one keystroke: two spaces with one title share one address,
  // and the address then opens the wrong space.
  assert.match(title, /freeTitle/);
  // The user typed this name on purpose, so September must not quietly change
  // it to another. It keeps their words and says what is wrong.
  assert.match(title, /already called/);
  assert.ok(
    title.indexOf("freeTitle") < title.indexOf("update.mutate"),
    "the check must come before the write",
  );
});

test("the composer names its action by mode, and one of them makes a space", () => {
  assert.equal(composerAction("talk").label, "Speak");
  assert.equal(composerAction("notes").label, "Add to note");
  assert.equal(composerAction("new").label, "Create space");

  // Every mode gives the field words of its own, so a user knows what the
  // console is for before they type into it.
  for (const mode of ["talk", "notes", "new"]) {
    assert.ok(composerAction(mode).placeholder.length > 0, mode);
    assert.ok(composerAction(mode).field.length > 0, mode);
  }

  // Only Talk makes a sound, so only Talk says where the sound comes out.
  assert.equal(composerAction("talk").speaks, true);
  assert.equal(composerAction("new").speaks, false);
  assert.equal(composerAction("notes").speaks, false);
});

test("the composer never takes focus off the control that was pressed", async () => {
  const space = await readText("src/blocks/space.tsx");
  const composer = space.match(/export function Composer\([\s\S]*?\n\}\n/)[0];

  // A disabled element cannot hold focus, so the browser moves focus to the
  // body. A switch user loses their place in the scan, and a reader loses
  // its place in the page, at the moment the app asks them to wait. Every
  // control of the console says it is unavailable instead, and its handler
  // does nothing.
  assert.match(composer, /aria-disabled=\{/);
  assert.doesNotMatch(composer, /\sdisabled=\{/);
});

test("a model call for a new space can be given up on", async () => {
  const sync = await readText("src/services/phrase-sync.ts");
  const spaces = await readText("src/pages/agent.tsx");

  // A user who cannot press a second time must not be held by a service that
  // hangs. The first turn is a chain of calls, so one signal bounds them all.
  assert.match(sync, /feature: "phrases", signal/);
  assert.match(spaces, /signal: AbortSignal\.timeout\(INTRODUCTION_WAIT_MS\)/);
});

test("a turn writes without asking, but not for ever", async () => {
  const rules = await readText("src/rules/agent.ts");

  // Only a delete waits for a press. A change the user can see and undo by
  // asking is not worth the keystrokes that approving it costs them.
  assert.match(
    rules,
    /if \(!agentCallNeedsApproval\(name, raw\) && applied < AGENT_MAX_WRITES\)/,
  );

  // Nothing else stops a model that keeps writing, so the budget is counted
  // from the transcript: approving a change starts a fresh turn, and a flag
  // would reset with it.
  assert.match(rules, /const writesThisTurn = /);
  assert.ok(AGENT_MAX_WRITES > 1 && AGENT_MAX_WRITES <= 20);

  // A model that hangs must not hold the work for ever.
  assert.match(rules, /export const INTRODUCTION_WAIT_MS/);
});

test("the note of a space is added under the words of the user", () => {
  const { system, user } = buildSpaceContextPrompt("I need water please");

  assert.match(system, /title/);
  assert.match(system, /context/);
  assert.match(user, /I need water please/);

  // The words come from a first message, or from the new-space screen. The
  // prompt no longer names one of the two.
  assert.doesNotMatch(system, /From the User's first message/);
  assert.match(system, /what is this space for/);

  // The note goes under the words of the user, so it must not repeat them.
  assert.match(system, /Do NOT repeat/);

  // The same rules as the other prompts: one line about the user, no example
  // message, and the shape of the answer written out.
  assert.match(system, /The User is using a communication app/);
  assert.doesNotMatch(system, /<example/);
  assert.match(system, /Answer with JSON: \{"title"/);
});

test("the name and the note are read back from the answer", () => {
  const answer = spaceDescriptionFrom(
    '{"title":"Asking for water","context":"I am talking to my carer."}',
  );
  assert.deepEqual(answer, {
    title: "Asking for water",
    context: "I am talking to my carer.",
  });

  // A title is a tab in the dock, so a long one is cut to fit.
  const long = spaceDescriptionFrom(
    JSON.stringify({ title: "x".repeat(80), context: "note" }),
  );
  assert.equal(long.title.length, 50);

  // A note without a title is still worth keeping.
  assert.deepEqual(spaceDescriptionFrom('{"context":"a note"}'), {
    title: "",
    context: "a note",
  });

  // Nothing usable gives nothing.
  assert.equal(spaceDescriptionFrom("not json"), null);
  assert.equal(spaceDescriptionFrom('{"title":"  ","context":""}'), null);
});

test("Talk speaks, and the new-space screen does the naming", async () => {
  const talk = await readText("src/pages/talk.tsx");

  // `/spaces/new` asks what the space is for before the space exists. A first
  // message that asked again paid for an answer the guards then threw away.
  assert.doesNotMatch(talk, /describeSpace/);
  assert.doesNotMatch(talk, /useUpdateSpace/);
});

// ------------------------------------------------------ where sound comes out

test("September owns its sound-output choice", async () => {
  const os = await readText("src/services/os.ts");
  const rpc = await readText("src-tauri/src/rpc.rs");
  const audio = await readText("src-tauri/src/audio.rs");
  const native = await readText("src-tauri/native/audio.m");

  assert.match(os, /audio_outputs/);
  assert.match(os, /audio_output_set/);
  assert.match(rpc, /AUDIO_OUTPUT_SETTING/);
  // The selected device belongs to September's output audio unit. The system
  // default is read only as a fallback and is never written.
  assert.match(native, /kAudioOutputUnitProperty_CurrentDevice/);
  assert.match(native, /writeUtterance/);
  assert.match(native, /AVAudioPlayerNode/);
  assert.doesNotMatch(native, /speakUtterance/);
  assert.doesNotMatch(audio, /set_default_output/);
  assert.doesNotMatch(audio, /AudioObjectSetPropertyData/);
  assert.doesNotMatch(os, /"audio-output"/);
});

test("the audio selector sits beside Speak and names September", async () => {
  const talk = await readText("src/blocks/space.tsx");
  const picker = talk.match(/function AudioSelector[\s\S]*?\n\}\n/)[0];

  assert.match(picker, /September audio/);
  assert.doesNotMatch(picker, /Sound output for this device/i);
  // The picker is next to the button that makes the sound.
  assert.ok(
    talk.indexOf("<AudioSelector") < talk.indexOf("<ActionIcon"),
    "the picker must come before the button that speaks",
  );
});

// ------------------------------------------------------------------- notes

test("a note with no name of its own takes one from its first words", () => {
  assert.equal(noteNameIsUnset(undefined), true);
  assert.equal(noteNameIsUnset("  "), true);
  assert.equal(noteNameIsUnset("Untitled note"), true);
  assert.equal(noteNameIsUnset("Letter to Dr Shah"), false);

  // The markup is not part of the name a user reads.
  assert.equal(
    noteNameFromContent("# Letter to **Dr Shah** about the new chair"),
    "Letter to Dr Shah about the",
  );
  assert.equal(noteNameFromContent("   "), undefined);
});

test("the first save names a note, and a later save leaves the name alone", () => {
  assert.deepEqual(noteContentUpdates(undefined, "Ask about the ramp"), {
    content: "Ask about the ramp",
    name: "Ask about the ramp",
  });
  // A name the user typed is the user's.
  assert.deepEqual(noteContentUpdates("My letter", "Ask about the ramp"), {
    content: "Ask about the ramp",
  });
});

test("a note is found by its slug, and an unnamed note still has one", () => {
  const notes = [
    { id: "n1", name: "Letter to Dr Shah" },
    { id: "n2", name: undefined },
  ];

  assert.equal(noteSlug("Letter to Dr Shah"), "letter-to-dr-shah");
  assert.equal(noteSlug(undefined), "note");
  assert.equal(noteFromSlug("letter-to-dr-shah", notes)?.id, "n1");
  assert.equal(noteFromSlug("note", notes)?.id, "n2");
  assert.equal(noteFromSlug("nothing", notes), undefined);
});

test("a voice reads the words of a note, not its markup", () => {
  const spoken = markdownToVoiceText(
    "# Monday\n\n- Ask about the *ramp*\n- Read [the letter](http://x.test)",
  );

  assert.equal(spoken, "Monday Ask about the ramp Read the letter");
});

test("a note is read and written through the data module", async () => {
  const data = await readText("src/services/data.ts");

  assert.match(data, /note_list/);
  assert.match(data, /note_put/);
  assert.match(data, /note_delete/);
});

test("the note screen autosaves and speaks with the chosen voice", async () => {
  const notes = await readText("src/pages/notes.tsx");

  // A user who cannot speak must never lose written words to a missed save.
  assert.match(notes, /markdownToVoiceText/);
  assert.match(notes, /noteContentUpdates/);
  // A new name makes a new slug, so the open address must follow it.
  assert.match(notes, /replace: true/);
});

test("a space opens in Talk, Notes, or Agent, and every route exists", async () => {
  const main = await readText("src/main.tsx");

  assert.match(main, /\/spaces\/\$slug\/agent/);
  assert.match(main, /\/spaces\/\$slug\/notes/);
  assert.match(main, /\/spaces\/\$slug\/notes\/\$noteSlug/);
});

// -------------------------------------------------------- present and export

test("the note header offers the voice, the stage, the file, and the bin", async () => {
  const notes = await readText("src/pages/notes.tsx");

  assert.match(notes, /Read aloud/);
  assert.match(notes, /<PresentOverlay/);
  assert.match(notes, /Export/);
  assert.match(notes, /Delete note/);
  // Present carries the note, so it is the filled pill of the four.
  assert.match(notes, /Present/);
});

test("presenting is an overlay, so the addresses of the app do not change", async () => {
  const main = await readText("src/main.tsx");
  const present = await readText("src/blocks/present.tsx");

  // A route would need a window title, an opening path, and a place in the
  // frozen route list. A presentation is a state of the note screen instead.
  assert.doesNotMatch(main, /present/i);
  assert.match(present, /fixed inset-0/);
  assert.match(present, /z-50/);
});

test("a presentation speaks one chunk and moves on when the sound stops", async () => {
  const present = await readText("src/blocks/present.tsx");
  const speech = await readText("src/services/speech.ts");

  // The whole spoken mode rests on this contract of the speech service.
  assert.match(speech, /It resolves when the sound stops/);
  assert.match(present, /await speak\(/);
  assert.match(present, /stepChunk\(/);
});

test("a presentation with no voice at all still runs", async () => {
  const present = await readText("src/blocks/present.tsx");

  // Silent mode is the reason Present needs no setup: big words, and a
  // partner who reads them. The speaker switch turns it on mid-story.
  assert.match(present, /spoken/);
  assert.match(present, /Turn the voice (on|off)/);
  // Nothing on the stage waits on a service, so nothing here is disabled.
  assert.doesNotMatch(present, /\sdisabled=/);
  assert.match(present, /aria-disabled/);
});

test("every control of the stage keeps the 44px target", async () => {
  const present = await readText("src/blocks/present.tsx");

  assert.match(present, /size-11/);
  // Thirds of the stage: back, hold, on. A press lands somewhere useful.
  assert.match(present, /Previous chunk/);
  assert.match(present, /Next chunk/);
  assert.match(present, /aria-label="Close the presentation"/);
});

test("the keys of the stage are the keys of a remote", async () => {
  const present = await readText("src/blocks/present.tsx");

  for (const key of [
    "ArrowRight",
    "ArrowLeft",
    "Home",
    "End",
    "Escape",
    '" "',
  ]) {
    assert.match(present, new RegExp(key.replace(/[[\]]/g, "\\$&")), key);
  }
  // A chunk rises in, unless the user asked for no motion.
  assert.match(present, /motion-reduce:/);
});

test("the tone and the sound of a presentation are remembered", async () => {
  const os = await readText("src/services/os.ts");
  const present = await readText("src/blocks/present.tsx");

  assert.match(os, /key: "present"/);
  assert.match(os, /presentSettings/);
  assert.match(present, /rememberPresent/);
  // Seven tones, one row, behind a switch: presenting is not editing.
  assert.match(present, /PRESENT_TONES/);
  assert.match(present, /Colours/);
});

test("the words of a note save with no service connected", async () => {
  const { exportReason, exportFileName } =
    await import("../src/rules/present.ts");
  const exporter = await readText("src/services/export.ts");

  assert.equal(
    exportReason("text", { provider: "system", voiceId: null, video: false }),
    null,
  );
  assert.equal(
    exportFileName("Letter to Dr Shah", "text"),
    "letter-to-dr-shah.md",
  );
  // The same download path as the usage report: a Blob the WebView saves.
  assert.match(exporter, /createObjectURL/);
  assert.match(exporter, /revokeObjectURL/);
});

test("the Mac says where a video comes from, instead of hiding the row", async () => {
  const { exportReason } = await import("../src/rules/present.ts");
  const exporter = await readText("src/services/export.ts");

  // The desktop WebView cannot load the ffmpeg core under the app policy yet.
  assert.match(exporter, /VIDEO_EXPORT = false/);
  assert.match(
    exportReason("video", {
      provider: "elevenlabs",
      voiceId: "v1",
      video: false,
    }),
    /browser/,
  );
});

test("the retired name is gone from both apps", async () => {
  const roots = [
    "apps/web/src",
    "apps/desktop/src",
    "packages/app-ui",
    "packages/core/rules",
  ];
  const repositoryRoot = new URL("../../../", import.meta.url);
  const found = [];

  const walk = async (path) => {
    for (const entry of await readdir(new URL(path, repositoryRoot), {
      withFileTypes: true,
    })) {
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory()) {
        await walk(child);
      } else if (/\.tsx?$/.test(entry.name)) {
        // The words September says, without the notes it keeps to itself: a
        // comment may still name the feature this one replaced.
        const source = (await readFile(new URL(child, repositoryRoot), "utf8"))
          .replace(/\/\*[\s\S]*?\*\//g, " ")
          .replace(/^\s*\/\/.*$/gm, " ");
        // One name for each thing September does. "Present" replaced the
        // borrowed social-media noun, and the old one must not creep back.
        if (/\breels?\b/i.test(source)) found.push(child);
      }
    }
  };

  for (const root of roots) await walk(root);
  assert.deepEqual(found, []);
});

test("a presentation and an export are counted like the rest", async () => {
  const usage = await readText("src/services/usage.ts");

  assert.match(usage, /note_present/);
  assert.match(usage, /note_export/);
});

// ------------------------------------------------- the dock and the right rail

test("a space opens in the mode it was left in", () => {
  assert.equal(spaceModeFrom({}, "general"), "talk");
  assert.equal(spaceModeFrom({ general: "notes" }, "general"), "notes");
  assert.equal(spaceModeFrom({ general: "talk" }, "general"), "talk");
  // A value that names no mode cannot open a screen that is not there.
  assert.equal(spaceModeFrom({ general: "reel" }, "general"), "talk");
  assert.equal(spaceModeFrom({ other: "notes" }, "general"), "talk");

  assert.deepEqual(rememberSpaceMode({}, "general", "notes"), {
    general: "notes",
  });
  // The mode of one space never moves the mode of another.
  assert.deepEqual(rememberSpaceMode({ work: "notes" }, "general", "talk"), {
    work: "notes",
    general: "talk",
  });
});

test("the mode switch is in the dock, beside the spaces", async () => {
  const talk = await readText("src/blocks/space.tsx");
  const shell = await readText("src/layouts/app.tsx");

  // The web app puts Talk, Notes, and Agent in the dock. The desktop app does too, so
  // a user who knows one app knows the other.
  const dock = talk.match(/export function SpaceDock[\s\S]*?\n\}\n/)[0];
  assert.match(dock, /ModeGroup/);
  assert.match(dock, /ml-auto/);
  // The header held the tabs before. It must not hold a second switch.
  assert.doesNotMatch(shell, /SpaceModes/);
});

test("the space agent keeps its transcript separate and asks before deleting", async () => {
  const agent = await readText("src/pages/agent.tsx");
  const ai = await readText("src/services/ai.ts");
  const data = await readText("src/services/data.ts");
  const migration = await readText(
    "src-tauri/migrations/0004_agent_messages.sql",
  );

  assert.match(agent, /useAgentMessages/);
  // The screen must not promise a press it no longer asks for. It changes
  // the space when the user asks, and stops only at a delete.
  assert.doesNotMatch(agent, /until you approve it/);
  assert.match(agent, /Approve/);
  assert.match(agent, /Reject/);
  assert.match(agent, /DeleteProposalDialog/);
  assert.match(
    agent,
    /useEffect\(\(\) => \{\s*end\.current\?\.scrollIntoView/,
    "the scroll effect must not return the browser's scroll result as React cleanup",
  );
  assert.match(ai, /openrouter\/free/);
  assert.doesNotMatch(ai, /FREE_AGENT_MODELS/);
  assert.match(data, /agent_message_list/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS agent_messages/);
  assert.match(migration, /ON DELETE CASCADE/);
});

test("the transcript folds its tools and cards only what needs a press", async () => {
  const block = await readText("src/blocks/agent-transcript.tsx");

  // One rule holds the screen together: anything the user must act on is a
  // card, and everything else is a line. Every tool call used to be a
  // bordered, shadowed card the size of a message, so a question answered
  // after three reads filled the screen with paperwork before the answer.
  const line = block.match(/export function ToolLine[\s\S]*?\n\}\n/)[0];
  assert.match(line, /<details/);
  assert.doesNotMatch(line, /<details open/);
  assert.doesNotMatch(line, /shadow/);

  // The whole row is the control, at 44px, and it is a real one: `summary`
  // announces its own expanded state and takes the keyboard for free.
  assert.match(line, /<summary/);
  assert.match(line, /min-h-11/);

  // The card is the only thing on the screen that carries a border and a
  // shadow, because it is the only thing waiting for a press.
  const card = block.match(/export function ProposalCard[\s\S]*?\n\}\n/)[0];
  assert.match(card, /shadow-sm/);
  assert.match(card, /Approve/);
  assert.match(card, /Reject/);
  assert.doesNotMatch(card, /<details/);
});

test("a settled tool says what became of it in a word, not only a colour", async () => {
  const rules = await readText("src/rules/agent.ts");
  const block = await readText("src/blocks/agent-transcript.tsx");

  // A user who cannot tell emerald from red must still be able to tell a
  // change that landed from one that did not.
  for (const label of [
    "Read",
    "Applied",
    "Not applied",
    "Could not apply",
    "Waiting for you",
  ]) {
    assert.ok(rules.includes(`label: "${label}"`), label);
  }
  assert.match(block, /agentToolOutcome/);
  assert.match(block, /\{label\}/);
});

test("consecutive reads fold into one line, and a write never folds", async () => {
  const rules = await readText("src/rules/agent.ts");
  const block = await readText("src/blocks/agent-transcript.tsx");

  // A user asked one question, not three. The reads behind one answer are a
  // footnote to it; a write is either waiting for a press or it changed
  // their space, and neither of those is a footnote.
  assert.match(rules, /export function groupAgentTurns/);
  assert.match(block, /and \$\{rest\.length\} more/);
});

test("the Agent console keeps every writing aid, and makes no sound", async () => {
  const agent = await readText("src/pages/agent.tsx");
  const composer = await readText("src/blocks/space.tsx");

  // The redesign is above the console. The console itself does not move:
  // undo, delete-last-word, and clear are what make this app worth using to
  // somebody typing by switch.
  const screen = agent.match(
    /function Agent\(\{ space, spaces \}[\s\S]*?\n\}\n/,
  )[0];
  assert.match(screen, /<Composer/);
  assert.match(screen, /mode="agent"/);
  assert.match(screen, /suggestions=\{false\}/);
  assert.doesNotMatch(screen, /<textarea/);

  for (const label of ["Undo", "Delete last word", "Clear"]) {
    assert.ok(composer.includes(`aria-label="${label}"`), label);
  }

  // Agent speaks nothing, so the sound output does not belong beside Ask.
  const action = composer.match(/\{speaks \? <AudioSelector \/> : null\}/);
  assert.ok(action, "the audio selector belongs to the modes that speak");
});

test("a screen shows work it did not start", async () => {
  const rules = await readText("src/rules/agent.ts");
  const spaces = await readText("src/pages/agent.tsx");

  // The introduction of a new space runs on past the screen that asked for
  // it, so the screen that shows the transcript did not start the turn it is
  // waiting on. An owed reply is how it knows.
  assert.match(rules, /export function agentOwesReply/);
  assert.match(rules, /INTRODUCTION_WAIT_MS/);
  assert.match(spaces, /agentOwesReply\(rows, Date\.now\(\)\)/);

  // An app closed mid-run would otherwise promise an answer for ever.
  assert.match(rules, /now - last\.created_at < INTRODUCTION_WAIT_MS/);
});

test("the space tabs fall back to a list when the row is full", async () => {
  const talk = await readText("src/blocks/space.tsx");
  const dock = talk.match(/export function SpaceDock[\s\S]*?\n\}\n/)[0];

  // A row that overflows its box no longer fits, which is the only measure
  // that holds at every width.
  assert.match(dock, /ResizeObserver/);
  assert.match(dock, /scrollWidth/);
  assert.match(dock, /DropdownMenu/);
});

test("the right rail holds the phrases, and stays where the user left it", async () => {
  const panel = await readText("src/blocks/space-panel.tsx");
  const shell = await readText("src/layouts/app.tsx");

  assert.match(panel, /PanelRail/);
  assert.match(panel, /Panel rail/);
  // The rail is always there. Only the card beside it opens and closes.
  assert.match(panel, /Collapse panel/);
  // The desktop app keeps its state in SQLite, not in the browser storage.
  assert.doesNotMatch(panel, /localStorage/);
  // The rail is a card of its own, beside the screen, not inside it.
  assert.match(shell, /RightPanel/);

  // Every screen inside a space carries it, Agent included. The rail is how
  // the phrases of a space are reached, and Agent is where they are written.
  for (const file of ["talk", "notes", "agent"]) {
    const screen = await readText(`src/pages/${file}.tsx`);
    assert.match(screen, /<RightPanel>/, `${file} has no right panel`);
    assert.match(screen, /<PanelRail/, `${file} has no panel rail`);
  }
});

// -------------------------------------------------- the composer in Notes

test("words go under the note, with a blank line between them", () => {
  assert.equal(appendToNote("", "Ask about the ramp"), "Ask about the ramp");
  assert.equal(appendToNote("   ", "Ask about the ramp"), "Ask about the ramp");
  assert.equal(
    appendToNote("# Monday", "Ask about the ramp"),
    "# Monday\n\nAsk about the ramp",
  );
  // Trailing space in the note must not make three blank lines.
  assert.equal(
    appendToNote("# Monday\n\n", "Ask about the ramp"),
    "# Monday\n\nAsk about the ramp",
  );
  // Nothing to add leaves the note as it is.
  assert.equal(appendToNote("# Monday", "   "), "# Monday");
});

test("Notes and Talk share one composer", async () => {
  const block = await readText("src/blocks/space.tsx");
  const talk = await readText("src/pages/talk.tsx");
  const notes = await readText("src/pages/notes.tsx");

  // A user who cannot type must reach the same word tiles, the same codes,
  // undo, and delete last word in both modes. One component, not two.
  assert.match(block, /export function Composer/);
  assert.match(talk, /<Composer/);
  assert.doesNotMatch(talk, /function Composer/);
  assert.match(notes, /<Composer/);
  assert.doesNotMatch(notes, /function Composer/);
});

test("a space carries a note that says who it is for", async () => {
  const rules = await readText("src/rules/agent.ts");
  const spaces = await readText("src/pages/agent.tsx");
  const notes = await readText("src/pages/notes.tsx");

  // The words of the user are the note before any model runs.
  assert.match(spaces, /context: said/);

  // The model adds its description under them and never writes over them.
  // This is an instruction now, not a call the app makes, so it is the
  // prompt that has to say it.
  const prompt = rules.match(/const INTRODUCTION_SYSTEM_PROMPT = `[\s\S]*?`;/)[0];
  assert.match(prompt, /keep the user's own words exactly as they wrote them/);
  assert.match(prompt, /Never write over their words/);

  // The note is a tab of the Notes screen, the same as in the web app.
  assert.match(notes, /function SpaceAbout/);
  assert.match(notes, /About this space/);
  // It writes one field of the space, and not a note.
  assert.match(notes, /useUpdateSpace/);
  assert.match(notes, /context: written/);
});

test("the composer adds words to the note, and does not speak them", async () => {
  const notes = await readText("src/pages/notes.tsx");
  const block = await readText("src/blocks/space.tsx");
  const composer = block.match(/export function Composer[\s\S]*?\n\}\n/)[0];

  assert.match(notes, /mode="notes"/);
  assert.match(notes, /appendToNote/);
  // One console, three endings: Talk speaks the sentence, Notes files it, and
  // the new-space screen makes the space. The words of each are in the rule,
  // where a test reads them without a renderer.
  assert.equal(composerAction("notes").label, "Add to note");
  // The sound output belongs beside the button that makes a sound. Notes
  // makes none, so it shows no picker.
  assert.match(composer, /speaks \? <AudioSelector \/> : null/);
});
