import assert from "node:assert/strict";
import test from "node:test";

import {
  countsAsTypedKey,
  elevenLabsCredits,
  getTimeRangeBounds,
  summarizeUsage,
  toRecentCalls,
  usageCallsToCsv,
} from "../src/rules/usage-summary.ts";

const event = (event_type, data, timestamp = Date.UTC(2026, 7, 20, 12)) => ({
  id: crypto.randomUUID(),
  user_id: "ravi",
  event_type,
  timestamp,
  data,
});

test("only direct typing counts as a typed key", () => {
  for (const key of ["a", " ", ".", "Backspace", "Enter"]) {
    assert.equal(countsAsTypedKey(key), true, key);
  }
  for (const key of ["Shift", "Tab", "ArrowLeft", "Meta", "Escape"]) {
    assert.equal(countsAsTypedKey(key), false, key);
  }
});

test("ElevenLabs character multipliers become whole credits", () => {
  assert.equal(elevenLabsCredits("abc", "eleven_turbo_v2_5"), 2);
  assert.equal(elevenLabsCredits("abc", "eleven_v3"), 3);
  assert.equal(elevenLabsCredits("abc", "unlisted"), undefined);
});

test("report ranges use the local day, Monday week, and calendar month", () => {
  const now = new Date(2026, 7, 21, 14, 35, 10, 12);

  const day = getTimeRangeBounds("day", now);
  assert.deepEqual(day.start, new Date(2026, 7, 21, 0, 0, 0, 0));
  assert.deepEqual(day.end, new Date(2026, 7, 21, 23, 59, 59, 999));

  const week = getTimeRangeBounds("week", now);
  assert.deepEqual(week.start, new Date(2026, 7, 17, 0, 0, 0, 0));

  const month = getTimeRangeBounds("month", now);
  assert.deepEqual(month.start, new Date(2026, 7, 1, 0, 0, 0, 0));
});

test("usage summarizes saved typing and service units without inventing prices", () => {
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

  assert.deepEqual(summary.messages, {
    total_messages: 1,
    total_text_length: 100,
    total_keys_typed: 25,
    keystrokes_saved: 75,
    efficiency: 75,
  });
  assert.equal(summary.services.total_calls, 3);
  assert.equal(summary.services.total_tokens, 52);
  assert.equal(summary.services.total_characters, 80);
  assert.equal(summary.services.total_credits, 40);
  assert.equal(summary.services.failed_calls, 1);
  assert.equal(summary.services.cached_calls, 1);
  assert.equal(summary.services.total_usd, 0);
  assert.equal(summary.services.by_provider.openrouter.source, "unknown");
  assert.equal(summary.services.by_feature.suggestions.calls, 1);
  assert.deepEqual(summary.services.unknown_price_models, [
    "openrouter:qwen/free",
  ]);
});

test("recent calls are newest first and CSV quotes unsafe cells", () => {
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

  assert.deepEqual(
    calls.map((call) => call.feature),
    ["speech", "suggestions"],
  );
  const csv = usageCallsToCsv(calls);
  assert.match(csv, /^timestamp,feature,provider,model,/);
  assert.match(csv, /"model,one"/);
  assert.equal(csv.split("\n").length, 3);
});

test("a presentation is counted, but it is not a provider call", () => {
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
  assert.equal(toRecentCalls(events).length, 1);
  assert.equal(summarizeUsage(events).services.total_calls, 1);
  assert.equal(summarizeUsage(events).services.total_credits, 10);
});
