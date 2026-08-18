'use client';

import { useEffect } from 'react';

import { type QueryKey, useQuery } from '@tanstack/react-query';

import { type RecordCollection, collectionQueryKey, notifyCollectionChanged } from './query';
import { type ReadableBrowserCollection, getLocalRecord, listLocalRecords } from './records';
import { isDesktopRuntime } from './runtime';

interface ChangeSubscription {
  unsubscribe: () => void;
}

interface ObservableBrowserCollection<T> extends ReadableBrowserCollection<T> {
  subscribeChanges?: (
    callback: () => void,
    options: { includeInitialState: false }
  ) => ChangeSubscription;
}

interface ParseSchema<T> {
  parse: (value: unknown) => T;
}

export interface RecordQueryResult<T> {
  data: T;
  isLoading: boolean;
  error?: { message: string };
}

function useBrowserInvalidation<T>(
  collection: RecordCollection,
  browserCollection: ObservableBrowserCollection<T>
): void {
  useEffect(() => {
    if (isDesktopRuntime() || !browserCollection.subscribeChanges) return;
    const subscription = browserCollection.subscribeChanges(
      () => notifyCollectionChanged(collection),
      { includeInitialState: false }
    );
    return () => subscription.unsubscribe();
  }, [browserCollection, collection]);
}

export function useRecordListQuery<T>(
  collection: RecordCollection,
  browserCollection: ObservableBrowserCollection<T>,
  schema: ParseSchema<T>
): RecordQueryResult<T[]> {
  useBrowserInvalidation(collection, browserCollection);
  const result = useQuery({
    queryKey: collectionQueryKey(collection),
    queryFn: () => listLocalRecords(collection, browserCollection, schema),
    networkMode: 'always',
  });
  return {
    data: result.data ?? [],
    isLoading: result.isLoading,
    error: result.error ? { message: `Database error: ${result.error.message}` } : undefined,
  };
}

export function useRecordQuery<T>(
  collection: RecordCollection,
  id: string | undefined,
  browserCollection: ObservableBrowserCollection<T>,
  schema: ParseSchema<T>,
  queryKey: QueryKey = [...collectionQueryKey(collection), id]
): RecordQueryResult<T | undefined> {
  useBrowserInvalidation(collection, browserCollection);
  const result = useQuery({
    queryKey,
    queryFn: async () => {
      if (!id) return undefined;
      return (await getLocalRecord(collection, id, browserCollection, schema)) ?? undefined;
    },
    enabled: Boolean(id),
    networkMode: 'always',
  });
  return {
    data: result.data,
    isLoading: Boolean(id) && result.isLoading,
    error: result.error ? { message: `Database error: ${result.error.message}` } : undefined,
  };
}
