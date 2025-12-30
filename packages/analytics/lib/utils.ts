/**
 * Time range type for analytics queries
 */
export type TimeRange = 'day' | 'week' | 'month';

/**
 * Get start and end dates for a given time range
 * Useful for filtering analytics events by date
 *
 * @param range - The time range ('day', 'week', or 'month')
 * @returns Object with start and end Date objects
 */
export function getTimeRangeBounds(range: TimeRange): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case 'day': {
      // Get start of today
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'week': {
      // Get start of this week (Monday)
      const dayOfWeek = start.getDay();
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'month': {
      // Get start of this month
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    }
  }

  // Set end to end of the period
  end.setHours(23, 59, 59, 999);

  return { start, end };
}
