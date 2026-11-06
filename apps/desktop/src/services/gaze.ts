import { Channel } from "@tauri-apps/api/core";

import { call } from "@/commands";
import type { GazePoint } from "@/rules/eye-tracker";

export type GazeFrame = {
  width: number;
  height: number;
  pixelsBase64: string;
  point: GazePoint | null;
};

export type GazeEvent =
  | {
      event: "frame";
      data: GazeFrame;
    }
  | {
      event: "status";
      data: { state: string; detail: string | null };
    };

/**
 * The channel of the running session.
 *
 * Nothing reads it. It holds the channel alive for as long as Rust may send
 * on it, so the callback is not collected under a session in progress.
 */
let activeChannel: Channel<GazeEvent> | null = null;

export async function startGaze(onEvent: (event: GazeEvent) => void): Promise<void> {
  const onEventChannel = new Channel<GazeEvent>(onEvent);
  await call("gaze_start", { onEvent: onEventChannel });
  activeChannel = onEventChannel;
}

export async function stopGaze(): Promise<void> {
  try {
    await call("gaze_stop");
  } finally {
    activeChannel = null;
  }
}
