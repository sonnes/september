// @vitest-environment jsdom
import React, { act } from 'react';

import { QueryClientProvider, type UseMutationResult } from '@tanstack/react-query';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useOptimisticRecordMutation } from './mutation';
import { createDataQueryClient } from './query';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
let mutation: UseMutationResult<void, Error, { id: string }, { previous: unknown }>;

function Probe({ fail }: { fail: boolean }) {
  mutation = useOptimisticRecordMutation({
    queryKey: ['spaces'],
    mutationFn: async () => {
      if (fail) throw new Error('write failed');
    },
    update: (current: Array<{ id: string }> | undefined, value) => [...(current ?? []), value],
  });
  return null;
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('useOptimisticRecordMutation', () => {
  it('optimistically updates local cache and rolls back a failed write', async () => {
    const client = createDataQueryClient();
    client.setQueryData(['spaces'], [{ id: 'existing' }]);
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <Probe fail />
        </QueryClientProvider>
      );
    });

    await act(async () => {
      await mutation.mutateAsync({ id: 'new' }).catch(() => {});
    });

    expect(client.getQueryData(['spaces'])).toEqual([{ id: 'existing' }]);
    expect(client.isFetching({ queryKey: ['spaces'] })).toBe(0);
  });

  it('keeps optimistic data after a successful local write', async () => {
    const client = createDataQueryClient();
    client.setQueryData(['spaces'], [{ id: 'existing' }]);
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <Probe fail={false} />
        </QueryClientProvider>
      );
    });
    await act(async () => mutation.mutateAsync({ id: 'new' }));

    expect(client.getQueryData(['spaces'])).toEqual([{ id: 'existing' }, { id: 'new' }]);
  });
});
