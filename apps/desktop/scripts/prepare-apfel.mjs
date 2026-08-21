import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const version = "1.9.1";
const archiveSha256 = "0963364beffe20017b8ee484b0bc7c82560a518f2ae6229f3f2490f71750d403";
const binarySha256 = "d31df659ab2d1a61b7194d44f1b94b42de97cb4751616f362e25513b03efc3da";
const url = `https://github.com/Arthur-Ficial/apfel/releases/download/v${version}/apfel-${version}-arm64-macos.tar.gz`;
const desktopRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(
  desktopRoot,
  "src-tauri",
  "binaries",
  "apfel-aarch64-apple-darwin",
);

if ((await sha256(target)) === binarySha256) {
  console.log(`apfel v${version} is ready`);
  process.exit(0);
}

const scratch = await mkdtemp(join(tmpdir(), "september-apfel-"));

try {
  const archive = join(scratch, "apfel.tar.gz");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`could not download apfel: HTTP ${response.status}`);
  }
  await writeFile(archive, new Uint8Array(await response.arrayBuffer()));
  assertHash("apfel archive", await sha256(archive), archiveSha256);

  const unpacked = join(scratch, "apfel");
  run("tar", ["-xzf", archive, "-C", scratch, "apfel"]);
  assertHash("apfel binary", await sha256(unpacked), binarySha256);

  await mkdir(dirname(target), { recursive: true });
  await rm(target, { force: true });
  await rename(unpacked, target);
  await chmod(target, 0o755);
  console.log(`prepared apfel v${version} for Tauri`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}

async function sha256(path) {
  try {
    return createHash("sha256").update(await readFile(path)).digest("hex");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function assertHash(name, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${name} checksum mismatch: expected ${expected}, got ${actual}`);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? "unknown"}`);
  }
}
