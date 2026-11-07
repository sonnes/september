import { act } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

import type { StoredBackup } from '@september/core/rules/backup';

import backupFixture from '../../core/rules/fixtures/backup-v1.json';
import { downloadBlob } from '../services/browser';
import { platform } from './platform';
import { findButton, finishSetup, press, renderApp } from './render';

vi.mock('../services/browser', async original => ({
  ...(await original<typeof import('../services/browser')>()),
  downloadBlob: vi.fn(),
}));

let container: HTMLElement;

beforeEach(async () => {
  vi.mocked(downloadBlob).mockClear();
  await finishSetup();
  ({ container } = await renderApp('/settings/data'));
  await findButton('Download backup', container);
});

const button = (name: string) => findButton(name);

// jsdom's Blob has no text(), so a FileReader reads it.
const textOf = (blob: Blob) =>
  new Promise<string>(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });

function log() {
  const element = container.querySelector('[role="log"]');
  expect(element).not.toBeNull();
  return element!;
}

async function choose(text: Promise<string>) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [{ name: 'backup.json', text: () => text }],
  });
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
}

it('announces download progress and the finished download without moving focus', async () => {
  const pending = Promise.withResolvers<StoredBackup>();
  vi.mocked(platform.store.exportBackup).mockReturnValue(pending.promise);
  const download = await button('Download backup');
  download.focus();
  await press(download);
  const progress = log().textContent!;
  expect(progress.length).toBeGreaterThan(0);
  expect(document.activeElement).toBe(download);
  expect(downloadBlob).not.toHaveBeenCalled();

  await act(async () =>
    pending.resolve({
      settings: {},
      spaces: [],
      messages: [],
      agentMessages: [],
      notes: [],
      savedPhrases: [],
      usageEvents: [],
    }),
  );
  expect(downloadBlob).toHaveBeenCalledOnce();
  const [file] = vi.mocked(downloadBlob).mock.calls[0];
  expect(JSON.parse(await textOf(file))).toMatchObject({ format: backupFixture.format });
  expect(log().textContent).toContain(progress);
  expect(log().textContent!.length).toBeGreaterThan(progress.length);
});

it('keeps a download error in the log and starts a new log on retry', async () => {
  const error = 'Storage unavailable';
  vi.mocked(platform.store.exportBackup).mockRejectedValueOnce(new Error(error));
  await press(await button('Download backup'));
  expect(log().textContent).toContain(error);
  expect(log().querySelector('[role="alert"]')?.textContent).toContain(error);

  const retry = Promise.withResolvers<StoredBackup>();
  vi.mocked(platform.store.exportBackup).mockReturnValue(retry.promise);
  await press(await button('Download backup'));
  expect(log().textContent).not.toContain(error);
  await act(async () => retry.reject(new Error('later')));
});

it('reports a file read failure before any restore', async () => {
  const pending = Promise.withResolvers<string>();
  await choose(pending.promise);
  const progress = log().textContent!;
  expect(progress.length).toBeGreaterThan(0);
  await press(await button('Download backup'));
  expect(platform.store.exportBackup).not.toHaveBeenCalled();
  await act(async () => pending.reject(new Error('File unavailable')));
  expect(log().textContent).toContain(progress);
  expect(log().textContent).toContain('File unavailable');
  expect(platform.store.importBackup).not.toHaveBeenCalled();
});

it('logs the check and a failed restore without the private backup text', async () => {
  const fixture = structuredClone(backupFixture);
  fixture.messages[0].text = 'Private conversation text';
  const pending = Promise.withResolvers<string>();
  await choose(pending.promise);
  const reading = log().textContent!;
  await act(async () => pending.resolve(JSON.stringify(fixture)));
  expect(log().textContent!.length).toBeGreaterThan(reading.length);
  expect(log().textContent).not.toContain(fixture.messages[0].text);

  const restore = Promise.withResolvers<void>();
  vi.mocked(platform.store.importBackup).mockReturnValue(restore.promise);
  await press(await button('Import and replace'));
  const checked = log().textContent!;
  await press(await button('Replace data'));
  expect(platform.store.importBackup).toHaveBeenCalledOnce();
  expect(log().textContent).not.toBe(checked);
  await act(async () => restore.reject(new Error('Database unavailable')));
  expect(log().querySelector('[role="alert"]')?.textContent).toContain('Database unavailable');
});
