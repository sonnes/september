/**
 * Audio utility functions for base64 handling and blob conversion
 */

/**
 * Parses a base64 audio string, extracting the MIME type and base64 data
 * @param blob - The base64 string, with or without data URI prefix
 * @returns Object containing the MIME type and base64 data
 */
export function parseBase64Audio(blob: string): { type: string; base64: string } {
  const parts = blob.split(',');

  const prefix = parts.length > 1 ? parts[0] : '';
  const base64 = parts.length > 1 ? parts[1] : parts[0];

  const type =
    prefix !== '' ? prefix.split(';')[0].replace('data:', '').trim() : 'audio/mp3';

  return { type, base64 };
}

/**
 * Formats base64 audio data with the proper data URI prefix
 * @param blob - The base64 string, with or without prefix
 * @param type - The MIME type (defaults to 'audio/mp3')
 * @returns Properly formatted base64 data URI string
 */
export function formatBase64Audio(blob: string, type: string = 'audio/mp3'): string {
  // If already has prefix, return as-is
  if (blob.startsWith('data:')) {
    return blob;
  }

  // Add the proper prefix
  return `data:${type};base64,${blob}`;
}

/**
 * Converts a base64 string to a Blob object
 * @param base64 - The base64 data (without data URI prefix)
 * @param type - The MIME type for the blob
 * @returns Blob object
 */
export function base64ToBlob(base64: string, type: string = 'audio/mp3'): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type });
}
