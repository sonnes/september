import { Channel, invoke } from "@tauri-apps/api/core";

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

let activeChannel: Channel<GazeEvent> | null = null;

async function command<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(name, args);
  } catch (reason) {
    throw reason instanceof Error ? reason : new Error(String(reason));
  }
}

export async function startGaze(onEvent: (event: GazeEvent) => void): Promise<void> {
  const onEventChannel = new Channel<GazeEvent>(onEvent);
  await command<void>("gaze_start", { onEvent: onEventChannel });
  activeChannel = onEventChannel;
}

export async function stopGaze(): Promise<void> {
  try {
    await command<void>("gaze_stop");
  } finally {
    activeChannel = null;
  }
}
