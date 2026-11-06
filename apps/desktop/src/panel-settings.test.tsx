import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { PanelSettings } from "./panel-settings";

const window = vi.hoisted(() => ({
  panelFloat: vi.fn<() => Promise<boolean>>(),
  setPanelFloat: vi.fn<(on: boolean) => Promise<void>>(),
}));
vi.mock("@/window", () => window);

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

const toggle = () => container.querySelector<HTMLButtonElement>('[role="switch"]')!;
const alert = () => container.querySelector('[role="alert"]')?.textContent ?? null;

async function render(): Promise<void> {
  await act(async () => root.render(<PanelSettings />));
}

it("shows the saved float choice and saves a change", async () => {
  window.panelFloat.mockResolvedValue(false);
  window.setPanelFloat.mockResolvedValue();
  await render();
  expect(toggle().getAttribute("aria-checked")).toBe("false");

  await act(async () => toggle().click());

  expect(window.setPanelFloat).toHaveBeenCalledWith(true);
  expect(toggle().getAttribute("aria-checked")).toBe("true");
});

it("keeps the saved choice when a write fails", async () => {
  window.panelFloat.mockResolvedValue(true);
  window.setPanelFloat.mockRejectedValue(new Error("denied"));
  await render();

  await act(async () => toggle().click());

  expect(toggle().getAttribute("aria-checked")).toBe("true");
  expect(alert()).not.toBeNull();
});

it("says so and offers no switch value when the choice cannot be read", async () => {
  window.panelFloat.mockRejectedValue(new Error("no window"));
  await render();

  expect(alert()).not.toBeNull();
  expect(toggle().disabled).toBe(true);
  expect(toggle().getAttribute("aria-checked")).toBe("false");
});
