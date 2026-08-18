import { describe, expect, it, vi } from 'vitest';

import {
  collectionQueryKey,
  createDataQueryClient,
  notifyCollectionChanged,
  subscribeCollectionChanges,
} from './query';

describe('local data query configuration', () => {
  it('uses stable domain prefixes and always runs local queries offline', () => {
    expect(collectionQueryKey('spaces')).toEqual(['spaces']);
    expect(collectionQueryKey('messages')).toEqual(['messages']);
    expect(collectionQueryKey('documents')).toEqual(['notes']);

    const client = createDataQueryClient();
    expect(client.getDefaultOptions().queries?.networkMode).toBe('always');
    expect(client.getDefaultOptions().mutations?.networkMode).toBe('always');
  });

  it('publishes targeted collection invalidations', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCollectionChanges(listener);

    notifyCollectionChanged('messages');
    unsubscribe();
    notifyCollectionChanged('spaces');

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(['messages']);
  });
});
