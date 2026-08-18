import { exportDesktopFile } from './file-client';
import { isDesktopRuntime } from './runtime';

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer());
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Could not read download bytes'));
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(blob);
  });
}

export async function saveFile(blob: Blob, suggestedName: string): Promise<boolean> {
  if (isDesktopRuntime()) {
    return exportDesktopFile(
      await blobBytes(blob),
      suggestedName,
      blob.type || 'application/octet-stream'
    );
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}
