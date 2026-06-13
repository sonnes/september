// Patch the test environment's Blob with Node's real Blob so arrayBuffer() is available.
// The vitest node environment ships a stripped Blob polyfill that lacks arrayBuffer().
import { Blob as NodeBlob } from 'node:buffer';

const hasMissingArrayBuffer = typeof globalThis.Blob !== 'undefined' && !('arrayBuffer' in globalThis.Blob.prototype);

if (hasMissingArrayBuffer) {
  // Replace the stripped global Blob with Node's real Blob
  Object.defineProperty(globalThis, 'Blob', {
    value: NodeBlob,
    writable: true,
    configurable: true,
  });
}
