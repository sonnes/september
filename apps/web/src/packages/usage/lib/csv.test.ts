import { describe, expect, it } from 'vitest';

import type { RecentCall } from '../hooks/use-recent-calls';
import { toCsv } from './csv';

const call: RecentCall = {
  id: 'a',
  timestamp: new Date('2026-07-26T14:32:07.000Z'),
  feature: 'suggestions',
  provider: 'gemini',
  model: 'gemini-2.5-flash-lite',
  input_tokens: 412,
  output_tokens: 38,
  latency_ms: 410,
  success: true,
  cached: false,
  cost_usd: 0.00006,
  cost_source: 'estimated',
};

describe('toCsv', () => {
  it('writes a header even when there is nothing to export', () => {
    const csv = toCsv([]);

    expect(csv.split('\n')).toHaveLength(1);
    expect(csv).toContain('timestamp,feature,provider,model');
    expect(csv).toContain('cost_usd,cost_source');
  });

  it('writes one row per call', () => {
    const rows = toCsv([call, { ...call, id: 'b' }]).split('\n');

    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain('2026-07-26T14:32:07.000Z');
    expect(rows[1]).toContain('gemini-2.5-flash-lite');
    expect(rows[1]).toContain('0.00006');
  });

  it('leaves units that do not apply empty rather than zero', () => {
    const speech: RecentCall = {
      ...call,
      feature: 'speech',
      provider: 'elevenlabs',
      model: 'eleven_flash_v2_5',
      input_tokens: undefined,
      output_tokens: undefined,
      characters: 96,
      credits: 48,
      cost_usd: undefined,
      cost_source: 'quota',
    };

    const row = toCsv([speech]).split('\n')[1];

    // input_tokens and output_tokens are blank; characters and credits are set.
    expect(row).toBe(
      '2026-07-26T14:32:07.000Z,speech,elevenlabs,eleven_flash_v2_5,,,96,48,,quota,410,true,false'
    );
  });

  it('quotes values that would otherwise break the row', () => {
    const row = toCsv([{ ...call, model: 'weird,"model"' }]).split('\n')[1];

    expect(row).toContain('"weird,""model"""');
  });
});
