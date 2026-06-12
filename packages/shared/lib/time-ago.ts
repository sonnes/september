const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

type TimeUnit =
  | 'second' | 'seconds'
  | 'minute' | 'minutes'
  | 'hour'   | 'hours'
  | 'day'    | 'days'
  | 'week'   | 'weeks'
  | 'month'  | 'months'
  | 'year'   | 'years';

const THRESHOLDS: Array<[number, TimeUnit]> = [
  [60, 'second'],
  [3600, 'minute'],
  [86400, 'hour'],
  [604800, 'day'],
  [2592000, 'week'],
  [31536000, 'month'],
  [Infinity, 'year'],
];

const DIVISORS: Record<TimeUnit, number> = {
  second: 1,  seconds: 1,
  minute: 60, minutes: 60,
  hour: 3600, hours: 3600,
  day: 86400, days: 86400,
  week: 604800, weeks: 604800,
  month: 2592000, months: 2592000,
  year: 31536000, years: 31536000,
};

/**
 * Returns a human-readable relative time string for a past date.
 * Uses Intl.RelativeTimeFormat for locale-aware formatting.
 * @example timeAgo(new Date(Date.now() - 65000)) // "1 minute ago"
 */
export function timeAgo(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  const diffSeconds = Math.round((d.getTime() - Date.now()) / 1000);

  for (const [threshold, unit] of THRESHOLDS) {
    if (Math.abs(diffSeconds) < threshold) {
      return rtf.format(Math.round(diffSeconds / DIVISORS[unit]), unit);
    }
  }

  const years = Math.round(diffSeconds / DIVISORS.year);
  return rtf.format(years, 'year');
}
