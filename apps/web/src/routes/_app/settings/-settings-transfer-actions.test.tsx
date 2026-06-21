// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { createDefaultAccount } from '@/packages/account/defaults';
import { serializeAccountSettingsExport } from '@/packages/account/settings-transfer';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockUseAccount = vi.hoisted(() => vi.fn());
const mockUpdateAccount = vi.hoisted(() => vi.fn());

vi.mock('@/packages/account', async importOriginal => {
  const actual = await importOriginal<typeof import('@/packages/account')>();
  return {
    ...actual,
    useAccount: mockUseAccount,
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { SettingsTransferActions } from './index';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mockUpdateAccount.mockResolvedValue(undefined);
  mockUseAccount.mockReturnValue({
    account: {
      ...createDefaultAccount(),
      name: 'Current',
      city: 'Atlanta',
      ai_providers: {
        openrouter: { api_key: 'current-openrouter-key' },
      },
    },
    updateAccount: mockUpdateAccount,
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
  mockUseAccount.mockReset();
  mockUpdateAccount.mockReset();
});

function render(ui: React.ReactElement) {
  act(() => root.render(ui));
}

async function selectImportFile(json: string) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  expect(input).toBeTruthy();
  const file = {
    name: 'settings.json',
    type: 'application/json',
    text: () => Promise.resolve(json),
  };

  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [file],
  });

  await act(async () => {
    input?.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('SettingsTransferActions', () => {
  it('asks whether to merge or overwrite imported settings', async () => {
    render(<SettingsTransferActions />);

    await selectImportFile(
      serializeAccountSettingsExport({
        ...createDefaultAccount(),
        name: 'Imported',
        ai_providers: {
          gemini: { api_key: 'imported-gemini-key' },
        },
      })
    );

    expect(document.body.textContent).toContain('Merge');
    expect(document.body.textContent).toContain('Overwrite');
    expect(mockUpdateAccount).not.toHaveBeenCalled();
  });

  it('merges imported settings after choosing merge', async () => {
    render(<SettingsTransferActions />);

    await selectImportFile(
      serializeAccountSettingsExport({
        ...createDefaultAccount(),
        name: 'Imported',
        ai_providers: {
          gemini: { api_key: 'imported-gemini-key' },
        },
      })
    );

    const mergeButton = Array.from(document.body.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Merge')
    );
    expect(mergeButton).toBeTruthy();

    await act(async () => {
      mergeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockUpdateAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Imported',
        city: 'Atlanta',
        ai_providers: {
          openrouter: { api_key: 'current-openrouter-key' },
          gemini: { api_key: 'imported-gemini-key' },
        },
      })
    );
  });
});
