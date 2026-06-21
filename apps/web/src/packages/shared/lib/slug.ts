const UUID_SUFFIX = /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function entitySlug(label: string | undefined, id: string, fallback = 'item'): string {
  const base =
    label
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback;

  return `${base}-${id}`;
}

export function idFromSlug(slug: string): string {
  return slug.match(UUID_SUFFIX)?.[1] ?? slug;
}
