import { TriplitClient as TriplitClientType } from '@triplit/client';

import { schema } from './schema';

export const triplit = new TriplitClientType({
  schema,
  autoConnect: false,
  storage: 'indexeddb',
  // Optionally add serverUrl and token here if needed
});

export type TriplitClient = typeof triplit;
