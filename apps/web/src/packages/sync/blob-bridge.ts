// Leaf bridge between the audio storage layer and the sync backend's R2 blobs.
// Kept free of React/collection imports so `@/packages/audio` can mirror blobs
// without pulling in the provider graph. The active client is set by
// SyncProvider while authenticated, and cleared on sign-out.

export interface BlobClient {
  putBlob: (key: string, body: ArrayBuffer | Uint8Array | Blob, contentType?: string) => Promise<void>;
  getBlobResponse: (key: string) => Promise<Response | null>;
  deleteBlob: (key: string) => Promise<void>;
}

let active: BlobClient | null = null;

export function setBlobClient(client: BlobClient | null): void {
  active = client;
}

export function hasBlobClient(): boolean {
  return active !== null;
}

// All audio lives under the user's `audio/` prefix (the server adds users/{userId}/).
const blobKey = (path: string): string => `audio/${path}`;

/** Mirror a write to R2 (fire-and-forget; failures are logged, never thrown). */
export async function mirrorBlobPut(
  path: string,
  body: ArrayBuffer | Uint8Array | Blob,
  contentType: string,
): Promise<void> {
  if (!active) return;
  try {
    await active.putBlob(blobKey(path), body, contentType);
  } catch (err) {
    console.warn('[sync] blob mirror put failed', path, err);
  }
}

/** Fetch a blob from R2 with its content type, or null if absent/unavailable. */
export async function fetchRemoteBlob(
  path: string,
): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  if (!active) return null;
  try {
    const res = await active.getBlobResponse(blobKey(path));
    if (!res) return null;
    return { data: await res.arrayBuffer(), contentType: res.headers.get('content-type') ?? 'application/octet-stream' };
  } catch (err) {
    console.warn('[sync] blob fetch failed', path, err);
    return null;
  }
}

export async function mirrorBlobDelete(path: string): Promise<void> {
  if (!active) return;
  try {
    await active.deleteBlob(blobKey(path));
  } catch (err) {
    console.warn('[sync] blob mirror delete failed', path, err);
  }
}
