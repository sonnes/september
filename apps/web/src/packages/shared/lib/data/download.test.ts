// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { saveFile } from './download';

const { exportDesktopFile, runtime } = vi.hoisted(() => ({
  exportDesktopFile: vi.fn(),
  runtime: { desktop: true },
}));

vi.mock('./file-client', () => ({ exportDesktopFile }));
vi.mock('./runtime', () => ({ isDesktopRuntime: () => runtime.desktop }));

describe('saveFile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    exportDesktopFile.mockReset().mockResolvedValue(true);
    runtime.desktop = true;
  });

  it('sends desktop downloads to the Rust save dialog', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'video/mp4' });

    await expect(saveFile(blob, 'note-reel.mp4')).resolves.toBe(true);
    expect(exportDesktopFile).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3]),
      'note-reel.mp4',
      'video/mp4'
    );
  });

  it('keeps the existing browser download behavior', async () => {
    runtime.desktop = false;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createObjectURL = vi.fn(() => 'blob:download');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    await expect(
      saveFile(new Blob(['settings'], { type: 'application/json' }), 'settings.json')
    ).resolves.toBe(true);

    expect(exportDesktopFile).not.toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:download');
  });
});
