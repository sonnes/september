we will migrate to tanstack-db from supabase and triplit.

supabase will only be used for authentication and file storage. 

This is an example of how to create a new tanstack-db collection:

```typescript
import { z } from 'zod'
import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'

const todoSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Text is required"),
  completed: z.boolean(),
  priority: z.number().min(0).max(5)
})

const collection = createCollection(
  queryCollectionOptions({
    schema: todoSchema,
    queryKey: ['todos'],
    queryFn: async () => api.todos.getAll(),
    getKey: (item) => item.id,
    // ...
  })
)

// Invalid data throws SchemaValidationError
collection.insert({
  id: "1",
  text: "",  // ❌ Too short
  completed: "yes",  // ❌ Wrong type
  priority: 10  // ❌ Out of range
})
// Error: Validation failed with 3 issues

// Valid data works
collection.insert({
  id: "1",
  text: "Buy groceries",  // ✅
  completed: false,  // ✅
  priority: 2  // ✅
})
```


## Reusable Migration Strategy (per Object)

For each domain object (e.g., Chats, Messages, Suggestions), follow these steps:

### 1. Define the Schema
Create or update the Zod schema in the package's `types/` directory. Ensure it matches the expected data structure.

### 2. Initialize the Local-Only Collection
Define the collection using `localOnlyCollectionOptions`. This ensures the data is managed in-memory with reactive updates.

```typescript
import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import { schema } from '../types/schema'

export const collection = createCollection(
  localOnlyCollectionOptions({
    schema,
    getKey: (item) => item.id,
    initialData: [], // Optional: Load from storage or API if needed
  })
)
```

### 3. Create a Domain Hook
Implement a `use-db-[object]` hook in the package's `hooks/` directory. Use `useLiveQuery` to expose the data reactively to components.

```typescript
import { useLiveQuery } from '@tanstack/react-db'
import { collection } from '../lib/db'

export function useDbObject(id?: string) {
  const { data } = useLiveQuery((q) => {
    let query = q.from({ items: collection })
    if (id) {
      query = query.where(({ items }) => eq(items.id, id))
    }
    return query
  }, [id])

  return { data }
}
```

### 4. Implement CRUD Actions
Define standard actions for manipulating the data. Since we are using local-only collections, these operations are synchronous and immediate.

```typescript
export const actions = {
  insert: (item: T) => collection.insert(item),
  update: (id: string, updates: Partial<T>) => collection.update({ id, ...updates }),
  delete: (id: string) => collection.delete(id),
}
```

### 5. Refactor Components
Replace existing Triplit or Supabase hooks in the UI components with the new domain hook and actions.

---
Use [tanstack-db-reference.md](tanstack-db-reference.md) for more details on how to use tanstack-db.