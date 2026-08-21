import { spawnSync } from "node:child_process";

const mode = process.argv[2];

if (!new Set(["dev", "build"]).has(mode)) {
  throw new Error("usage: node scripts/tauri.mjs <dev|build>");
}

const usesApfel = process.platform === "darwin" && process.arch === "arm64";

if (usesApfel) {
  run("node", ["scripts/prepare-apfel.mjs"]);
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
