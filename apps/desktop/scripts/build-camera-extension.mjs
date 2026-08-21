import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") process.exit(0);

const extensionRoot = fileURLToPath(
  new URL("../src-tauri/camera-extension/", import.meta.url),
);
const developerDirectory =
  process.env.DEVELOPER_DIR || "/Applications/Xcode.app/Contents/Developer";

if (!existsSync(`${developerDirectory}/usr/bin/xcodebuild`)) {
  throw new Error(
    "September Camera needs Xcode. Install Xcode or set DEVELOPER_DIR.",
  );
}

const args = [
  "-project",
  "SeptemberCamera.xcodeproj",
  "-scheme",
  "SeptemberCamera",
  "-configuration",
  "Release",
  "-derivedDataPath",
  "build",
];

const team = process.env.APPLE_TEAM_ID;
const identity = process.env.APPLE_SIGNING_IDENTITY;
if (team && identity) {
  args.push(
    `DEVELOPMENT_TEAM=${team}`,
    `CODE_SIGN_IDENTITY=${identity}`,
    "CODE_SIGNING_ALLOWED=YES",
  );
} else {
  // An unsigned extension compiles for local checks. Activation requires a
  // signed distribution build with APPLE_TEAM_ID and APPLE_SIGNING_IDENTITY.
  args.push("CODE_SIGNING_ALLOWED=NO");
}
args.push("build");

const result = spawnSync(`${developerDirectory}/usr/bin/xcodebuild`, args, {
  cwd: extensionRoot,
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
