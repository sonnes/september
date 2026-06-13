# September macOS App

## Commands

```bash
swift build
swift run SeptemberMacLayoutTests
swift run SeptemberMacApp
```

Run `swift build` and `swift run SeptemberMacLayoutTests` before finishing Swift changes.

## Style

- Target macOS 14+.
- Keep UI accessible by default: 44x44 minimum targets, explicit accessibility labels, visible keyboard focus.
- Use SwiftUI for app chrome and feature views unless AppKit is needed for system integration.
- Keep domain models in `Sources/SeptemberMac`; keep the app entry point in `Sources/SeptemberMacApp`.
- Prefer small tested layout/service models before wiring UI behavior.
- Do not add CGEvent injection or `NSPanel` behavior without tests or a focused manual verification note.
