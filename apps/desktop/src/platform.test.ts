import { beforeEach, describe, expect, it, vi } from "vitest";

import { PORTABLE_SETTING_KEYS } from "@september/core/rules/settings";
import { USAGE_RETENTION_MS } from "@september/core/rules/usage-summary";

const invoke = vi.hoisted(() => vi.fn<(name: string, args?: unknown) => Promise<unknown>>());
vi.mock("@tauri-apps/api/core", () => ({ invoke, convertFileSrc: (path: string) => path }));
const openUrl = vi.hoisted(() => vi.fn<(url: string) => Promise<void>>());
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl }));

const { platform } = await import("./platform");

const stored = {
  settings: {},
  spaces: [],
  messages: [],
  agentMessages: [],
  notes: [],
  savedPhrases: [],
  usageEvents: [],
};

// A block body, because Vitest calls a function that a hook returns after the test.
beforeEach(() => {
  invoke.mockReset();
});

const argsOf = (name: string) => invoke.mock.calls.find(([called]) => called === name)?.[1];

describe("the Mac store", () => {
  it("names the portable settings and the retention when it exports a backup", async () => {
    invoke.mockResolvedValue(stored);
    const before = Date.now();

    await platform.store.exportBackup();

    const { request } = argsOf("backup_export") as {
      request: { settingKeys: string[]; usageSince: number };
    };
    expect(request.settingKeys).toEqual(PORTABLE_SETTING_KEYS);
    expect(request.usageSince).toBeGreaterThanOrEqual(before - USAGE_RETENTION_MS);
    expect(request.usageSince).toBeLessThanOrEqual(Date.now() - USAGE_RETENTION_MS);
  });

  it("names the portable settings that a restore replaces", async () => {
    invoke.mockResolvedValue(undefined);

    await platform.store.importBackup(stored);

    expect(argsOf("backup_import")).toEqual({
      request: { contents: stored, settingKeys: PORTABLE_SETTING_KEYS },
    });
  });

  it("asks for usage with the retention boundary", async () => {
    invoke.mockResolvedValue([]);
    const before = Date.now();

    await platform.store.listUsageEvents("ravi", 10, 20);

    const { request } = argsOf("analytics_list") as {
      request: { user_id: string; start_at: number; end_at: number; since: number };
    };
    expect(request).toMatchObject({ user_id: "ravi", start_at: 10, end_at: 20 });
    expect(request.since).toBeGreaterThanOrEqual(before - USAGE_RETENTION_MS);
  });
});

describe("the Mac voice", () => {
  const settings = {
    provider: "dialogue" as const,
    voiceId: "v1",
    modelId: "eleven_flash_v2_5",
    stability: 0.45,
    similarity: 0.75,
    speed: 1.2,
  };
  const voice = { voiceId: "v1", modelId: "eleven_v3", stability: 0.5, similarity: 0.75, speed: 1 };

  it("names a live sentence with the saved settings", async () => {
    invoke.mockResolvedValue({ from_cache: true, latency_ms: 1, interrupted: null });

    await platform.voice.stream("Hi", voice, ["Hi"], new AbortController().signal, settings);

    expect(argsOf("speech_stream")).toEqual({
      request: {
        text: "Hi",
        voice: {
          ...voice,
          fileSettings: {
            provider: "dialogue",
            modelId: "eleven_v3",
            stability: 0.45,
            similarity: 0.75,
            speed: 1.2,
          },
        },
        dialogueParts: ["Hi"],
      },
    });
  });

  it("names a file with the settings it is made with", async () => {
    invoke.mockResolvedValue({ path: "/audio/a.mp3" });
    vi.stubGlobal("fetch", async () => new Response("sound"));

    await platform.voice.synthesize("Hi", voice, settings);

    expect(argsOf("speech_synthesize")).toEqual({
      request: {
        text: "Hi",
        voice: {
          ...voice,
          fileSettings: {
            provider: "dialogue",
            modelId: "eleven_v3",
            stability: 0.5,
            similarity: 0.75,
            speed: 1,
          },
        },
      },
    });
    vi.unstubAllGlobals();
  });
});

describe("the Mac identity", () => {
  it("passes on a Mac with no login name as no user", async () => {
    invoke.mockImplementation(async (name) => (name === "user_name" ? "Ravi" : null));

    expect(await platform.device.identity()).toEqual({ name: "Ravi", userId: null });
  });

  it("passes on a login name or a full name it cannot read as none", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    invoke.mockRejectedValue("IPC is down");

    expect(await platform.device.identity()).toEqual({ name: "", userId: null });
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});

describe("the Mac browser", () => {
  it("opens an address in the default browser", async () => {
    openUrl.mockResolvedValue();

    await platform.device.openInBrowser("https://september.to");

    expect(openUrl).toHaveBeenCalledWith("https://september.to");
  });

  it("logs an address it cannot open, so a link press never rejects", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    openUrl.mockRejectedValue("not allowed");

    await expect(platform.device.openInBrowser("https://september.to")).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});
