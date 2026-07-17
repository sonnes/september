// Pure param mappers for the legacy /talk and /notes routes → /spaces tree.
// Used inside each old route's `beforeLoad` (throw redirect(...)) and unit
// tested in isolation.

export function redirectTalkSpace(params: { spaceSlug: string }) {
  return { to: '/spaces/$spaceSlug/talk' as const, params, replace: true };
}

export function redirectNotesSpace(params: { spaceSlug: string }) {
  return { to: '/spaces/$spaceSlug/notes' as const, params, replace: true };
}

export function redirectNotesNote(params: { spaceSlug: string; noteSlug: string }) {
  return { to: '/spaces/$spaceSlug/notes/$noteSlug' as const, params, replace: true };
}
