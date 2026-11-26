import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { PanelSettings } from "./panel-settings";

const window = vi.hoisted(() => ({
  panelFloat: vi.fn<() => Promise<boolean>>(),
  setPanelFloat: vi.fn<(on: boolean) => Promise<void>>(),
  exportNotes: vi.fn<() => Promise<{ count: number; folder: string }>>(),
}));
vi.mock("@/window", () => window);

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
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

const toggle = () =>
  container.querySelector<HTMLButtonElement>('[role="switch"]')!;
const copy = () =>
  [...container.querySelectorAll("button")].find((button) =>
    /notes/i.test(button.textContent ?? "")
  )!;
const status = () =>
  container.querySelector('[role="status"]')?.textContent ?? "";
const alert = () =>
  container.querySelector('[role="alert"]')?.textContent ?? null;

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

it("copies the notes in one press and says how many and where", async () => {
  window.panelFloat.mockResolvedValue(true);
  window.exportNotes.mockResolvedValue({
    count: 12,
    folder: "/Users/ravi/Documents/September",
  });
  await render();

  await act(async () => copy().click());

  expect(window.exportNotes).toHaveBeenCalledTimes(1);
  expect(status()).toContain("12 notes");
  expect(status()).toContain("/Users/ravi/Documents/September");
});

it("says so when the notes cannot be copied", async () => {
  window.panelFloat.mockResolvedValue(true);
  window.exportNotes.mockRejectedValue(new Error("no access"));
  await render();

  await act(async () => copy().click());

  expect(alert()).not.toBeNull();
  expect(copy().getAttribute("aria-disabled")).not.toBe("true");
});

it("keeps the copy key in focus and ignores a second press while it copies", async () => {
  window.panelFloat.mockResolvedValue(true);
  window.exportNotes.mockReturnValue(new Promise(() => undefined));
  await render();

  await act(async () => copy().click());
  await act(async () => copy().click());

  expect(window.exportNotes).toHaveBeenCalledTimes(1);
  expect(copy().getAttribute("aria-disabled")).toBe("true");
  expect(copy().disabled).toBe(false);
});
