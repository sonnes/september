import { describe, expect, it, vi } from 'vitest';

import { synthesizeWithFallback } from './synthesize-with-fallback';

const blob = (b: string) => ({ blob: b });

describe('synthesizeWithFallback', () => {
  it('uses the streaming result and marks playedLive when streaming succeeds', async () => {
    const rest = vi.fn();
    const res = await synthesizeWithFallback(Promise.resolve(blob('ws')), rest);
    expect(res).toEqual({ speech: { blob: 'ws' }, playedLive: true });
    expect(rest).not.toHaveBeenCalled();
  });

  it('falls back to REST when streaming rejects', async () => {
    const rest = vi.fn().mockResolvedValue(blob('rest'));
    const res = await synthesizeWithFallback(Promise.reject(new Error('ws down')), rest);
    expect(res).toEqual({ speech: { blob: 'rest' }, playedLive: false });
    expect(rest).toHaveBeenCalledOnce();
  });

  it('uses REST directly when there is no streaming path', async () => {
    const rest = vi.fn().mockResolvedValue(blob('rest'));
    const res = await synthesizeWithFallback(undefined, rest);
    expect(res).toEqual({ speech: { blob: 'rest' }, playedLive: false });
    expect(rest).toHaveBeenCalledOnce();
  });
});
