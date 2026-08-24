---
title: Desktop usage tracking and dashboard
description: Port local usage measurement, reporting, and automatic 90-day retention from the web app to the independent desktop app.
package: desktop
---

# Desktop usage tracking and dashboard

## Goal

Show how much typing September saves and how its configured services are used. Keep the report private and local to the Mac.

## Data and retention

- Add an append-only `analytics_events` table to the desktop SQLite database.
- Store a stable event type, timestamp, user ID, and JSON payload for message, AI, and speech events.
- Index events by user and time for bounded report queries.
- Delete events older than 90 days when the app starts and whenever usage is read or written. Keep events exactly 90 days old.
- Never make speaking, writing, or AI generation fail because usage recording failed.

## Measurement

- Count printable keys, Backspace, and Enter in the Talk composer. Record the final text length and typed-key count after a message is saved.
- Record AI feature, provider, model, token counts, latency, outcome, and reported cost when available.
- Record system and ElevenLabs speech calls, including cache hits, character credits, latency, and outcome.
- Read the current ElevenLabs subscription allowance without exposing its API key to the UI.

## Screens

- Replace the Dashboard placeholder with a day, week, and month report. Default to week.
- Show an Efficiency card for messages, characters, typed keys, and saved keystrokes.
- Show a Service use card for calls, tokens, costs, quota credits, failures, and cache hits.
- Add Settings > Usage for service and feature breakdowns, recent calls, quota status, and CSV download.
- Use the desktop design system and a wider content surface for report screens.

## Verification

- Add pure TypeScript tests for key counting, aggregation, ranges, and CSV output.
- Add Rust repository tests for event storage, user/range isolation, ordering, and the 90-day boundary.
- Extend route and source-boundary tests for Dashboard and Settings > Usage.
- Run desktop JavaScript tests, Rust tests, lint, and the production build.

