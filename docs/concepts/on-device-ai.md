---
title: On-device AI
description: The desktop app can use Apple Intelligence for local text generation without a cloud fallback.
package: desktop
---

# On-device AI

The desktop app uses Apple Intelligence for local suggestions and text generation. The provider runs through apfel on supported Macs.

The desktop backend bundles apfel on Apple silicon. The provider requires macOS 26 and enabled Apple Intelligence.

Rust starts apfel when the UI asks for status or generation. The process uses a free loopback port and a process-specific bearer token.

Unsupported systems can start September. The status response reports that Apple Intelligence is unavailable. The backend does not select a cloud fallback.

The browser app does not run the Apple provider. It shows the unavailable state in the same desktop UI position.

The browser system voice uses the Web Speech API. OpenRouter and ElevenLabs are optional cloud services.
