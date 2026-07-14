import { createFileRoute, redirect } from '@tanstack/react-router';

// Old providers page — now part of Setup. Kept as a redirect so bookmarks and
// OpenRouter OAuth callbacks configured with this URL keep working.
export const Route = createFileRoute('/_app/settings/providers')({
  validateSearch: (s: Record<string, unknown>): { code?: string } =>
    typeof s.code === 'string' ? { code: s.code } : {},
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/settings',
      search: search.code ? { code: search.code } : {},
      replace: true,
    });
  },
});
