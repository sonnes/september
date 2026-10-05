/**
 * The rules of the panel paths, in plain TypeScript so a test can read them
 * without a renderer.
 */

export const SPACE_MODE_PATH =
  /^\/spaces\/([^/]+)\/(?:talk|agent|notes(?:\/[^/]+)?)$/;

/** True for the Talk, Notes, note, and Agent paths of a space. */
export function isSpaceModePath(path: string | null | undefined): boolean {
  return !!path && SPACE_MODE_PATH.test(path);
}
