export type TimeRange = "day" | "week" | "month";
export type CostSource = "measured" | "estimated" | "free" | "quota" | "unknown";
/** Every kind of event the apps record. One list, read by both of them. */
export const USAGE_EVENT_TYPES = [
  "message_sent",
  "ai_generation",
  "tts_generation",
  "note_present",
  "note_export",
] as const;

export type UsageEventType = (typeof USAGE_EVENT_TYPES)[number];

/** The events that cost a user something. The rest are counted, not billed. */
const PROVIDER_CALLS: UsageEventType[] = ["ai_generation", "tts_generation"];

const isProviderCall = (event: UsageEvent) =>
  PROVIDER_CALLS.includes(event.event_type);

export interface UsageEvent {
  id: string;
  user_id: string;
  event_type: UsageEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface SpendBucket {
  calls: number;
  priced_calls: number;
  cost_usd: number;
  source: CostSource;
  input_tokens: number;
  output_tokens: number;
  characters: number;
  credits: number;
}

export interface UsageSummary {
  messages: {
    total_messages: number;
    total_text_length: number;
    total_keys_typed: number;
    keystrokes_saved: number;
    efficiency: number;
  };
  services: {
    total_usd: number;
    total_calls: number;
    total_tokens: number;
    total_characters: number;
    total_credits: number;
    failed_calls: number;
    cached_calls: number;
    by_provider: Record<string, SpendBucket>;
    by_model: Record<string, SpendBucket>;
    by_feature: Record<string, SpendBucket>;
    unknown_price_models: string[];
  };
}

export interface RecentUsageCall {
  id: string;
  timestamp: number;
  feature: string;
  provider: string;
  model: string;
  input_tokens?: number;
  output_tokens?: number;
  characters?: number;
  credits?: number;
  cost_usd?: number;
  cost_source: CostSource;
  latency_ms: number;
  success: boolean;
  cached: boolean;
}

/** A key pressed in the editor, rather than a word inserted by September. */
export function countsAsTypedKey(key: string): boolean {
  return key.length === 1 || key === "Backspace" || key === "Enter";
}

const ELEVEN_LABS_RATES: Record<string, number> = {
  eleven_v3: 1,
  eleven_multilingual_v2: 1,
  eleven_flash_v2_5: 0.5,
  eleven_flash_v2: 0.5,
  eleven_turbo_v2_5: 0.5,
  eleven_turbo_v2: 0.5,
};

/** Estimated quota credits for one ElevenLabs speech request. */
export function elevenLabsCredits(text: string, model: string): number | undefined {
  const rate = ELEVEN_LABS_RATES[model];
  return rate === undefined ? undefined : Math.ceil(text.length * rate);
}

/** Calendar bounds in the local timezone. Weeks begin on Monday. */
export function getTimeRangeBounds(
  range: TimeRange,
  now = new Date(),
): { start: Date; end: Date } {
  const start = new Date(now);
  const end = new Date(now);

  if (range === "week") {
    const weekday = start.getDay();
    start.setDate(start.getDate() - (weekday === 0 ? 6 : weekday - 1));
  } else if (range === "month") {
    start.setDate(1);
  }
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

const numberOf = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const stringOf = (value: unknown, fallback: string): string =>
  typeof value === "string" && value ? value : fallback;

const sourceOf = (value: unknown): CostSource =>
  value === "measured" ||
  value === "estimated" ||
  value === "free" ||
  value === "quota"
    ? value
    : "unknown";

const emptyBucket = (): SpendBucket => ({
  calls: 0,
  priced_calls: 0,
  cost_usd: 0,
  source: "unknown",
  input_tokens: 0,
  output_tokens: 0,
  characters: 0,
  credits: 0,
});

const confidence: CostSource[] = ["unknown", "quota", "estimated", "measured", "free"];

function addTo(
  buckets: Record<string, SpendBucket>,
  key: string,
  values: Omit<SpendBucket, "calls" | "priced_calls" | "source"> & {
    source: CostSource;
  },
): void {
  const bucket = (buckets[key] ??= emptyBucket());
  bucket.calls += 1;
  bucket.cost_usd += values.cost_usd;
  bucket.input_tokens += values.input_tokens;
  bucket.output_tokens += values.output_tokens;
  bucket.characters += values.characters;
  bucket.credits += values.credits;
  bucket.source =
    bucket.priced_calls === 0 ||
    confidence.indexOf(values.source) < confidence.indexOf(bucket.source)
      ? values.source
      : bucket.source;
  bucket.priced_calls += 1;
}

export function summarizeUsage(events: UsageEvent[]): UsageSummary {
  const messages = events.filter((event) => event.event_type === "message_sent");
  const textLength = messages.reduce(
    (total, event) => total + numberOf(event.data.text_length),
    0,
  );
  const keysTyped = messages.reduce(
    (total, event) => total + numberOf(event.data.keys_typed),
    0,
  );

  const services: UsageSummary["services"] = {
    total_usd: 0,
    total_calls: 0,
    total_tokens: 0,
    total_characters: 0,
    total_credits: 0,
    failed_calls: 0,
    cached_calls: 0,
    by_provider: {},
    by_model: {},
    by_feature: {},
    unknown_price_models: [],
  };
  const unknownModels = new Set<string>();

  for (const event of events) {
    if (!isProviderCall(event)) continue;

    const provider = stringOf(event.data.provider, "unknown");
    const model = stringOf(event.data.model, "unknown");
    const feature =
      event.event_type === "ai_generation"
        ? stringOf(event.data.generation_type, "suggestions")
        : "speech";
    const values = {
      cost_usd: numberOf(event.data.cost_usd),
      source: sourceOf(event.data.cost_source),
      input_tokens: numberOf(event.data.input_tokens),
      output_tokens: numberOf(event.data.output_tokens),
      characters:
        event.event_type === "tts_generation" ? numberOf(event.data.text_length) : 0,
      credits: numberOf(event.data.credits),
    };

    services.total_calls += 1;
    services.total_usd += values.cost_usd;
    services.total_tokens += values.input_tokens + values.output_tokens;
    services.total_characters += values.characters;
    services.total_credits += values.credits;
    if (event.data.success === false) services.failed_calls += 1;
    if (event.data.cached === true) services.cached_calls += 1;

    addTo(services.by_provider, provider, values);
    addTo(services.by_model, `${provider}:${model}`, values);
    addTo(services.by_feature, feature, values);
    if (values.source === "unknown") unknownModels.add(`${provider}:${model}`);
  }
  services.unknown_price_models = [...unknownModels];

  const saved = Math.max(0, textLength - keysTyped);
  return {
    messages: {
      total_messages: messages.length,
      total_text_length: textLength,
      total_keys_typed: keysTyped,
      keystrokes_saved: saved,
      efficiency: textLength > 0 ? (saved / textLength) * 100 : 0,
    },
    services,
  };
}

/** Provider calls only, newest first. */
export function toRecentCalls(events: UsageEvent[]): RecentUsageCall[] {
  return events
    .filter(isProviderCall)
    .map((event) => ({
      id: event.id,
      timestamp: event.timestamp,
      feature:
        event.event_type === "ai_generation"
          ? stringOf(event.data.generation_type, "suggestions")
          : "speech",
      provider: stringOf(event.data.provider, "unknown"),
      model: stringOf(event.data.model, "unknown"),
      input_tokens:
        event.event_type === "ai_generation"
          ? numberOf(event.data.input_tokens)
          : undefined,
      output_tokens:
        event.event_type === "ai_generation"
          ? numberOf(event.data.output_tokens)
          : undefined,
      characters:
        event.event_type === "tts_generation"
          ? numberOf(event.data.text_length)
          : undefined,
      credits:
        event.event_type === "tts_generation"
          ? numberOf(event.data.credits)
          : undefined,
      cost_usd:
        typeof event.data.cost_usd === "number" ? event.data.cost_usd : undefined,
      cost_source: sourceOf(event.data.cost_source),
      latency_ms: numberOf(event.data.latency_ms),
      success: event.data.success !== false,
      cached: event.data.cached === true,
    }))
    .sort((left, right) => right.timestamp - left.timestamp);
}

const CSV_COLUMNS = [
  "timestamp",
  "feature",
  "provider",
  "model",
  "input_tokens",
  "output_tokens",
  "characters",
  "credits",
  "cost_usd",
  "cost_source",
  "latency_ms",
  "success",
  "cached",
] as const;

function csvCell(value: string | number | boolean | undefined): string {
  if (value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function usageCallsToCsv(calls: RecentUsageCall[]): string {
  const rows = calls.map((call) =>
    [
      new Date(call.timestamp).toISOString(),
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
      .map(csvCell)
      .join(","),
  );
  return [CSV_COLUMNS.join(","), ...rows].join("\n");
}
