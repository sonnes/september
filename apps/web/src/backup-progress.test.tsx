import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { DataSettings } from '@september/app-ui/pages/settings';
import backupFixture from '../../../packages/core/rules/fixtures/backup-v1.json';

const backup = vi.hoisted(() => ({ download: vi.fn(), restore: vi.fn() }));
vi.mock('@platform/services/backup', () => ({
  downloadBackup: backup.download,
  importBackup: backup.restore,
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(async () => {
  backup.download.mockReset();
  backup.restore.mockReset();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<DataSettings />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function button(name: string) {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    element => element.textContent === name
  )!;
}

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

it('announces download progress and completion without moving focus', async () => {
  const pending = Promise.withResolvers<void>();
  backup.download.mockReturnValue(pending.promise);
  const download = button('Download backup');
  download.focus();
  await act(async () => download.click());
  const progress = log().textContent!;
  expect(progress.length).toBeGreaterThan(0);
  expect(document.activeElement).toBe(download);
  await act(async () => pending.resolve());
  expect(log().textContent).toContain(progress);
  expect(log().textContent!.length).toBeGreaterThan(progress.length);
});

it('keeps download errors in the log and starts a new log on retry', async () => {
  const error = 'Storage unavailable';
  backup.download.mockRejectedValueOnce(new Error(error));
  await act(async () => button('Download backup').click());
  expect(log().textContent).toContain(error);
  expect(log().querySelector('[role="alert"]')?.textContent).toContain(error);

  const retry = Promise.withResolvers<void>();
  backup.download.mockReturnValue(retry.promise);
  await act(async () => button('Download backup').click());
  expect(log().textContent).not.toContain(error);
  await act(async () => retry.resolve());
});

it('reports file read failures before any restore', async () => {
  const pending = Promise.withResolvers<string>();
  await choose(pending.promise);
  const progress = log().textContent!;
  expect(progress.length).toBeGreaterThan(0);
  await act(async () => button('Download backup').click());
  expect(backup.download).not.toHaveBeenCalled();
  await act(async () => pending.reject(new Error('File unavailable')));
  expect(log().textContent).toContain(progress);
  expect(log().textContent).toContain('File unavailable');
  expect(backup.restore).not.toHaveBeenCalled();
});

it('logs validation and restore failures without including private backup text', async () => {
  const fixture = structuredClone(backupFixture);
  fixture.messages[0].text = 'Private conversation text';
  const pending = Promise.withResolvers<string>();
  await choose(pending.promise);
  const reading = log().textContent!;
  await act(async () => pending.resolve(JSON.stringify(fixture)));
  expect(log().textContent!.length).toBeGreaterThan(reading.length);
  expect(log().textContent).not.toContain(fixture.messages[0].text);

  const restore = Promise.withResolvers<void>();
  backup.restore.mockReturnValue(restore.promise);
  await act(async () => button('Import and replace').click());
  const validated = log().textContent!;
  await act(async () => button('Replace data').click());
  expect(backup.restore).toHaveBeenCalledOnce();
  expect(log().textContent).not.toBe(validated);
  await act(async () => restore.reject('Database unavailable'));
  expect(log().querySelector('[role="alert"]')?.textContent).toContain('Database unavailable');
});
