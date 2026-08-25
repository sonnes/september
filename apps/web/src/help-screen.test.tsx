// @vitest-environment jsdom
import React, { act } from "react";

import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  HELP_CATEGORIES,
  HELP_GUIDES,
  HELP_HOME_SHORTCUTS,
  HELP_PLATFORMS,
  groupHelpGuides,
  helpGuide,
  searchHelpGuides,
} from "@september/core/rules/help";
import {
  HelpGuideContent,
  HelpScreen,
} from "@september/app-ui/pages/help";
import { SidebarProvider } from "@september/ui/components/sidebar";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
    params?: Record<string, string>;
  }) => {
    const href = Object.entries(params ?? {}).reduce(
      (path, [name, value]) => path.replace(`$${name}`, value),
      to,
    );
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

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
});

function render(ui: React.ReactElement) {
  act(() => root.render(<SidebarProvider>{ui}</SidebarProvider>));
}

function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function guideLinks(scope: ParentNode = container): HTMLAnchorElement[] {
  return [...scope.querySelectorAll<HTMLAnchorElement>("[data-help-guide-slug]")];
}

describe("the Help home", () => {
  it("keeps the sidebar control visible and scrolls inside the app shell", () => {
    render(<HelpScreen />);

    expect(container.querySelector('[data-sidebar="trigger"]')).toBeTruthy();
    expect(container.querySelector("[data-help-scroll]")).toBeTruthy();
  });

  it("puts urgent shortcuts before search and category browsing", () => {
    render(<HelpScreen />);

    const shortcuts = container.querySelector("[data-help-shortcuts]")!;
    const search = container.querySelector("[data-help-search]")!;
    const categories = container.querySelector("[data-help-categories]")!;

    expect(shortcuts.compareDocumentPosition(search)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(search.compareDocumentPosition(categories)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      [...shortcuts.querySelectorAll("a")].map((link) => link.textContent?.trim()),
    ).toEqual(HELP_HOME_SHORTCUTS.map((shortcut) => shortcut.title));
  });

  it("filters the visible guides from the search field", () => {
    const query = "FaceTime";
    const expected = searchHelpGuides(query);
    expect(expected.length).toBeGreaterThan(0);
    expect(expected.length).toBeLessThan(HELP_GUIDES.length);

    render(<HelpScreen />);
    typeInto(container.querySelector<HTMLInputElement>("[data-help-search]")!, query);

    expect(
      guideLinks().map((link) => link.dataset.helpGuideSlug),
    ).toEqual(expected.map((guide) => guide.slug));
    expect(container.textContent).not.toContain("Browse by task");
  });

  it("exposes every category and guide without requiring search", () => {
    const grouped = groupHelpGuides();
    render(<HelpScreen />);

    for (const category of HELP_CATEGORIES) {
      const section = container.querySelector(
        `[data-help-category="${category.id}"]`,
      )!;
      expect(section).toBeTruthy();
      expect(section.textContent).toContain(category.title);
      expect(
        guideLinks(section).map((link) => link.dataset.helpGuideSlug),
      ).toEqual(
        grouped
          .find((group) => group.category.id === category.id)!
          .guides.map((guide) => guide.slug),
      );
    }
  });

  it("shows the platform labels on guide links", () => {
    render(<HelpScreen />);

    for (const platform of HELP_PLATFORMS) {
      expect(container.textContent).toContain(platform.label);
    }
  });
});

describe("a Help guide", () => {
  it("renders its steps, expected result, recovery, and related links", () => {
    const guide = helpGuide("speak-your-first-message")!;
    render(<HelpGuideContent guide={guide} />);

    expect(container.querySelector("h1")?.textContent).toBe(guide.title);
    expect(
      [...container.querySelectorAll("[data-help-step]")].map(
        (step) => step.textContent,
      ),
    ).toEqual(guide.steps);
    expect(container.textContent).toContain(guide.expectedResult);
    expect(container.textContent).toContain(guide.recovery);
    expect(
      guideLinks().map((link) => link.dataset.helpGuideSlug),
    ).toEqual(guide.related);
  });

  it("keeps the written guide and omits broken frames when media is unavailable", () => {
    const guide = helpGuide("speak-your-first-message")!;
    render(<HelpGuideContent guide={guide} />);

    expect(container.textContent).toContain(guide.steps[0]);
    expect(container.querySelectorAll("img, video")).toHaveLength(0);
    expect(container.querySelector("[data-help-media-frame]")).toBeNull();
  });

  it("shows an available screenshot with its action-oriented text alternative", () => {
    const guide = helpGuide("learn-the-talk-screen")!;
    render(<HelpGuideContent guide={guide} />);

    const image = container.querySelector("img");
    expect(image?.getAttribute("src")).toBe("/help/talk-screen.png");
    expect(image?.getAttribute("alt")).toContain("Talk screen");
    expect(image?.closest("a")?.getAttribute("href")).toBe(
      "/help/talk-screen.png",
    );
  });

  it("returns safely to Help when a slug is unknown", () => {
    render(<HelpScreen guideSlug="not-a-guide" />);

    expect(container.textContent).toContain("Guide not found");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/help");
  });
});
