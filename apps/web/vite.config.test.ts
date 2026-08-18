import { describe, expect, it } from 'vitest';

import { createViteConfig } from './vite.config';

function aliasesFor(mode: string) {
  const config = createViteConfig({ command: 'build', mode });
  const aliases = config.resolve?.alias;
  if (!Array.isArray(aliases)) return [];
  return aliases.map(alias => String(alias.find));
}

describe('desktop Vite mode', () => {
  it('replaces every browser-local model runtime in tauri builds', () => {
    expect(aliasesFor('tauri')).toEqual(
      expect.arrayContaining([
        '@/packages/ai/lib/webllm-runtime',
        '@/packages/ai/lib/whisper-runtime',
        '@/packages/ai/lib/local-providers',
        '@/packages/speech/lib/providers/kokoro-runtime',
      ])
    );
  });

  it('uses the browser runtimes in normal web builds', () => {
    expect(aliasesFor('production')).toEqual([]);
  });
});
