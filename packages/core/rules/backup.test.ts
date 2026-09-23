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
  formatVersion: 2,
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
      defaultModel: { service: "openrouter", model: "default/model" },
      suggestionsModel: { service: "openrouter", model: "suggestions/model" },
      autoSuggestions: true,
      autoPhrases: true,
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
  agentMessages: [
    {
      id: "agent-1",
      space_id: "space-a",
      role: "assistant",
      content: "I can help with this space.",
      created_at: 16,
      updated_at: 16,
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
  it.each([
    [false, true],
    [true, false],
    [false, false],
    [true, true],
  ])(
    "preserves independent automatic generation settings (%s, %s)",
    (autoSuggestions, autoPhrases) => {
      const backup = validBackup();
      Object.assign(backup.settings.setup!, { autoSuggestions, autoPhrases });
      expect(
        parseBackup(encodeBackup(backup)).backup.settings.setup,
      ).toMatchObject({
        autoSuggestions,
        autoPhrases,
      });
    },
  );

  it("defaults missing automatic generation settings to enabled", () => {
    const backup = validBackup();
    const setup = backup.settings.setup! as unknown as Record<string, unknown>;
    delete setup.autoSuggestions;
    delete setup.autoPhrases;
    expect(
      parseBackup(JSON.stringify(backup)).backup.settings.setup,
    ).toMatchObject({
      autoSuggestions: true,
      autoPhrases: true,
    });
  });

  it.each(["autoSuggestions", "autoPhrases"])(
    "rejects invalid %s values",
    (field) => {
      const backup = validBackup();
      Object.assign(backup.settings.setup!, { [field]: "false" });
      const parsed = parseBackup(JSON.stringify(backup));
      expect(parsed.backup.settings.setup).toBeNull();
      expect(parsed.skipped).toBeGreaterThan(0);
    },
  );

  it("parses the fixture shared with the desktop backend", () => {
    const fixture = readFileSync(
      new URL("./fixtures/backup-v1.json", import.meta.url),
      "utf8",
    );

    expect(parseBackup(fixture)).toEqual({
      skipped: 0,
      backup: expect.objectContaining({
        formatVersion: 2,
        agentMessages: [],
        spaces: [expect.objectContaining({ id: "space-1" })],
        savedPhrases: [expect.objectContaining({ id: "phrase-1" })],
      }),
    });
  });

  it("parses a complete version-two backup", () => {
    expect(parseBackup(JSON.stringify(validBackup()))).toEqual({
      backup: validBackup(),
      skipped: 0,
    });
  });

  it("repairs the retired camera panel tab", () => {
    const backup = validBackup() as unknown as {
      settings: { panel: { open: boolean; tab: string } };
    };
    backup.settings.panel.tab = "camera";

    expect(parseBackup(JSON.stringify(backup)).backup.settings.panel).toEqual({
      open: true,
      tab: "phrases",
    });
  });

  it("encodes every collection in stable identifier order", () => {
    const { backup: parsed } = parseBackup(encodeBackup(validBackup()));

    expect(parsed.spaces.map((row) => row.id)).toEqual(["space-a", "space-b"]);
    expect(encodeBackup(parsed)).toBe(encodeBackup(parsed));
  });

  it("summarizes the private rows before replacement", () => {
    expect(backupSummary(validBackup())).toEqual({
      exportedAt: "2026-08-30T12:00:00.000Z",
      source: "web",
      spaces: 2,
      messages: 1,
      agentMessages: 1,
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

    expect(parseBackup(JSON.stringify(backup)).backup.usageEvents).toHaveLength(
      5,
    );
  });

  it("drops a machine-local audio path from a message", () => {
    const raw = validBackup() as SeptemberBackup & {
      messages: Array<
        SeptemberBackup["messages"][number] & { audio_path?: string }
      >;
    };
    raw.messages[0].audio_path = "/private/audio/message.mp3";

    expect(
      parseBackup(JSON.stringify(raw)).backup.messages[0],
    ).not.toHaveProperty("audio_path");
  });

  it.each([
    [
      "wrong format",
      (backup: Record<string, unknown>) => (backup.format = "other"),
    ],
    [
      "future version",
      (backup: Record<string, unknown>) => (backup.formatVersion = 3),
    ],
    [
      "invalid source",
      (backup: Record<string, unknown>) => (backup.source = "keyboard"),
    ],
  ])("rejects a %s", (_label, change) => {
    const backup = validBackup() as unknown as Record<string, unknown>;
    change(backup);

    expect(() => parseBackup(JSON.stringify(backup))).toThrow();
  });

  it("keeps the first row and skips a repeated identifier", () => {
    const backup = validBackup();
    backup.messages.push({ ...backup.messages[0], text: "A second copy." });

    const parsed = parseBackup(JSON.stringify(backup));

    expect(parsed.backup.messages).toEqual([validBackup().messages[0]]);
    expect(parsed.skipped).toBe(1);
  });

  it("skips a child whose space is absent", () => {
    const backup = validBackup();
    backup.notes[0].space_id = "missing";

    const parsed = parseBackup(JSON.stringify(backup));

    expect(parsed.backup.notes).toEqual([]);
    expect(parsed.backup.messages).toHaveLength(1);
    expect(parsed.skipped).toBe(1);
  });

  it("skips an Agent tool row that could crash or bypass its approval card", () => {
    const missingFields = validBackup();
    missingFields.agentMessages[0] = {
      ...missingFields.agentMessages[0],
      role: "tool",
    };
    expect(parseBackup(JSON.stringify(missingFields))).toMatchObject({
      backup: { agentMessages: [] },
      skipped: 1,
    });

    const malformedProposal = validBackup();
    malformedProposal.agentMessages[0] = {
      ...malformedProposal.agentMessages[0],
      role: "tool",
      tool_call_id: "call-1",
      tool_name: "change_note",
      tool_arguments: '{"operation":"delete"}',
      tool_state: "pending",
    };
    expect(parseBackup(JSON.stringify(malformedProposal))).toMatchObject({
      backup: { agentMessages: [] },
      skipped: 1,
    });
  });

  it("skips the second of two space titles that resolve to one route", () => {
    const backup = validBackup();
    backup.spaces[1].title = "work!";

    const parsed = parseBackup(JSON.stringify(backup));

    expect(parsed.backup.spaces.map((row) => row.title)).toEqual(["Work"]);
    expect(parsed.skipped).toBeGreaterThan(0);
  });

  it("skips invalid timestamps and forgets invalid sound values", () => {
    const timestamp = validBackup();
    timestamp.spaces[0].updated_at = 19;
    const withoutSpace = parseBackup(JSON.stringify(timestamp));
    expect(withoutSpace.backup.spaces.map((row) => row.id)).toEqual([
      "space-a",
    ]);
    expect(withoutSpace.skipped).toBe(1);

    const sound = validBackup();
    sound.settings.speech!.speed = 3;
    const withoutSpeech = parseBackup(JSON.stringify(sound));
    expect(withoutSpeech.backup.settings.speech).toBeNull();
    expect(withoutSpeech.backup.settings.setup).toEqual(
      validBackup().settings.setup,
    );
    expect(withoutSpeech.skipped).toBe(1);
  });

  it("writes what the app holds without validating it", () => {
    const backup = validBackup();
    backup.settings.speech!.speed = 3;
    backup.spaces[0].updated_at = 19;

    const written = JSON.parse(encodeBackup(backup));

    expect(written.settings.speech.speed).toBe(3);
    expect(written.spaces.map((row: { id: string }) => row.id)).toEqual([
      "space-a",
      "space-b",
    ]);
  });

  it("gives invalid JSON a file-level error", () => {
    expect(() => parseBackup("not json")).toThrow(/valid JSON/i);
  });

  it("gives every row the owner that setup names", () => {
    const backup = validBackup();
    backup.spaces[0].user_id = "an-old-mac-login";
    backup.messages[0].user_id = "an-old-mac-login";
    backup.usageEvents[0].user_id = "an-old-mac-login";

    const { backup: parsed } = parseBackup(JSON.stringify(backup));

    expect(parsed.spaces.map((row) => row.user_id)).toEqual([
      "person-1",
      "person-1",
    ]);
    expect(parsed.messages[0].user_id).toBe("person-1");
    expect(parsed.usageEvents[0].user_id).toBe("person-1");
  });

  it("keeps the owner of every row when the backup carries no setup", () => {
    const backup = validBackup();
    backup.settings.setup = null;

    expect(parseBackup(JSON.stringify(backup)).backup.spaces[0].user_id).toBe(
      "person-1",
    );
  });

  it("orders identifiers by their text, not by the locale of the machine", () => {
    const backup = validBackup();
    backup.spaces[0].id = "B";
    backup.spaces[1].id = "a";
    backup.messages[0].space_id = "a";
    backup.notes[0].space_id = "a";
    backup.savedPhrases[0].space_id = "a";
    backup.agentMessages[0].space_id = "a";

    expect(
      parseBackup(encodeBackup(backup)).backup.spaces.map((row) => row.id),
    ).toEqual(["B", "a"]);
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
      "agentMessages",
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
    expect(backupProblem(new Error("  "))).toBe(
      "September could not use that file.",
    );
    expect(backupProblem(null)).toBe("September could not use that file.");
  });

  it("upgrades the shared version-one fixture when encoding it", () => {
    const fixture = readFileSync(
      new URL("./fixtures/backup-v1.json", import.meta.url),
      "utf8",
    );

    const encoded = encodeBackup(parseBackup(fixture).backup);
    expect(JSON.parse(encoded)).toMatchObject({
      formatVersion: 2,
      agentMessages: [],
    });
  });
});
