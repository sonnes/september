/**
 * The voice of the app.
 *
 * ponytail: the WebView on macOS has the Web Speech API, so the system voice
 * needs no Rust code and moves no audio bytes. An ElevenLabs voice must go
 * through Rust, because the key stays in the Keychain — that arrives with the
 * `speech_synthesize` command.
 */

/** Speaks one sentence. A new sentence stops the sentence before it. */
export function speak(text: string): void {
  const speech = globalThis.speechSynthesis;
  if (!speech || !text.trim()) return;

  speech.cancel();
  speech.speak(new SpeechSynthesisUtterance(text));
}

export function stopSpeaking(): void {
  globalThis.speechSynthesis?.cancel();
}
