import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const desktopRoot = new URL('../', import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, desktopRoot), 'utf8'));
}

test('desktop is an independent pnpm app', async () => {
  const packageJson = await readJson('package.json');

  assert.equal(packageJson.name, '@september/desktop');
  assert.equal(packageJson.scripts.dev, 'vite');
  assert.equal(packageJson.scripts.build, 'tsc --noEmit && vite build');
  assert.equal(packageJson.scripts['tauri:dev'], 'tauri dev');
  assert.equal(packageJson.scripts['tauri:build'], 'tauri build');
});

test('Tauri opens the independent UI at the 13-inch iPad baseline', async () => {
  const config = await readJson('src-tauri/tauri.conf.json');
  const [mainWindow] = config.app.windows;

  assert.equal(config.build.beforeDevCommand, 'pnpm dev');
  assert.equal(config.build.beforeBuildCommand, 'pnpm build');
  assert.equal(config.build.devUrl, 'http://localhost:3010');
  assert.equal(config.build.frontendDist, '../dist');
  assert.equal(mainWindow.url, '/');
  assert.equal(mainWindow.width, 1376);
  assert.equal(mainWindow.height, 1032);
  assert.match(config.app.security.csp, /localhost:3010/);
  assert.doesNotMatch(config.app.security.csp, /localhost:3009/);
});

test('the macOS bundle declares its recording privacy reasons', async () => {
  const plist = await readFile(new URL('src-tauri/Info.plist', desktopRoot), 'utf8');

  assert.match(plist, /NSMicrophoneUsageDescription/);
  assert.match(plist, /NSCameraUsageDescription/);
});
