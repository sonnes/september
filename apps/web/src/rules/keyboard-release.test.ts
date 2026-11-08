import { describe, expect, it } from 'vitest';

import { keyboardDownload, keyboardVersion } from './keyboard-release';

describe('keyboardVersion', () => {
  it('reads the short version of the app from Info.plist', () => {
    const plist = `<dict>
	<key>CFBundleVersion</key>
	<string>7</string>
	<key>CFBundleShortVersionString</key>
	<string>1.2.3</string>
</dict>`;

    expect(keyboardVersion(plist)).toBe('1.2.3');
  });

  it('refuses a plist with no short version, rather than linking to no release', () => {
    expect(() => keyboardVersion('<dict></dict>')).toThrow(/CFBundleShortVersionString/);
  });
});

describe('keyboardDownload', () => {
  it('points at the DMG that make publish uploads for the version', () => {
    expect(keyboardDownload('1.2.3')).toBe(
      'https://github.com/sonnes/september/releases/download/keyboard-v1.2.3/September-Keyboard-1.2.3.dmg'
    );
  });
});
