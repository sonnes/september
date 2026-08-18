import { QueryClient, type QueryKey } from '@tanstack/react-query';

export type RecordCollection =
  | 'user-account'
  | 'spaces'
  | 'messages'
  | 'saved-phrases'
  | 'documents'
  | 'analytics-events'
  | 'audio-file-aliases'
  | 'autocomplete-snapshots';

const prefixes: Record<RecordCollection, QueryKey> = {
  'user-account': ['account'],
  spaces: ['spaces'],
  messages: ['messages'],
  'saved-phrases': ['saved-phrases'],
  documents: ['notes'],
  'analytics-events': ['usage'],
  'audio-file-aliases': ['audio'],
  'autocomplete-snapshots': ['autocomplete'],
};

export function collectionQueryKey(collection: RecordCollection | string): QueryKey {
  return prefixes[collection as RecordCollection] ?? ['records', collection];
}

export function createDataQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        networkMode: 'always',
        staleTime: Number.POSITIVE_INFINITY,
        retry: false,
      },
      mutations: { networkMode: 'always' },
    },
  });
}

type CollectionChangeListener = (queryKey: QueryKey) => void;
const collectionListeners = new Set<CollectionChangeListener>();

export function subscribeCollectionChanges(listener: CollectionChangeListener): () => void {
  collectionListeners.add(listener);
  return () => collectionListeners.delete(listener);
}

export function notifyCollectionChanged(collection: RecordCollection | string): void {
  const queryKey = collectionQueryKey(collection);
  collectionListeners.forEach(listener => listener(queryKey));
}
