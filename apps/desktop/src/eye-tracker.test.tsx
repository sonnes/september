import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { GazeEvent } from "./services/gaze";

const gaze = vi.hoisted(() => ({
  startGaze: vi.fn<(onEvent: (event: GazeEvent) => void) => Promise<void>>(),
  stopGaze: vi.fn<() => Promise<void>>(),
}));
vi.mock("@/services/gaze", () => gaze);
vi.mock("@september/app-ui/blocks/screen", () => ({
  Screen: ({ action, children }: { action: ReactNode; children: ReactNode }) => (
    <div>
      {action}
      {children}
    </div>
  ),
}));

const { EyeTracker } = await import("./eye-tracker");

let container: HTMLDivElement;
let root: Root;
let send: (event: GazeEvent) => void;

beforeEach(() => {
  gaze.startGaze.mockImplementation(async (onEvent) => {
    send = onEvent;
  });
  gaze.stopGaze.mockResolvedValue();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

const status = () => container.querySelector('[role="status"]')?.textContent;
const button = (name: string) =>
  [...container.querySelectorAll("button")].find((each) => each.textContent?.includes(name))!;
const tracker = (state: GazeEvent & { event: "status" }) => act(async () => send(state));

it("says each state that the camera sends in words", async () => {
  await act(async () => root.render(<EyeTracker />));
  const off = status();
  await act(async () => button("Start camera").click());
  const starting = status();

  await tracker({ event: "status", data: { state: "starting", detail: null } });
  expect(status()).toBe(starting);

  await act(async () => button("Stop camera").click());
  await tracker({ event: "status", data: { state: "stopped", detail: null } });
  expect(status()).toBe(off);
});

it("shows the reason that the camera gives", async () => {
  await act(async () => root.render(<EyeTracker />));
  await act(async () => button("Start camera").click());

  await tracker({ event: "status", data: { state: "error", detail: "No camera." } });

  expect(status()).toBe("No camera.");
  expect(gaze.stopGaze).toHaveBeenCalled();
});
