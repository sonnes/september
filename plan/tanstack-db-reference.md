# TanStack DB Reference Document

TanStack DB is a reactive client store that extends TanStack Query with collections, live queries, and optimistic mutations to build fast, reactive, and consistent applications.

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Collections](#collections)
3. [Local-Only Collections](#local-only-collections)
4. [Live Queries](#live-queries)
5. [Mutations and Transactions](#mutations-and-transactions)


---

## Core Concepts
- **Reactive Client Store**: Data changes trigger immediate UI updates.
- **Collections**: Organized sets of data, similar to database tables.
- **Live Queries**: Queries that automatically update when underlying data changes.
- **Optimistic Mutations**: Updates that appear immediately in the UI before being confirmed by a backend.

---

## Collections
To create a collection, use `createCollection` with configuration options.

```typescript
import { z } from 'zod'
import { createCollection } from '@tanstack/db'

const todoSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
})

const todosCollection = createCollection({
  schema: todoSchema,
  getKey: (item) => item.id,
})
```

---

## Local-Only Collections
Local-only collections are in-memory collections that do not sync with external sources. They use a loopback sync config that immediately "syncs" all optimistic changes.

### Creation
```typescript
import { createCollection, localOnlyCollectionOptions } from '@tanstack/db';

const localData = createCollection(
  localOnlyCollectionOptions({
    getKey: (item) => item.id,
    initialData: [
      { id: '1', name: 'Initial Item' }
    ]
  })
);
```

### Key Features
- **In-memory**: Data is lost on page reload unless persisted manually.
- **Loopback Sync**: Optimistic changes are immediately made permanent in the local store.
- **Manual Transactions**: Requires calling `utils.acceptMutations(transaction)` within the `mutationFn` to persist changes.

---

## Live Queries
Live queries provide a reactive way to fetch and observe data.

### React Usage (`useLiveQuery`)
```tsx
import { useLiveQuery } from '@tanstack/react-db'
import { eq } from '@tanstack/db'

function TodoList() {
  const { data } = useLiveQuery((q) =>
    q.from({ todos: todosCollection })
     .where(({ todos }) => eq(todos.completed, false))
  )

  return (
    <ul>
      {data.map(todo => <li key={todo.id}>{todo.text}</li>)}
    </ul>
  )
}
```

### Reusable Query Definitions
Use the `Query` class to build reusable query logic.
```typescript
import { Query, eq } from '@tanstack/db'

const activeUserQuery = new Query()
  .from({ user: usersCollection })
  .where(({ user }) => eq(user.active, true))

// Use in live query
const { data } = useLiveQuery(activeUserQuery.select(({ user }) => ({ id: user.id })))
```

---

## Mutations and Transactions
Mutations are handled through the collection or via transactions.

### Simple Mutations
```typescript
todosCollection.insert({ id: '1', text: 'Buy milk', completed: false })
todosCollection.update({ id: '1', completed: true })
todosCollection.delete('1')
```

### Manual Transactions
Transactions allow grouping multiple mutations and handling them together.

```typescript
import { createTransaction } from '@tanstack/db'

const tx = createTransaction({
  mutationFn: async ({ transaction }) => {
    // 1. Perform external API call
    const result = await api.save(transaction.mutations)
    
    // 2. If successful, accept local mutations for local-only collections
    localCollection.utils.acceptMutations(transaction)
    
    return result
  }
})

tx.mutate(() => {
  todosCollection.insert({ id: '2', text: 'New Todo' })
  localCollection.insert({ id: 'log_1', message: 'Inserting todo' })
})

await tx.commit()
```
 