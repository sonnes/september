---
title: Desktop usage
description: The independent desktop app measures saved typing and service use locally, then removes events after 90 days.
package: desktop
---

# Desktop usage

September measures whether it saves effort and what the user's services use.
The independent desktop app keeps both measurements in its local SQLite
database. It sends no analytics to September or another telemetry service.

## Record outcomes without blocking communication

Three actions create events:

| Event | Recorded after | Main units |
| --- | --- | --- |
| `message_sent` | SQLite accepts a Talk message | Characters and typed keys |
| `ai_generation` | A writing service answers or fails | Tokens, latency, cost, and feature |
| `tts_generation` | A system voice or cloud synthesis answers or fails | Characters, quota credits, latency, and cache state |

Usage writes are best-effort. A failed event write cannot reject a message,
hide a suggestion, or prevent speech. A failed primary action still records a
failure when its provider call was attempted.

Talk counts printable keys, Backspace, and Enter. Words inserted by a phrase,
suggestion, undo, or clear control add no keys. Efficiency is the share of
spoken characters that the user did not type.

## Keep billing units honest

Each provider call carries a cost source. Apple Intelligence and the macOS
system voice are `free`. ElevenLabs calls use `quota` credits. OpenRouter uses
`measured` cost when its response reports a dollar value. An unpriced model is
`unknown`; the report never substitutes the price of a similar model.

Cached ElevenLabs audio records a free cached call with no new credits. If
cloud synthesis succeeds but playback fails, the cloud call remains a
success. The system-voice fallback creates its own event.

## Read two levels of report

The Dashboard answers two quick questions for today, this week, or this month:
how much typing did September save, and what did its services use? It starts on
the current week.

Settings > Usage starts on the current month. It adds service and feature
breakdowns, recent provider calls, the live ElevenLabs allowance, and a CSV
download. Calendar weeks begin on Monday in the Mac's local timezone.

## Remove old events automatically

The backend keeps 90 days of events. It removes older rows when the app starts
and whenever the app reads or writes usage. Cleanup deletes timestamps before
the boundary, so an event exactly 90 days old remains until it becomes older.

The user and timestamp live in indexed columns rather than the JSON payload.
This makes bounded reports and retention cleanup direct SQLite queries.
