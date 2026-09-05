import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { readTalkDraft, saveTalkDraft } from './os';
import { openRepository } from './repository';

it('persists unfinished words separately per space and clears only the sent draft', async () => {
  await saveTalkDraft('one', 'unfinished words');
  await saveTalkDraft('two', 'another thought');
  const reopened = await openRepository({ migrate: false });
  expect(await reopened.getSetting('talk-draft:one')).toBe('unfinished words');
  reopened.close();
  expect(await readTalkDraft('one')).toBe('unfinished words');
  await saveTalkDraft('one', '');
  expect(await readTalkDraft('one')).toBe('');
  expect(await readTalkDraft('two')).toBe('another thought');
});

it('uses the desktop setting command request envelope', async () => {
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const { runInNewContext } = await import('node:vm');
  const { default: ts } = await import('typescript');
  const source = readFileSync(resolve(process.cwd(), '../desktop/src/services/os.ts'), 'utf8');
  const parsed = ts.createSourceFile('os.ts', source, ts.ScriptTarget.Latest, true);
  const functions = parsed.statements.filter(statement => ts.isFunctionDeclaration(statement) &&
    ['readTalkDraft', 'saveTalkDraft', 'guardUnsavedChanges'].includes(statement.name?.text ?? '')).map(statement => statement.getText(parsed)).join('\n');
  const calls: unknown[] = [];
  let close: (event: { preventDefault: () => void }) => void = () => {};
  let removed = false;
  const exports: { guardUnsavedChanges?: () => () => void; readTalkDraft?: (id: string) => Promise<string>; saveTalkDraft?: (id: string, words: string) => Promise<void> } = {};
  runInNewContext(ts.transpileModule(functions, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, window,
    isTauri: () => true,
    getCurrentWindow: () => ({ onCloseRequested: async (handler: typeof close) => { close = handler; return () => { removed = true; }; } }),
    invoke: async (command: string, args: unknown) => { calls.push([command, args]); return 'restored'; },
  });
  const release = exports.guardUnsavedChanges!();
  let prevented = false;
  close({ preventDefault: () => { prevented = true; } });
  expect(prevented).toBe(true);
  release();
  await Promise.resolve();
  expect(removed).toBe(true);
  expect(await exports.readTalkDraft!('one')).toBe('restored');
  await exports.saveTalkDraft!('one', 'new words');
  expect(calls).toEqual([
    ['setting_get', { request: { key: 'talk-draft:one' } }],
    ['setting_put', { request: { key: 'talk-draft:one', value: 'new words' } }],
  ]);
});
