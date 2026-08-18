// @vitest-environment jsdom
import React, { act } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRecordListQuery } from './hooks';
import { createDataQueryClient } from './query';

const { listLocalRecords } = vi.hoisted(() => ({ listLocalRecords: vi.fn() }));
vi.mock('./records', async importOriginal => ({
  ...(await importOriginal<typeof import('./records')>()),
  listLocalRecords,
}));
vi.mock('./runtime', () => ({ isDesktopRuntime: () => false }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
let latest: ReturnType<typeof useRecordListQuery<{ id: string }>>;
const unsubscribe = vi.fn();
const browserCollection = {
  preload: vi.fn(),
  get: vi.fn(),
  toArray: [],
  subscribeChanges: vi.fn(() => ({ unsubscribe })),
};
const schema = { parse: (value: unknown) => value as { id: string } };

function Probe() {
  latest = useRecordListQuery('spaces', browserCollection, schema);
  return null;
}

beforeEach(() => {
  listLocalRecords.mockReset().mockResolvedValue([{ id: 'space-1' }]);
  browserCollection.subscribeChanges.mockClear();
  unsubscribe.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('useRecordListQuery', () => {
  it('loads browser records through an always-online local query and subscribes to changes', async () => {
    const client = createDataQueryClient();
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>
      );
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(latest.data).toEqual([{ id: 'space-1' }]);
    expect(listLocalRecords).toHaveBeenCalledWith('spaces', browserCollection, schema);
    expect(browserCollection.subscribeChanges).toHaveBeenCalledWith(expect.any(Function), {
      includeInitialState: false,
    });
    expect(client.getQueryCache().find({ queryKey: ['spaces'] })?.options.networkMode).toBe(
      'always'
    );
  });
});
