---
title: Desktop virtual microphone implementation notes
plan: ../plans/2026-08-21-desktop-virtual-microphone.md
---

# Implementation notes

- The existing uncommitted Core Audio output selector remains the owner of device enumeration.
- The native bridge uses the current process identifier for the live tap. It keeps the bundle identifier for process restoration.
- Voice-list previews do not enter the microphone because they are selection aids, not spoken messages.
- A silent `AVAudioEngine` keeps September registered as a native audio process before the tap starts.
- The aggregate device has a fixed UID. Startup cleanup uses this UID after an unexpected exit.
- Tap-backed aggregate streams publish their direction on each stream object. Input enumeration handles that Core Audio form.
- The microphone toggle moved from Voice into the Talk audio selector. The selector stays visible when the Mac has one output.
