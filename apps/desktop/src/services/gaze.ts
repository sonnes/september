import { Channel } from "@tauri-apps/api/core";

import { call } from "@/commands";
import type { GazePoint } from "@/rules/eye-tracker";

export type GazeFrame = {
  width: number;
  height: number;
  pixelsBase64: string;
  point: GazePoint | null;
};

/** The states that `src-tauri/src/gaze.rs` sends. */
export type GazeState =
  | "starting"
  | "ready"
  | "noFace"
  | "lowConfidence"
  | "permissionDenied"
  | "unavailable"
  | "error"
  | "stopped";

export type GazeEvent =
  | {
      event: "frame";
      data: GazeFrame;
    }
  | {
      event: "status";
      data: { state: GazeState; detail: string | null };
    };

export async function startGaze(onEvent: (event: GazeEvent) => void): Promise<void> {
  await call("gaze_start", { onEvent: new Channel<GazeEvent>(onEvent) });
}

export async function stopGaze(): Promise<void> {
  await call("gaze_stop");
}
