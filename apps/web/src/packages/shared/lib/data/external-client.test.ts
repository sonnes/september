import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openDesktopExternalUrl } from './external-client';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({ invoke }));

describe('desktop external navigation RPC client', () => {
  beforeEach(() => invoke.mockReset().mockResolvedValue(undefined));

  it('opens a validated URL through Rust', async () => {
    await openDesktopExternalUrl('https://september.to/help');
    expect(invoke).toHaveBeenCalledWith('open_external', {
      request: { url: 'https://september.to/help' },
    });
  });
});
