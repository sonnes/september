---
title: Virtual microphone (desktop)
description: A public Core Audio process tap sends September speech to calling apps while September runs.
package: desktop
---

# Virtual microphone

September can publish its spoken messages as a macOS audio input named
`September Microphone`. FaceTime and other calling apps can select this input.

## Keep the microphone temporary

The microphone is off when September starts. The user controls it from the
Talk audio selector beside Speak.

The app creates a public Core Audio aggregate device while the control is on.
The aggregate device contains a mono process tap for the September process.
The app destroys both objects when the user stops the microphone or quits.

A crash can leave a public aggregate device behind. The next application start
removes the device with the fixed UID
`app.september.desktop.virtual-microphone` before it opens the database.

## Send only spoken messages

System speech uses `AVSpeechSynthesizer` in the native process. Cached
ElevenLabs speech uses `AVAudioPlayer` in the same process. The process tap can
therefore receive either voice.

Voice-list previews stay in the WebView player. They help the user choose a
voice and do not enter the virtual microphone.

## Cross the Tauri boundary

The React app calls three microphone commands to read, start, and stop the
device. It also calls native commands to speak system text, play a cached file,
and stop speech.

Rust validates every cached file before native playback. The file must resolve
inside the application audio directory.

## Ask for system permission

The application bundle contains `NSAudioCaptureUsageDescription`. macOS uses
this text when the user first starts the process tap.

This design uses the public Core Audio process-tap API on macOS 26 or later.
It does not install an audio driver or a privileged helper.
