// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type UseDocumentEditorReturn, useDocumentEditor } from './use-document-editor';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockUpdateDocument = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
let mockDocumentContent = 'Original';

vi.mock('../mutations', () => ({
  updateDocument: (...args: unknown[]) => mockUpdateDocument(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('./use-document', () => ({
  useDocument: () => ({
    document: {
      id: 'doc-1',
      content: mockDocumentContent,
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    },
    isLoading: false,
  }),
}));

let container: HTMLDivElement;
let root: Root;
let latest: UseDocumentEditorReturn;

beforeEach(() => {
  vi.useFakeTimers();
  mockDocumentContent = 'Original';
  mockUpdateDocument.mockResolvedValue(undefined);
  mockToastSuccess.mockReset();
  mockToastError.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

function Harness() {
  latest = useDocumentEditor({ documentId: 'doc-1', autoSave: true });
  return null;
}

function render() {
  act(() => root.render(<Harness />));
}

describe('useDocumentEditor', () => {
  it('auto-saves edited note content without a manual save', async () => {
    render();

    act(() => latest.handleContentChange('<p>Updated note</p>', 'Updated note'));
    expect(mockUpdateDocument).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
    });

    expect(mockUpdateDocument).toHaveBeenCalledWith('doc-1', { content: 'Updated note' });
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('syncs clean editor content when the current document changes externally', () => {
    render();
    expect(latest.content).toBe('Original');

    mockDocumentContent = 'Original\n\nAdded from composer';
    render();

    expect(latest.content).toBe('Original\n\nAdded from composer');
  });
});
