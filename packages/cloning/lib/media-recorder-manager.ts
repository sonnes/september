/**
 * MediaRecorderManager
 *
 * Plain-TS class (no React) that manages per-sample MediaRecorder lifecycle.
 * Testable without React fiber. useMediaRecorder wraps this with useState.
 *
 * Design decisions:
 *  - Map<id, {recorder, stream}> — stop(id) affects exactly that recording.
 *  - Starting a new recording for an ID while one is already running stops
 *    the previous one first (cleans up its stream).
 *  - stopAll() is called on React unmount to release the microphone.
 */

import { RecordingStatus } from '@september/cloning/types';

export type { RecordingStatus };

export interface RecordingEntry {
  recorder: MediaRecorder;
  stream: MediaStream;
}

export type OnComplete = (id: string, blob: Blob) => void;
export type OnStatusChange = (id: string, status: RecordingStatus) => void;
export type OnError = (id: string, error: string) => void;

export class MediaRecorderManager {
  private active = new Map<string, RecordingEntry>();
  private onComplete: OnComplete | null = null;
  private onStatusChange: OnStatusChange | null = null;
  private onError: OnError | null = null;

  setCallbacks(cbs: {
    onComplete?: OnComplete;
    onStatusChange?: OnStatusChange;
    onError?: OnError;
  }) {
    if (cbs.onComplete) this.onComplete = cbs.onComplete;
    if (cbs.onStatusChange) this.onStatusChange = cbs.onStatusChange;
    if (cbs.onError) this.onError = cbs.onError;
  }

  async startRecording(id: string): Promise<void> {
    // Mic is exclusive — stop every active recording before acquiring the stream.
    for (const activeId of [...this.active.keys()]) {
      this.stopEntry(activeId);
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      this.onStatusChange?.(id, 'error');
      this.onError?.(id, err instanceof Error ? err.message : 'Microphone access denied');
      return;
    }

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      this.active.delete(id);
      stream.getTracks().forEach(t => t.stop());

      const blob = new Blob(chunks, { type: 'audio/webm' });
      this.onComplete?.(id, blob);
    };

    recorder.onerror = () => {
      this.active.delete(id);
      stream.getTracks().forEach(t => t.stop());
      this.onStatusChange?.(id, 'error');
      this.onError?.(id, 'Recording error occurred');
    };

    this.active.set(id, { recorder, stream });
    recorder.start();
    this.onStatusChange?.(id, 'recording');
  }

  stopRecording(id: string): void {
    this.stopEntry(id);
  }

  stopAll(): void {
    for (const id of [...this.active.keys()]) {
      this.stopEntry(id);
    }
  }

  private stopEntry(id: string): void {
    const entry = this.active.get(id);
    if (!entry) return;

    // Remove before stopping to avoid re-entrant onstop calls
    this.active.delete(id);
    entry.stream.getTracks().forEach(t => t.stop());

    if (entry.recorder.state !== 'inactive') {
      entry.recorder.stop();
    }
  }
}
