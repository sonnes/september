#!/usr/bin/env node
// Capture September app screenshots across multiple screen sizes.
//
// September is local-first: all data lives in the browser's IndexedDB and there is no
// server-side auth — so there is no token to mint. A fresh headless context starts EMPTY,
// which is fine for marketing/static routes but means detail pages (a talk space, a note)
// have nothing to show. To capture populated surfaces, point --user-data-dir at a Chrome
// profile where you've already used the app; its IndexedDB then carries into the run.
// See SKILL.md for details.
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const BASE = str(args.base, "http://localhost:3009");
const OUT = str(args.out, "docs/screenshots");
const CHANNEL = str(args.channel, "chrome");
const THEMES = str(args.theme, "light").split(",").map((t) => t.trim()).filter(Boolean);
const SIZE_KEYS = str(args.sizes, "desktop,laptop,tablet,mobile").split(",").map((s) => s.trim());
const SETTLE = Number(str(args.settle, "2000"));
const USER_DATA_DIR = typeof args["user-data-dir"] === "string" ? expandHome(args["user-data-dir"]) : null;

const SIZES = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 800 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Injected before any app script runs. September's dark mode is class-based
// (`.dark` on <html>, see src/styles/globals.css) rather than prefers-color-scheme,
// so emulating colorScheme does nothing — we toggle the class ourselves.
const darkInit = `
  try {
    const apply = () => document.documentElement.classList.add('dark');
    apply();
    new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  } catch {}
`;

async function main() {
  const sizes = SIZE_KEYS.filter((k) => {
    if (!SIZES[k]) console.warn(`⚠ unknown size '${k}' — skipping`);
    return SIZES[k];
  });

  let count = 0;

  for (const theme of THEMES) {
    for (const sizeKey of sizes) {
      const ctxOpts = {
        viewport: SIZES[sizeKey],
        deviceScaleFactor: 2,
        isMobile: sizeKey === "mobile",
        hasTouch: sizeKey === "mobile",
      };

      // Persistent context keeps IndexedDB/localStorage between runs, so a profile you've
      // seeded by hand shows real spaces/notes. Otherwise a throwaway context per size.
      let browser = null;
      let ctx;
      if (USER_DATA_DIR) {
        ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
          channel: CHANNEL,
          headless: true,
          ...ctxOpts,
        });
      } else {
        browser = await chromium.launch({ channel: CHANNEL, headless: true });
        ctx = await browser.newContext(ctxOpts);
      }

      if (theme === "dark") await ctx.addInitScript(darkInit);

      const page = ctx.pages()[0] ?? (await ctx.newPage());
      const dir = THEMES.length > 1 ? path.join(OUT, theme, sizeKey) : path.join(OUT, sizeKey);
      await mkdir(dir, { recursive: true });

      // Discover detail-page slugs from the live DOM (no filesystem to read — data is in
      // IndexedDB). Do it once per context after a warm-up load.
      const ids = await discover(page);
      const routes =
        typeof args.routes === "string"
          ? args.routes.split(",").map((p, i) => ({ name: `${pad(i + 1)}-${slug(p)}`, path: p.trim() }))
          : buildRoutes(ids);

      for (const r of routes) {
        try {
          await page.goto(BASE + r.path, { waitUntil: "domcontentloaded" });
          await page.waitForLoadState("networkidle").catch(() => {});
          await sleep(SETTLE);
          await page.screenshot({ path: path.join(dir, `${r.name}.png`) });
          count++;
          console.log(`  ${theme}/${sizeKey}  ${r.name}`);
        } catch (e) {
          console.error(`  FAIL ${theme}/${sizeKey} ${r.name}: ${e.message}`);
        }
      }

      await ctx.close();
      if (browser) await browser.close();
    }
  }

  console.log(`\n✓ ${count} screenshots → ${OUT}`);
}

// discover loads /talk and /notes and reads the first space slug from the rendered links.
// Empty store → null, and the detail routes are simply dropped.
async function discover(page) {
  const ids = { talkSpace: null, noteSpace: null };
  ids.talkSpace = await firstSlug(page, "/talk", '/talk/');
  ids.noteSpace = await firstSlug(page, "/notes", '/notes/');
  return ids;
}

async function firstSlug(page, route, prefix) {
  try {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await sleep(800);
    const href = await page.evaluate((p) => {
      const a = document.querySelector(`a[href^="${p}"]`);
      return a ? a.getAttribute("href") : null;
    }, prefix);
    if (!href) return null;
    const rest = href.slice(prefix.length).split(/[/?#]/)[0];
    return rest || null;
  } catch {
    return null;
  }
}

function buildRoutes(ids) {
  return [
    ["01-home", "/"],
    ["02-onboarding", "/onboarding"],
    ["03-dashboard", "/dashboard"],
    ["04-talk", "/talk"],
    ids.talkSpace && ["05-talk-space", `/talk/${ids.talkSpace}`],
    ["06-notes", "/notes"],
    ids.noteSpace && ["07-note-space", `/notes/${ids.noteSpace}`],
    ["08-voices", "/voices"],
    ["09-clone", "/clone"],
    ["10-help", "/help"],
    ["11-settings", "/settings"],
    ["12-settings-providers", "/settings/providers"],
    ["13-settings-speech", "/settings/speech"],
    ["14-settings-suggestions", "/settings/suggestions"],
    ["15-settings-transcription", "/settings/transcription"],
    ["16-privacy", "/privacy-policy"],
    ["17-terms", "/terms-of-service"],
  ]
    .filter(Boolean)
    .map(([name, p]) => ({ name, path: p }));
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];
    if (!a.startsWith("--")) continue;
    a = a.slice(2);
    if (a.includes("=")) {
      const idx = a.indexOf("=");
      out[a.slice(0, idx)] = a.slice(idx + 1);
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
      out[a] = argv[++i];
    } else {
      out[a] = "true";
    }
  }
  return out;
}

function str(v, d) {
  return typeof v === "string" && v.length ? v : d;
}
function pad(n) {
  return String(n).padStart(2, "0");
}
function slug(p) {
  return p.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "root";
}
function expandHome(p) {
  return p.startsWith("~") ? path.join(homedir(), p.slice(1)) : p;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
