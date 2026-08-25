// @vitest-environment jsdom
/**
 * Setup has to work on the screen the user owns, not the screen it was drawn
 * on. These tests read the responsive contract off the rendered tree: the
 * indigo panel is a top bar below `md` and a sidebar from `md` up, and every
 * fixed measurement that would overflow a 320px screen carries a breakpoint.
 */
import React, { act, type ReactNode } from "react";

import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STEPS } from "@platform/rules/onboarding";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let pathname = "/welcome";
let screen: ReactNode = null;

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    disabled,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
    disabled?: boolean;
  }) => (
    <a href={to} aria-disabled={disabled || undefined} {...props}>
      {children}
    </a>
  ),
  Navigate: () => null,
  Outlet: () => <>{screen}</>,
  useNavigate: () => () => undefined,
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({ location: { pathname } }),
}));

vi.mock("@platform/services/speech", () => ({
  speechSettings: () => ({ provider: "system", voiceId: null }),
}));

vi.mock("@platform/services/os", () => ({
  osName: "Ravi",
  BLANK_CONNECTIONS: {
    apple: { supported: false, available: false, reason: null },
    openrouter: { provider: "openrouter", connected: false, label: null, detail: null },
    elevenlabs: { provider: "elevenlabs", connected: false, label: null, detail: null },
  },
  readConnections: async () => ({
    apple: { supported: false, available: false, reason: null },
    openrouter: { provider: "openrouter", connected: false, label: null, detail: null },
    elevenlabs: { provider: "elevenlabs", connected: false, label: null, detail: null },
  }),
  listVoices: async () => [],
  forgetProvider: async () => undefined,
  connectProvider: async () => undefined,
  saveSetup: async () => undefined,
  saveSpeech: async () => undefined,
}));

const { OnboardingLayout } = await import("@september/app-ui/layouts/onboarding");
const { ConnectStep, FinishStep, ModeStep, ProfileStep, WelcomeStep } =
  await import("@september/app-ui/pages/steps");

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  pathname = "/welcome";
  screen = null;
});

function show(at: string, step: ReactNode): void {
  pathname = at;
  screen = step;
  act(() => root.render(<OnboardingLayout />));
  // A step renders its document title, and React hoists that in a second pass.
  act(() => {});
}

/**
 * The layout sends an unreachable step back to the start, and /finish needs a
 * mode. So answer the mode step first; the draft is layout state and survives
 * the re-render.
 */
function showFinish(): void {
  show("/mode", <ModeStep />);
  const free = container.querySelector("main fieldset button")!;
  act(() => free.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  show("/finish", <FinishStep />);
}

const classes = (element: Element | null): string[] =>
  (element?.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);

/** The utility `name` must never apply unprefixed — only from a breakpoint up. */
function onlyFromBreakpoint(element: Element | null, name: string): void {
  const list = classes(element);
  expect(list).not.toContain(name);
  expect(list.some((one) => /^(sm|md|lg):/.test(one) && one.endsWith(`:${name}`))).toBe(true);
}

describe("the setup shell", () => {
  it("stacks the panel above the work surface, and turns it sideways at md", () => {
    show("/welcome", <WelcomeStep />);

    const shell = container.querySelector("aside")!.parentElement;
    expect(classes(shell)).toContain("flex-col");
    expect(classes(shell)).toContain("md:flex-row");
  });

  it("gives the indigo panel a fixed width only from md up", () => {
    show("/welcome", <WelcomeStep />);

    onlyFromBreakpoint(container.querySelector("aside"), "w-72");
  });

  it("lays the panel out as a bar below md and a column from md up", () => {
    show("/welcome", <WelcomeStep />);

    const panel = container.querySelector("aside");
    expect(classes(panel)).toContain("flex-row");
    expect(classes(panel)).toContain("md:flex-col");
  });

  it("drops the setup pitch below md, where the bar has no room for it", () => {
    show("/welcome", <WelcomeStep />);

    const pitch = container.querySelector("aside h1")!.parentElement;
    expect(classes(pitch)).toContain("hidden");
    expect(classes(pitch)).toContain("md:block");
  });

  it("pads the work surface tighter below md", () => {
    show("/welcome", <WelcomeStep />);

    const surface = container.querySelector("main");
    onlyFromBreakpoint(surface, "px-10");
    onlyFromBreakpoint(surface, "py-8");
  });
});

describe("the progress nav", () => {
  it("renders each step exactly once, so no screen reader hears it twice", () => {
    show("/welcome", <WelcomeStep />);

    const links = container.querySelectorAll("nav a");
    expect(links).toHaveLength(4); // free setup skips /connect
  });

  it("keeps each step's accessible name while the bar hides its label", () => {
    show("/profile", <ProfileStep />);

    const named = [...container.querySelectorAll("nav a")].map((link) =>
      link.getAttribute("aria-label"),
    );
    expect(named[0]).toBe("Step 1: Welcome, completed");
    expect(named[1]).toBe("Step 2: About you, current");

    // The visible label is the part that goes; the name above stays.
    const label = container.querySelector("nav a span:last-child");
    expect(classes(label)).toContain("hidden");
    expect(classes(label)).toContain("md:inline");
  });

  it("turns the run of steps sideways below md", () => {
    show("/welcome", <WelcomeStep />);

    const list = container.querySelector("nav ol");
    expect(classes(list)).toContain("flex-row");
    expect(classes(list)).toContain("md:flex-col");
  });
});

describe("a step screen", () => {
  it("scales its title up from the small screen, not down from the large one", () => {
    show("/welcome", <WelcomeStep />);

    const title = container.querySelector("main h2");
    expect(classes(title)).toContain("text-2xl");
    onlyFromBreakpoint(title, "text-3xl");
    onlyFromBreakpoint(title, "text-4xl");
  });

  it("fills the row with the primary action below sm", () => {
    show("/welcome", <WelcomeStep />);

    const action = [...container.querySelectorAll("main button")].find(
      (button) => button.textContent === STEPS[0].action,
    );
    expect(classes(action)).toContain("w-full");
    expect(classes(action)).toContain("sm:w-auto");
  });
});

describe("the choose-setup step", () => {
  it("keeps the mode cards in one column below lg", () => {
    show("/mode", <ModeStep />);

    const fieldset = container.querySelector("main fieldset");
    onlyFromBreakpoint(fieldset, "grid-cols-2");
  });
});

describe("the connect step", () => {
  it("wraps a service badge onto its own row below sm", async () => {
    await act(async () => {
      pathname = "/connect";
      screen = <ConnectStep />;
      root.render(<OnboardingLayout />);
    });

    // Row two of a three-column grid, under the service name — not a fourth
    // column the screen has no width for.
    const badge = container.querySelector("main label > span:last-child");
    expect(classes(badge)).toContain("col-start-3");
    expect(classes(badge)).toContain("sm:col-start-4");
  });

  it("drops the panel indent below sm, where it would squeeze the field", async () => {
    await act(async () => {
      pathname = "/connect";
      screen = <ConnectStep />;
      root.render(<OnboardingLayout />);
    });

    const panel = container.querySelector("main label + div");
    onlyFromBreakpoint(panel, "pl-[4.75rem]");
  });
});

describe("the finish step", () => {
  it("stacks a summary row below sm", () => {
    showFinish();

    const row = container.querySelector("main dl > div");
    onlyFromBreakpoint(row, "grid-cols-[8rem_minmax(0,1fr)]");
  });
});
