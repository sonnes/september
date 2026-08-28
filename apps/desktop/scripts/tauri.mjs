import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const mode = process.argv[2];

if (!new Set(["dev", "build"]).has(mode)) {
  throw new Error("usage: node scripts/tauri.mjs <dev|build>");
}

const usesApfel = process.platform === "darwin" && process.arch === "arm64";

if (usesApfel) {
  run("node", ["scripts/prepare-apfel.mjs"]);
}

const signsForDistribution =
  mode === "build" &&
  process.platform === "darwin" &&
  process.env.APPLE_TEAM_ID &&
  process.env.APPLE_SIGNING_IDENTITY;
const stagedProfile = fileURLToPath(
  new URL("../src-tauri/embedded.provisionprofile", import.meta.url),
);

if (signsForDistribution) {
  const profile = process.env.APPLE_PROVISIONING_PROFILE;
  if (!profile || !existsSync(profile)) {
    throw new Error(
      "A signed macOS build needs APPLE_PROVISIONING_PROFILE to name an existing Developer ID profile.",
    );
  }
  copyFileSync(profile, stagedProfile);
  process.on("exit", () => rmSync(stagedProfile, { force: true }));
}

const args = [mode];
if (usesApfel) {
  args.push("--config", "src-tauri/tauri.apfel.conf.json");
}
run("pnpm", ["exec", "tauri", ...args]);

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
