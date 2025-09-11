import { TriplitClient as TriplitClientType } from '@triplit/client';

import { schema } from './schema';

export const getClient = () => {
  if (typeof window === 'undefined') {
    return new TriplitClientType({
      schema,
      autoConnect: false,
      storage: 'memory',
    });
  }

  return new TriplitClientType({
    schema,
    autoConnect: false,
    storage: 'indexeddb',
  });
};

export const triplit = getClient();

export type TriplitClient = typeof triplit;
