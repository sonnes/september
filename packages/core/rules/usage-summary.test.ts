import { describe, expect, it } from "vitest";
import { serviceName } from "./services.ts";

import {
  countsAsTypedKey,
  getTimeRangeBounds,
  sourceLabel,
  summarizeUsage,
  toRecentCalls,
  usageCallsToCsv,
  type UsageEvent,
  type UsageEventType,
} from "./usage-summary.ts";

const event = (
  event_type: UsageEventType,
  data: Record<string, unknown>,
  timestamp = Date.UTC(2026, 7, 20, 12),
): UsageEvent => ({
  id: crypto.randomUUID(),
  user_id: "ravi",
  event_type,
  timestamp,
  data,
});

it("only direct typing counts as a typed key", () => {
  for (const key of ["a", " ", ".", "Backspace", "Enter"]) {
    expect(countsAsTypedKey(key)).toBe(true);
  }
  for (const key of ["Shift", "Tab", "ArrowLeft", "Meta", "Escape"]) {
    expect(countsAsTypedKey(key)).toBe(false);
  }
});

it("report ranges use the local day, Monday week, and calendar month", () => {
  const now = new Date(2026, 7, 21, 14, 35, 10, 12);

  const day = getTimeRangeBounds("day", now);
  expect(day.start).toEqual(new Date(2026, 7, 21, 0, 0, 0, 0));
  expect(day.end).toEqual(new Date(2026, 7, 21, 23, 59, 59, 999));

  const week = getTimeRangeBounds("week", now);
  expect(week.start).toEqual(new Date(2026, 7, 17, 0, 0, 0, 0));

  const month = getTimeRangeBounds("month", now);
  expect(month.start).toEqual(new Date(2026, 7, 1, 0, 0, 0, 0));
});

it("usage summarizes saved typing and service units without inventing prices", () => {
  const events = [
    event("message_sent", {
      text_length: 100,
      keys_typed: 25,
      space_id: "space-1",
    }),
    event("ai_generation", {
      generation_type: "suggestions",
      provider: "apple",
      model: "apple-foundationmodel",
      input_length: 100,
      output_length: 40,
      input_tokens: 30,
      output_tokens: 10,
      latency_ms: 200,
      success: true,
      cached: false,
      cost_usd: 0,
      cost_source: "free",
    }),
    event("ai_generation", {
      generation_type: "phrases",
      provider: "openrouter",
      model: "qwen/free",
      input_length: 50,
      output_length: 0,
      input_tokens: 12,
      output_tokens: 0,
      latency_ms: 350,
      success: false,
      cached: false,
      cost_source: "unknown",
      error_message: "offline",
    }),
    event("tts_generation", {
      provider: "elevenlabs",
      model: "eleven_turbo_v2_5",
      voice_id: "voice-1",
      text_length: 80,
      credits: 40,
      duration_seconds: 0,
      latency_ms: 100,
      success: true,
      cached: true,
      cost_usd: 0,
      cost_source: "quota",
    }),
  ];

  const summary = summarizeUsage(events);

  expect(summary.messages).toEqual({
    total_messages: 1,
    total_text_length: 100,
    total_keys_typed: 25,
    keystrokes_saved: 75,
    efficiency: 75,
  });
  expect(summary.services.total_calls).toBe(3);
  expect(summary.services.total_tokens).toBe(52);
  expect(summary.services.total_characters).toBe(80);
  expect(summary.services.total_credits).toBe(40);
  expect(summary.services.failed_calls).toBe(1);
  expect(summary.services.cached_calls).toBe(1);
  expect(summary.services.total_usd).toBe(0);
  expect(summary.services.by_provider.openrouter.source).toBe("unknown");
  expect(summary.services.by_feature.suggestions.calls).toBe(1);
  expect(summary.services.unknown_price_models).toEqual([
    "openrouter:qwen/free",
  ]);
});

it("recent calls are newest first and CSV quotes unsafe cells", () => {
  const calls = toRecentCalls([
    event("message_sent", { text_length: 4, keys_typed: 4 }, 1),
    event(
      "ai_generation",
      {
        generation_type: "suggestions",
        provider: "openrouter",
        model: "model,one",
        input_length: 5,
        output_length: 2,
        latency_ms: 20,
        success: true,
        cached: false,
        cost_source: "unknown",
      },
      2,
    ),
    event(
      "tts_generation",
      {
        provider: "system",
        model: "macOS system voice",
        text_length: 5,
        credits: 0,
        duration_seconds: 0,
        latency_ms: 10,
        success: true,
        cached: false,
        cost_usd: 0,
        cost_source: "free",
      },
      3,
    ),
  ]);

  expect(calls.map((call) => call.feature)).toEqual(["speech", "suggestions"]);
  const csv = usageCallsToCsv(calls);
  expect(csv).toMatch(/^timestamp,feature,provider,model,/);
  expect(csv).toMatch(/"model,one"/);
  expect(csv.split("\n").length).toBe(3);
});

it("a presentation is counted, but it is not a provider call", () => {
  const events = [
    event("note_present", { chunks: 4, spoken: true }, 1),
    event("note_export", { kind: "text" }, 2),
    event(
      "tts_generation",
      {
        provider: "elevenlabs",
        model: "eleven_turbo_v2_5",
        text_length: 10,
        credits: 10,
        latency_ms: 30,
        success: true,
        cached: false,
        cost_source: "quota",
      },
      3,
    ),
  ];

  // A story told in the room costs nothing, so it must not appear beside the
  // calls the user pays for.
  expect(toRecentCalls(events).length).toBe(1);
  expect(summarizeUsage(events).services.total_calls).toBe(1);
  expect(summarizeUsage(events).services.total_credits).toBe(10);
});

describe("the names of a usage row", () => {
  it("names a cost source and a service, and shows an unknown id as it is", () => {
    expect(sourceLabel("quota")).toBe("credits");
    expect(serviceName("elevenlabs")).toBe("ElevenLabs");
    expect(serviceName("mystery")).toBe("mystery");
  });
});
