import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  backupContents,
  backupFileName,
  backupProblem,
  backupSummary,
  encodeBackup,
  parseBackup,
  PORTABLE_SETTING_KEYS,
  type SeptemberBackup,
} from "./backup.ts";

const validBackup = (): SeptemberBackup => ({
  format: "september-backup",
  formatVersion: 1,
  exportedAt: "2026-08-30T12:00:00.000Z",
  source: "web",
  appVersion: "0.1.0",
  settings: {
    setup: {
      id: "person-1",
      name: "Ravi",
      speakingStyle: "Plain and direct.",
      personalWords: "My cat is called Miso.",
      mode: "advanced",
      writingService: "openrouter",
      writingModel: "",
      voiceService: "elevenlabs",
    },
    speech: {
      provider: "elevenlabs",
      voiceId: "voice-1",
      modelId: "eleven_turbo_v2_5",
      stability: 0.5,
      similarity: 0.75,
      speed: 1,
    },
    dismissedIdeas: ["idea-1"],
    spaceModes: { family: "notes" },
    newSpaceDraft: "A careful unfinished thought.",
    panel: { open: true, tab: "voice" },
    present: { tone: "cream", spoken: false },
  },
  spaces: [
    {
      id: "space-b",
      user_id: "person-1",
      title: "Work",
      created_at: 20,
      updated_at: 20,
    },
    {
      id: "space-a",
      user_id: "person-1",
      title: "Family",
      context: "People at home.",
      phrases_synced_count: 1,
      created_at: 10,
      updated_at: 15,
    },
  ],
  messages: [
    {
      id: "message-1",
      space_id: "space-a",
      user_id: "person-1",
      text: "Hello.",
      type: "user",
      created_at: 12,
    },
  ],
  notes: [
    {
      id: "note-1",
      space_id: "space-a",
      name: "Visit",
      content: "Please bring Miso.",
      created_at: 13,
      updated_at: 14,
    },
  ],
  savedPhrases: [
    {
      id: "phrase-1",
      space_id: "space-a",
      text: "Give me a minute.",
      kind: "phrase",
      code: "gmm",
      pinned: true,
      created_at: 14,
      updated_at: 14,
    },
  ],
  usageEvents: [
    {
      id: "event-1",
      user_id: "person-1",
      event_type: "message_sent",
      timestamp: 15,
      data: { text_length: 6, keys_typed: 2 },
    },
  ],
});

describe("the portable September backup", () => {
  it("parses the fixture shared with the desktop backend", () => {
    const fixture = readFileSync(
      new URL("./fixtures/backup-v1.json", import.meta.url),
      "utf8",
    );

    expect(parseBackup(fixture)).toMatchObject({
      formatVersion: 1,
      spaces: [{ id: "space-1" }],
      savedPhrases: [{ id: "phrase-1" }],
    });
  });

  it("parses a complete version-one backup", () => {
    expect(parseBackup(JSON.stringify(validBackup()))).toEqual(validBackup());
  });

  it("repairs the retired camera panel tab", () => {
    const backup = validBackup() as unknown as {
      settings: { panel: { open: boolean; tab: string } };
    };
    backup.settings.panel.tab = "camera";

    expect(parseBackup(JSON.stringify(backup)).settings.panel).toEqual({
      open: true,
      tab: "phrases",
    });
  });

  it("encodes every collection in stable identifier order", () => {
    const parsed = parseBackup(encodeBackup(validBackup()));

    expect(parsed.spaces.map((row) => row.id)).toEqual(["space-a", "space-b"]);
    expect(encodeBackup(parsed)).toBe(encodeBackup(parsed));
  });

  it("summarizes the private rows before replacement", () => {
    expect(backupSummary(validBackup())).toEqual({
      exportedAt: "2026-08-30T12:00:00.000Z",
      source: "web",
      spaces: 2,
      messages: 1,
      notes: 1,
      savedPhrases: 1,
      usageEvents: 1,
    });
    expect(backupFileName(new Date("2026-08-30T23:59:59.000Z"))).toBe(
      "september-backup-2026-08-30.json",
    );
  });

  it("accepts every shared usage event type", () => {
    const backup = validBackup();
    backup.usageEvents = [
      "message_sent",
      "ai_generation",
      "tts_generation",
      "note_present",
      "note_export",
    ].map((event_type, index) => ({
      id: `event-${index}`,
      user_id: "person-1",
      event_type: event_type as never,
      timestamp: index,
      data: {},
    }));

    expect(parseBackup(JSON.stringify(backup)).usageEvents).toHaveLength(5);
  });

  it("drops a machine-local audio path from a message", () => {
    const raw = validBackup() as SeptemberBackup & {
      messages: Array<SeptemberBackup["messages"][number] & { audio_path?: string }>;
    };
    raw.messages[0].audio_path = "/private/audio/message.mp3";

    expect(parseBackup(JSON.stringify(raw)).messages[0]).not.toHaveProperty("audio_path");
  });

  it.each([
    ["wrong format", (backup: Record<string, unknown>) => (backup.format = "other")],
    ["future version", (backup: Record<string, unknown>) => (backup.formatVersion = 2)],
    ["invalid source", (backup: Record<string, unknown>) => (backup.source = "keyboard")],
  ])("rejects a %s", (_label, change) => {
    const backup = validBackup() as unknown as Record<string, unknown>;
    change(backup);

    expect(() => parseBackup(JSON.stringify(backup))).toThrow();
  });

  it("rejects duplicate identifiers", () => {
    const backup = validBackup();
    backup.messages.push({ ...backup.messages[0] });

    expect(() => parseBackup(JSON.stringify(backup))).toThrow(/duplicate message ID/i);
  });

  it("rejects a child whose space is absent", () => {
    const backup = validBackup();
    backup.notes[0].space_id = "missing";

    expect(() => parseBackup(JSON.stringify(backup))).toThrow(/missing space/i);
  });

  it("rejects two space titles that resolve to one route", () => {
    const backup = validBackup();
    backup.spaces[1].title = "work!";

    expect(() => parseBackup(JSON.stringify(backup))).toThrow(/space title/i);
  });

  it("rejects invalid timestamps and sound values", () => {
    const timestamp = validBackup();
    timestamp.spaces[0].updated_at = 19;
    expect(() => parseBackup(JSON.stringify(timestamp))).toThrow(/updated_at/i);

    const sound = validBackup();
    sound.settings.speech!.speed = 3;
    expect(() => parseBackup(JSON.stringify(sound))).toThrow(/speed/i);
  });

  it("gives invalid JSON a file-level error", () => {
    expect(() => parseBackup("not json")).toThrow(/valid JSON/i);
  });

  it("gives every row the owner that setup names", () => {
    const backup = validBackup();
    backup.spaces[0].user_id = "an-old-mac-login";
    backup.messages[0].user_id = "an-old-mac-login";
    backup.usageEvents[0].user_id = "an-old-mac-login";

    const parsed = parseBackup(JSON.stringify(backup));

    expect(parsed.spaces.map((row) => row.user_id)).toEqual(["person-1", "person-1"]);
    expect(parsed.messages[0].user_id).toBe("person-1");
    expect(parsed.usageEvents[0].user_id).toBe("person-1");
  });

  it("keeps the owner of every row when the backup carries no setup", () => {
    const backup = validBackup();
    backup.settings.setup = null;

    expect(parseBackup(JSON.stringify(backup)).spaces[0].user_id).toBe("person-1");
  });

  it("orders identifiers by their text, not by the locale of the machine", () => {
    const backup = validBackup();
    backup.spaces[0].id = "B";
    backup.spaces[1].id = "a";
    backup.messages[0].space_id = "a";
    backup.notes[0].space_id = "a";
    backup.savedPhrases[0].space_id = "a";

    expect(parseBackup(encodeBackup(backup)).spaces.map((row) => row.id)).toEqual([
      "B",
      "a",
    ]);
  });

  it("names the settings a restore replaces", () => {
    expect([...PORTABLE_SETTING_KEYS]).toEqual([
      "setup",
      "speech",
      "dismissed-ideas",
      "space-modes",
      "new-space-draft",
      "panel-open",
      "present",
    ]);
  });

  it("hands a repository the portable parts and nothing else", () => {
    expect(Object.keys(backupContents(validBackup()))).toEqual([
      "settings",
      "spaces",
      "messages",
      "notes",
      "savedPhrases",
      "usageEvents",
    ]);
  });

  it("keeps the reason a file was refused, whoever gives it", () => {
    expect(backupProblem(new Error("The export date is invalid."))).toBe(
      "The export date is invalid.",
    );
    expect(backupProblem("backup panel tab is not supported")).toBe(
      "backup panel tab is not supported",
    );
    expect(backupProblem(new Error("  "))).toBe("September could not use that file.");
    expect(backupProblem(null)).toBe("September could not use that file.");
  });

  it("keeps the shared fixture in the form the encoder writes", () => {
    const fixture = readFileSync(
      new URL("./fixtures/backup-v1.json", import.meta.url),
      "utf8",
    );

    expect(encodeBackup(parseBackup(fixture))).toBe(fixture);
  });
});
