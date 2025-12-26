/**
 * Utility functions for custom keyboard grid layout
 */

/**
 * Calculate responsive grid columns based on viewport and user settings
 * @param columns - User-defined columns (2-6)
 * @param isMobile - Is mobile viewport
 * @returns Effective number of columns to use
 */
export function calculateGridColumns(columns: number, isMobile: boolean): number {
  const maxMobileColumns = 3;
  return isMobile ? Math.min(columns, maxMobileColumns) : columns;
}

/**
 * Sort buttons by order field
 */
export function sortButtons<T extends { order: number }>(buttons: T[]): T[] {
  return [...buttons].sort((a, b) => a.order - b.order);
}

/**
 * Get CSS grid style for dynamic columns (alternative to Tailwind classes)
 * Use this for truly dynamic column counts when Tailwind safelist isn't sufficient
 */
export function getGridStyle(columns: number): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: '0.5rem',
  };
}
