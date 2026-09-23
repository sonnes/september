---
plan: ../plans/2026-09-23-generation-settings.md
---

# Automatic Generation Implementation Notes

- The Rust backup type needs both fields because desktop exports and restores pass through that type.
- Setup writes run in order so concurrent changes preserve each switch. Failed writes reject without changes to the saved settings.
- Setup subscriptions notify mounted generation hooks after a successful save.
- The suggestion hook detects edits from text changes within the same space. Initial text and space changes do not trigger requests.
- The controls show the saved value during a write. A failed write reports an error without an optimistic state change.
- The web Vitest suite runs the phrase-generation contract against both platform hooks.
- The existing slice-selection test now edits the input to a word boundary before it expects an AI response.

## Validation

Core tests and type checks passed. Web tests, lint, build, and desktop tests
and build passed. Rust settings and backup tests passed. Clippy and format
checks passed.

The full Rust run failed in the existing virtual-microphone integration test
with Core Audio error `-10875`. The change does not modify audio code.

Browser QA used an isolated localhost origin without providers. Each switch
retained focus and survived reload independently. Automated tests used provider
responses for all switch combinations and stale-request cases on both platforms.
Native window interaction and live provider calls were not part of this check.

## Desktop Release

Version 0.2.0 keeps the existing prerelease status. The homepage links to its
Apple Silicon DMG and lists the configured minimum of macOS 14.2.

The build host rejected stripped Rust macro libraries with a misaligned LINKEDIT
string pool. The release build used `CARGO_PROFILE_RELEASE_STRIP=none` to avoid
that linker failure. No source or compiler configuration changed for this workaround.
