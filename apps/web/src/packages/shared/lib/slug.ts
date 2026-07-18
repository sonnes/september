const UUID_SUFFIX = /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

/**
 * A readable, id-free URL slug from an entity label — e.g. "Morning Notes" →
 * "morning-notes". Slugs no longer embed the entity id; resolution back to an
 * id happens by matching this slug against the loaded collection (see
 * `spaceIdFromSlug` / `noteIdFromSlug`).
 */
export function entitySlug(label: string | undefined, fallback = 'item'): string {
  return (
    label
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback
  );
}

/**
 * Legacy support: older URLs embedded the entity's UUID as a suffix
 * (`morning-notes-<uuid>`). Extracts that UUID so old links still resolve; new
 * id-free slugs pass through unchanged (returning the whole slug, which won't
 * match any id).
 */
export function idFromSlug(slug: string): string {
  return slug.match(UUID_SUFFIX)?.[1] ?? slug;
}
