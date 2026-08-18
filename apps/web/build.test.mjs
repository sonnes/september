/* global process */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('desktop build entry', () => {
  it('accepts an explicit Vite mode and creates the packaged SPA entry point', async () => {
    const source = await readFile(resolve(process.cwd(), 'build.mjs'), 'utf8');

    expect(source).toContain('process.argv');
    expect(source).toContain('_shell.html');
    expect(source).toContain('index.html');
  });

  it('declares the macOS privacy reasons used by the shared recording UX', async () => {
    const plist = await readFile(resolve(process.cwd(), 'src-tauri/Info.plist'), 'utf8');

    expect(plist).toContain('NSMicrophoneUsageDescription');
    expect(plist).toContain('NSCameraUsageDescription');
  });

  it('starts the main Tauri window on the desktop splash route', async () => {
    const config = JSON.parse(
      await readFile(resolve(process.cwd(), 'src-tauri/tauri.conf.json'), 'utf8')
    );

    expect(config.app.windows[0].url).toBe('/desktop');
  });
});
