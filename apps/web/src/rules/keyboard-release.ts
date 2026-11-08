/**
 * The download of September Keyboard, the native keyboard for macOS.
 *
 * The version comes from the Info.plist of the app, so the link moves to the
 * next release when the app gets a new version. `make publish` in
 * `apps/keyboard` uploads the DMG to the GitHub Release `keyboard-v<version>`.
 */
import plist from '../../../keyboard/Resources/Info.plist?raw';

const SHORT_VERSION = /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/;

/** The short version of the app in the text of its Info.plist. */
export function keyboardVersion(text: string): string {
  const found = text.match(SHORT_VERSION);
  if (!found) throw new Error('Info.plist has no CFBundleShortVersionString');
  return found[1].trim();
}

/** The address of the DMG of the release with this version. */
export function keyboardDownload(version: string): string {
  return `https://github.com/sonnes/september/releases/download/keyboard-v${version}/September-Keyboard-${version}.dmg`;
}

export const KEYBOARD_VERSION = keyboardVersion(plist);

export const KEYBOARD_DOWNLOAD = keyboardDownload(KEYBOARD_VERSION);
