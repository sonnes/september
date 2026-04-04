'use client';

import { useMemo, useRef, useState, useEffect } from 'react';

import {
  prepareWithSegments,
  layout,
  layoutWithLines,
  type PreparedTextWithSegments,
  type LayoutLine,
} from '@chenglou/pretext';

export interface PretextLayoutLine {
  text: string;
  width: number;
  y: number;
}

export interface PretextLayoutOptions {
  text: string;
  containerWidth: number;
  containerHeight: number;
  fontFamily: string;
  fontWeight?: string;
  minFontSize?: number;
  maxFontSize?: number;
  lineHeightRatio?: number;
  padding?: number;
  /** Extra vertical space per line (e.g. pill padding). Default 16. */
  lineExtraPx?: number;
  /** Gap between lines (e.g. flex gap). Default 8. */
  lineGapPx?: number;
}

export interface PretextLayoutResult {
  fontSize: number;
  lines: PretextLayoutLine[];
  totalHeight: number;
}

function buildFontString(size: number, family: string, weight: string): string {
  return `${weight} ${size}px ${family}`;
}

/** Pure computation — testable without React. */
export function computePretextLayout({
  text,
  containerWidth,
  containerHeight,
  fontFamily,
  fontWeight = '700',
  minFontSize = 24,
  maxFontSize = 200,
  lineHeightRatio = 1.2,
  padding = 48,
  lineExtraPx = 16,
  lineGapPx = 8,
}: PretextLayoutOptions): PretextLayoutResult {
  const empty: PretextLayoutResult = { fontSize: 0, lines: [], totalHeight: 0 };

  if (!text || containerWidth <= 0 || containerHeight <= 0) return empty;

  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;
  if (availableWidth <= 0 || availableHeight <= 0) return empty;

  // Account for pill padding (px-4 = 32px total) reducing available text width
  const pillPaddingX = 32;
  const textWidth = availableWidth - pillPaddingX;
  if (textWidth <= 0) return empty;

  // Binary search for largest font size that fits
  let lo = minFontSize;
  let hi = maxFontSize;
  let bestSize = minFontSize;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const prepared = prepareWithSegments(text, buildFontString(mid, fontFamily, fontWeight));
    const lineHeight = Math.round(mid * lineHeightRatio);
    const result = layout(prepared, textWidth, lineHeight);

    // Real rendered height includes pill padding + gaps between pills
    const renderedHeight =
      result.height +
      result.lineCount * lineExtraPx +
      Math.max(0, result.lineCount - 1) * lineGapPx;

    if (renderedHeight <= availableHeight) {
      bestSize = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // Final layout with best size
  const prepared = prepareWithSegments(text, buildFontString(bestSize, fontFamily, fontWeight));
  const lineHeight = Math.round(bestSize * lineHeightRatio);
  const result = layoutWithLines(prepared, textWidth, lineHeight);

  const lines: PretextLayoutLine[] = result.lines.map((line: LayoutLine, i: number) => ({
    text: line.text,
    width: line.width,
    y: i * lineHeight,
  }));

  const renderedTotalHeight =
    result.height +
    result.lineCount * lineExtraPx +
    Math.max(0, result.lineCount - 1) * lineGapPx;

  return {
    fontSize: bestSize,
    lines,
    totalHeight: renderedTotalHeight,
  };
}

export interface UsePretextLayoutResult extends PretextLayoutResult {
  fontReady: boolean;
}

export function usePretextLayout(options: PretextLayoutOptions): UsePretextLayoutResult {
  const { fontFamily } = options;
  const [fontReady, setFontReady] = useState(() => {
    if (typeof document === 'undefined') return false;
    try {
      return document.fonts.check(`16px ${fontFamily}`);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (fontReady || typeof document === 'undefined') return;
    document.fonts.ready.then(() => setFontReady(true));
  }, [fontReady]);

  const result = useMemo(() => {
    if (!fontReady) return { fontSize: 0, lines: [], totalHeight: 0 };
    return computePretextLayout(options);
  }, [
    fontReady,
    options.text,
    options.containerWidth,
    options.containerHeight,
    options.fontFamily,
    options.fontWeight,
    options.minFontSize,
    options.maxFontSize,
    options.lineHeightRatio,
    options.padding,
  ]);

  return { ...result, fontReady };
}
