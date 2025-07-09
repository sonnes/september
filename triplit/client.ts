import { TriplitClient } from '@triplit/client';

import { schema } from './schema';

let triplit: any = undefined;

if (typeof window !== 'undefined') {
  triplit = new TriplitClient({
    schema,
    storage: 'indexeddb',
    // Optionally add serverUrl and token here if needed
  });
} else {
  // Optionally, you can initialize with 'memory' storage for SSR, or just leave undefined
  // triplit = new TriplitClient({ schema, storage: 'memory' });
}

export { triplit };
