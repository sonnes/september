We need to organize the codebase into modules. Each module should have a clear purpose and responsibility.

This is the target structure:

```
september/
├── app/ # next.js app router structure
├── components/ # reusable components
│   ├── ui/ # base ui components from shadcn/ui
├── hooks/ # global hooks
├── lib/ # utility functions
├── packages/ # modular packages
│   ├── suggestions/ # suggestions module
│   │   ├── components/ # context provider, forms, components
│   │   ├── hooks/ # hooks
│   │   ├── lib/ # utility functions
│   │   ├── services/ # external services
│   │   ├── types/ # zod schemas, types
│   │   └── README.md # README describing the package
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
