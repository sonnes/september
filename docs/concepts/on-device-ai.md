---
title: On-device AI
description: The desktop app can use Apple Intelligence for local text generation without a cloud fallback.
package: desktop
---

# On-device AI

The desktop app uses Apple Intelligence for local suggestions and text generation. The provider runs through apfel on supported Macs.

The desktop backend bundles apfel on Apple silicon. The provider requires macOS 26 and enabled Apple Intelligence.

Rust starts apfel when the UI asks for status or generation. The process uses a free loopback port and a process-specific bearer token.

The WebView sends an Apple Intelligence request with the same typed model client as OpenRouter. `writing_proxy` gives the client the `appleUrl` of the loopback proxy and the token of the run. The proxy forwards the request to apfel. In the shared code, `platform.writing.apple` gives the status and this endpoint.

Unsupported systems can start September. The status response reports that Apple Intelligence is unavailable. The backend does not select a cloud fallback.

The browser app does not run the Apple provider. The browser platform has no `writing.apple`, so setup and AI Assistance do not offer Apple Intelligence there.

The browser system voice uses the Web Speech API. OpenRouter and ElevenLabs are optional cloud services.
