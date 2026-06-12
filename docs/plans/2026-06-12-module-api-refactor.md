# Module API Refactor Plan

## Goal

Rework the September packages module by module as if each feature were being implemented from scratch. For each module: understand the existing surface, agree on the ideal structure and public API, delegate implementation to a subagent, then verify behavior and docs.

## Completed

- `@september/account`
- `@september/shared`
- `@september/ui`
- `@september/ai`

## Remaining Modules

- `@september/analytics`
- `@september/audio`
- `@september/chats`
- `@september/cloning`
- `@september/documents`
- `@september/editor`
- `@september/keyboards`
- `@september/onboarding`
- `@september/recording`
- `@september/speech`
- `@september/suggestions`

## Working Loop

1. Map the current exported API, internal code shape, and app/package consumers.
2. Decide the simplest public API and internal structure.
3. Review the module code for React best practices, unnecessary abstractions, dependency direction, and duplicated logic.
4. Delegate implementation to a subagent with a narrow write scope.
5. Review the patch, run targeted verification, and update module docs.

## Review Criteria

- Public APIs should be small, intentional, and named around caller needs.
- Internal code should be simple enough to rebuild from scratch without preserving accidental iteration history.
- React code should keep state ownership clear, avoid hidden side effects, and expose hooks/providers only where they improve composition.
- Package boundaries should point one way: lower-level modules must not depend on higher-level feature modules.
- Compatibility is optional unless explicitly needed by current consumers.
