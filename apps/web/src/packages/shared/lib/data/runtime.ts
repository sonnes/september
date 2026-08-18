/** True for an explicit desktop build or while running inside a Tauri webview. */
export function isDesktopRuntime(): boolean {
  if (import.meta.env.MODE === 'tauri') return true;
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
