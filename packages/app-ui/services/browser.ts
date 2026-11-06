/** The work of a WebView that both apps share. */

/** Saves a file to the computer as a download. The file never leaves the machine. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Asks the browser to confirm a close of the page. Returns the release. */
export function warnBeforeUnload(): () => void {
  const warn = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = "";
  };
  window.addEventListener("beforeunload", warn);
  return () => window.removeEventListener("beforeunload", warn);
}
