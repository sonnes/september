import { expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn<(name: string, args?: unknown) => Promise<unknown>>());
vi.mock("@tauri-apps/api/core", () => ({ invoke, convertFileSrc: (path: string) => path }));
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));

const { readLastPath } = await import("./window");

it("reads the screen the user left last", async () => {
  invoke.mockResolvedValue("/notes");

  expect(await readLastPath()).toBe("/notes");
});

it("opens on the first screen when the last one cannot be read", async () => {
  const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
  invoke.mockRejectedValue("IPC is down");

  expect(await readLastPath()).toBeNull();
  expect(logged).toHaveBeenCalled();
  logged.mockRestore();
});
