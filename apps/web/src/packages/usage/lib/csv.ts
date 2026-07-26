import type { RecentCall } from '../hooks/use-recent-calls';

/**
 * Export calls as CSV so a spreadsheet can be held next to a provider invoice.
 *
 * Units that do not apply to a call are left blank rather than zero — a speech
 * call did not use zero tokens, it used none.
 */
const COLUMNS = [
  'timestamp',
  'feature',
  'provider',
  'model',
  'input_tokens',
  'output_tokens',
  'characters',
  'credits',
  'cost_usd',
  'cost_source',
  'latency_ms',
  'success',
  'cached',
] as const;

function cell(value: string | number | boolean | undefined): string {
  if (value === undefined) return '';

  const text = String(value);
  if (!/[",\n]/.test(text)) return text;

  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(calls: RecentCall[]): string {
  const rows = calls.map(call =>
    [
      call.timestamp.toISOString(),
      call.feature,
      call.provider,
      call.model,
      call.input_tokens,
      call.output_tokens,
      call.characters,
      call.credits,
      call.cost_usd,
      call.cost_source,
      call.latency_ms,
      call.success,
      call.cached,
    ]
      .map(cell)
      .join(',')
  );

  return [COLUMNS.join(','), ...rows].join('\n');
}
