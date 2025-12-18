We need to organize the codebase into modules. Each module should have a clear purpose and responsibility.

This is the target structure:

```
september/
├── app/ # next.js app router structure
├── components/ # reusable components
│   ├── ui/ # base ui components from shadcn/ui
├── hooks/ # global hooks
├── lib/ # global utility functions
├── packages/ # modular packages
│   ├── suggestions/ # suggestions module
│   │   ├── components/ # context provider, forms, components
│   │   ├── hooks/ # hooks
│   │   ├── lib/ # module utility functions
│   │   ├── types/ # zod schemas, types
│   │   ├── index.ts # module public API
│   │   └── README.md # README describing the package, its architecture, decisions, how to use it, etc.
│   ├── speech/ # speech synthesis module
│   │   ├── ...
│   ├── editor/ # editor module
│   │   ├── ...
│   ├── keyboards/ # keyboards module
│   │   ├── ...
│   ├── cloning/ # voice cloning module
│   │   ├── ...
│   ├── onboarding/ # onboarding module
│   │   ├── ...
│   ├── documents/ # documents module
│   │   ├── ...
│   ├── chats/ # chats module
│   │   ├── ...
├── supabase/ # supabase module
│   ├── ...
├── triplit/ # triplit module
│   ├── ...
└── README.md # README
```

### Hooks

- `use-db-*` hooks are used to interact with the database.
- `use-auth-*` hooks are used to interact with the authentication.
- `use-ai-*` hooks are used to interact with the AI SDK/API.

- All state management should be implemented inside the respective module `hooks` folder.

### App

- Every page acts as a composer for one or more modules.

### Error Handling

- Errors must be propagated to the hooks and components that need to handle them.
- Use `toast` for all error messages inside the hooks. (except for form related errors)

### Forms

- Zod validation errors should be displayed in the form.
- Use `Alert` component to display error messages next to the action button.
- Show success messages next to the action button.
- Show loading state using the `Spinner` component
