---
plan: ../plans/2026-09-23-suggestion-slices.md
---

# Implementation Notes

The six-word limit applies after the already accepted tokens. Sentence splitting
uses the native sentence segmenter. Stored messages remain complete.

An active selection retains its complete suggestion until the composer diverges
from that suggestion. This preserves continuations from model responses and phrase codes.
