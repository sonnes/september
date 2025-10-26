# App Directory

This directory contains the Next.js 15 App Router pages and API routes for September.

## Purpose

The `app/` directory implements the Next.js App Router structure, containing all routes, pages, layouts, and API endpoints for the application.

## Directory Structure

### Pages & Routes

- **[page.tsx](page.tsx)** - Landing page with hero, features, and CTAs
- **[layout.tsx](layout.tsx)** - Root layout with providers and global setup
- **[globals.css](globals.css)** - Global Tailwind CSS styles

### Feature Routes

- **[talk/](talk/)** - Conversation interface with speech-to-text and text-to-speech
- **[write/](write/)** - Document editor with markdown support and autocomplete
- **[voices/](voices/)** - Voice management and cloning interface
- **[settings/](settings/)** - User settings for AI and speech preferences
- **[monitor/](monitor/)** - Development monitoring tools

### Authentication Routes

- **[login/](login/)** - Login page with Supabase authentication
  - See [login/form.tsx](login/form.tsx) for form implementation
  - See [login/actions.ts](login/actions.ts) for server actions
- **[auth/](auth/)** - Authentication callbacks and email confirmation handlers

### API Routes

All API routes are in the **[api/](api/)** directory. See [api/README.md](api/README.md) for details.

### Static Pages

- **[privacy-policy/](privacy-policy/)** - Privacy policy page
- **[terms-of-service/](terms-of-service/)** - Terms of service page
- **[not-found.tsx](not-found.tsx)** - 404 error page

## Key Patterns

### Authentication

All routes under `/app/*` and `/api/*` are protected by middleware. See [../middleware.ts](../middleware.ts) for authentication logic.

Unauthenticated users are redirected to `/login`.

### Server Components

Pages are Server Components by default. Client-side interactivity is handled by Client Components marked with `"use client"`.

### Data Fetching

- Server Components fetch data directly from Supabase using [../supabase/server.ts](../supabase/server.ts)
- Client Components use hooks from [../hooks/](../hooks/) and services from [../services/](../services/)

### Form Handling

All forms use:

- `react-hook-form` for form state management
- `zod` for validation schemas
- Form components from [../components/ui/form.tsx](../components/ui/form.tsx)

Example: [settings/form.tsx](settings/form.tsx)

## Navigation

- Desktop navigation: [../components/nav/desktop.tsx](../components/nav/desktop.tsx)
- Mobile navigation: [../components/nav/mobile.tsx](../components/nav/mobile.tsx)

## Related Documentation

- [API Routes](api/README.md)
- [Components](../components/README.md)
- [Services](../services/README.md)
