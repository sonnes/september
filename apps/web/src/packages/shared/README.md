# Shared browser code

This compatibility package contains the remaining browser text utility and
re-exports shared workspace helpers. It does not own application data.

## Root exports

The package root exports:

- `cn` from `@september/ui`
- `MATCH_PUNCTUATION` for text-boundary rules
- `useIsMobile` from `@september/ui`

Import these values through `@/packages/shared`.

## Autocomplete

The trie, n-gram model, spoken corpus, and dictionary live in
`@september/core/autocomplete`. `lib/autocomplete` is a compatibility entry
point for the former web import path.

The browser does not store an autocomplete snapshot. The app trains the base engine at start and learns from messages in the `september` repository.

This design prevents autocomplete from creating a second IndexedDB database. `src/services/repository.ts` remains the only persistence owner.

The class merger and mobile hook have no second implementation here.
