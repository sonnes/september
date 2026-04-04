import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { LayoutLinesResult, LayoutResult, PreparedTextWithSegments } from '@chenglou/pretext';

// Mock @chenglou/pretext since jsdom lacks Canvas font metrics
const mockPrepared = { segments: ['Hello', ' ', 'world'] } as unknown as PreparedTextWithSegments;
const mockPrepareWithSegments = vi.fn(() => mockPrepared);
const mockLayout = vi.fn(
  (_prepared: PreparedTextWithSegments, _maxWidth: number, lineHeight: number): LayoutResult => ({
    lineCount: 1,
    height: lineHeight,
  })
);
const mockLayoutWithLines = vi.fn(
  (_prepared: PreparedTextWithSegments, _maxWidth: number, lineHeight: number): LayoutLinesResult => ({
    lineCount: 1,
    height: lineHeight,
    lines: [
      {
        text: 'Hello world',
        width: 200,
        start: { segmentIndex: 0, graphemeIndex: 0 },
        end: { segmentIndex: 2, graphemeIndex: 5 },
      },
    ],
  })
);

vi.mock('@chenglou/pretext', () => ({
  prepareWithSegments: (...args: unknown[]) => mockPrepareWithSegments(...args),
  layout: (...args: unknown[]) => mockLayout(...args),
  layoutWithLines: (...args: unknown[]) => mockLayoutWithLines(...args),
}));

import { computePretextLayout } from './use-pretext-layout';

describe('computePretextLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns layout data for given text and dimensions', () => {
    const result = computePretextLayout({
      text: 'Hello world',
      containerWidth: 800,
      containerHeight: 600,
      fontFamily: 'Noto Sans',
    });

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].text).toBe('Hello world');
    expect(result.fontSize).toBeGreaterThan(0);
  });

  it('calls prepareWithSegments with correct font string including weight', () => {
    computePretextLayout({
      text: 'Test',
      containerWidth: 400,
      containerHeight: 300,
      fontFamily: 'Noto Sans',
      fontWeight: '700',
    });

    expect(mockPrepareWithSegments).toHaveBeenCalled();
    const callArg = mockPrepareWithSegments.mock.calls[0][1] as string;
    expect(callArg).toContain('Noto Sans');
    expect(callArg).toContain('700');
  });

  it('returns empty lines when text is empty', () => {
    const result = computePretextLayout({
      text: '',
      containerWidth: 800,
      containerHeight: 600,
      fontFamily: 'Noto Sans',
    });

    expect(result.lines).toHaveLength(0);
    expect(result.fontSize).toBe(0);
  });

  it('returns empty lines when container has zero dimensions', () => {
    const result = computePretextLayout({
      text: 'Hello',
      containerWidth: 0,
      containerHeight: 0,
      fontFamily: 'Noto Sans',
    });

    expect(result.lines).toHaveLength(0);
  });

  it('performs binary search for font size that fits container', () => {
    // Make layout return too-tall for large fonts
    mockLayout.mockImplementation(
      (_prepared, _maxWidth, lineHeight): LayoutResult => {
        // Inspect the font string from the most recent prepare call to determine size
        const lastCall = mockPrepareWithSegments.mock.calls.at(-1);
        const fontStr = lastCall?.[1] as string;
        const sizeMatch = fontStr?.match(/(\d+)px/);
        const size = sizeMatch ? parseInt(sizeMatch[1]) : 48;
        const lines = size > 80 ? 5 : 1;
        return { lineCount: lines, height: lines * lineHeight };
      }
    );

    const result = computePretextLayout({
      text: 'Hello world this is a longer text',
      containerWidth: 400,
      containerHeight: 100,
      fontFamily: 'Noto Sans',
    });

    // Should have called layout multiple times during binary search
    expect(mockLayout.mock.calls.length).toBeGreaterThan(1);
    expect(result.fontSize).toBeLessThanOrEqual(200);
    expect(result.fontSize).toBeGreaterThanOrEqual(24);
  });

  it('uses default font weight of 700', () => {
    computePretextLayout({
      text: 'Test',
      containerWidth: 400,
      containerHeight: 300,
      fontFamily: 'Arial',
    });

    const callArg = mockPrepareWithSegments.mock.calls[0][1] as string;
    expect(callArg).toContain('700');
  });

  it('respects custom min and max font size', () => {
    const result = computePretextLayout({
      text: 'Hello',
      containerWidth: 800,
      containerHeight: 600,
      fontFamily: 'Noto Sans',
      minFontSize: 32,
      maxFontSize: 64,
    });

    expect(result.fontSize).toBeGreaterThanOrEqual(32);
    expect(result.fontSize).toBeLessThanOrEqual(64);
  });
});
