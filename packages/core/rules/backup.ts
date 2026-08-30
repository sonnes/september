import { PANEL_TABS, type PanelState } from "./panel.ts";
import {
  PRESENT_TONES,
  type PresentSettings,
  type PresentToneKey,
} from "./present.ts";
import { spaceSlug } from "./spaces.ts";
import { USAGE_EVENT_TYPES, type UsageEventType } from "./usage-summary.ts";

export const BACKUP_FORMAT = "september-backup" as const;
export const BACKUP_FORMAT_VERSION = 1 as const;

export type BackupSource = "web" | "desktop";

/**
 * The settings a backup carries, under the names both apps store them by.
 *
 * A restore removes every one of these and writes it again. A key that is
 * not here belongs to the device — a provider key, the chosen output, the
 * state of a migration — and a restore never touches it.
 */
export const PORTABLE_SETTING_KEYS = [
  "setup",
  "speech",
  "dismissed-ideas",
  "space-modes",
  "new-space-draft",
  "panel-open",
  "present",
] as const;

export interface BackupSetup {
  id: string;
  name: string;
  speakingStyle: string;
  personalWords: string;
  mode: "free" | "advanced";
  writingService: "apple" | "openrouter" | "none";
  writingModel: string;
  voiceService: "system" | "elevenlabs";
}

export interface BackupSpeech {
  provider: "system" | "elevenlabs";
  voiceId: string | null;
  modelId: string;
  stability: number;
  similarity: number;
  speed: number;
}

export interface BackupSettings {
  setup: BackupSetup | null;
  speech: BackupSpeech | null;
  dismissedIdeas: string[];
  spaceModes: Record<string, "talk" | "notes">;
  newSpaceDraft: string;
  panel: PanelState;
  present: PresentSettings;
}

export interface BackupSpace {
  id: string;
  user_id: string;
  title?: string;
  context?: string;
  phrases_synced_count?: number;
  created_at: number;
  updated_at: number;
}

export interface BackupMessage {
  id: string;
  space_id?: string;
  user_id: string;
  text: string;
  type: string;
  created_at: number;
}

export interface BackupNote {
  id: string;
  space_id?: string;
  name?: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface BackupPhrase {
  id: string;
  space_id: string;
  text: string;
  kind: "phrase" | "starter";
  code?: string;
  pinned: boolean;
  created_at: number;
  updated_at: number;
}

export interface BackupUsageEvent {
  id: string;
  user_id: string;
  event_type: UsageEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface SeptemberBackup {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  source: BackupSource;
  appVersion: string;
  settings: BackupSettings;
  spaces: BackupSpace[];
  messages: BackupMessage[];
  notes: BackupNote[];
  savedPhrases: BackupPhrase[];
  usageEvents: BackupUsageEvent[];
}

export type BackupContents = Pick<
  SeptemberBackup,
  | "settings"
  | "spaces"
  | "messages"
  | "notes"
  | "savedPhrases"
  | "usageEvents"
>;

export interface BackupSummary {
  exportedAt: string;
  source: BackupSource;
  spaces: number;
  messages: number;
  notes: number;
  savedPhrases: number;
  usageEvents: number;
}

const USAGE_EVENT_TYPE_SET = new Set<UsageEventType>(USAGE_EVENT_TYPES);
const PANEL_TABS_SET = new Set(PANEL_TABS.map((tab) => tab.key));
const PRESENT_TONES_SET = new Set(PRESENT_TONES.map((tone) => tone.key));
const textEncoder = new TextEncoder();

function invalid(detail: string): never {
  throw new Error(`This is not a valid September backup. ${detail}`);
}

function objectOf(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalid(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function arrayOf(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) invalid(`${label} must be an array.`);
  return value;
}

function stringOf(
  value: unknown,
  label: string,
  { empty = true, maxBytes }: { empty?: boolean; maxBytes?: number } = {},
): string {
  if (typeof value !== "string") invalid(`${label} must be text.`);
  const bytes = textEncoder.encode(value).byteLength;
  if (!empty && bytes === 0) invalid(`${label} must not be empty.`);
  if (maxBytes !== undefined && bytes > maxBytes) {
    invalid(`${label} must contain no more than ${maxBytes} bytes.`);
  }
  return value;
}

function identifier(value: unknown, label: string): string {
  return stringOf(value, label, { empty: false, maxBytes: 256 });
}

function optionalString(row: Record<string, unknown>, key: string, label: string): string | undefined {
  return row[key] === undefined ? undefined : stringOf(row[key], label);
}

function oneOf<T extends string>(value: unknown, choices: readonly T[], label: string): T {
  if (typeof value !== "string" || !choices.includes(value as T)) {
    invalid(`${label} is not supported.`);
  }
  return value as T;
}

function backupPanelTab(value: unknown): PanelState["tab"] {
  if (value === "camera") return "phrases";
  return oneOf(value, [...PANEL_TABS_SET], "panel tab");
}

function booleanOf(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") invalid(`${label} must be true or false.`);
  return value;
}

function integerOf(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    invalid(`${label} must be a nonnegative integer.`);
  }
  return value;
}

function boundedNumber(value: unknown, minimum: number, maximum: number, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    invalid(`${label} must be from ${minimum} to ${maximum}.`);
  }
  return value;
}

function timestamps(row: Record<string, unknown>, label: string): Pick<BackupSpace, "created_at" | "updated_at"> {
  const created_at = integerOf(row.created_at, `${label} created_at`);
  const updated_at = integerOf(row.updated_at, `${label} updated_at`);
  if (updated_at < created_at) invalid(`${label} updated_at must not precede created_at.`);
  return { created_at, updated_at };
}

function uniqueIds<T extends { id: string }>(rows: T[], label: string): T[] {
  const found = new Set<string>();
  for (const row of rows) {
    if (found.has(row.id)) invalid(`The file contains a duplicate ${label} ID: ${row.id}.`);
    found.add(row.id);
  }
  return rows;
}

function setupFrom(value: unknown): BackupSetup | null {
  if (value === null) return null;
  const row = objectOf(value, "settings.setup");
  return {
    id: identifier(row.id, "setup ID"),
    name: stringOf(row.name, "setup name", { empty: false }),
    speakingStyle: stringOf(row.speakingStyle, "setup speaking style"),
    personalWords: stringOf(row.personalWords, "setup personal words"),
    mode: oneOf(row.mode, ["free", "advanced"], "setup mode"),
    writingService: oneOf(
      row.writingService,
      ["apple", "openrouter", "none"],
      "setup writing service",
    ),
    writingModel: stringOf(row.writingModel, "setup writing model"),
    voiceService: oneOf(
      row.voiceService,
      ["system", "elevenlabs"],
      "setup voice service",
    ),
  };
}

function speechFrom(value: unknown): BackupSpeech | null {
  if (value === null) return null;
  const row = objectOf(value, "settings.speech");
  return {
    provider: oneOf(row.provider, ["system", "elevenlabs"], "speech provider"),
    voiceId: row.voiceId === null ? null : identifier(row.voiceId, "speech voice ID"),
    modelId: identifier(row.modelId, "speech model ID"),
    stability: boundedNumber(row.stability, 0, 1, "speech stability"),
    similarity: boundedNumber(row.similarity, 0, 1, "speech similarity"),
    speed: boundedNumber(row.speed, 0.7, 1.2, "speech speed"),
  };
}

function settingsFrom(value: unknown): BackupSettings {
  const row = objectOf(value, "settings");
  const modes = objectOf(row.spaceModes, "settings.spaceModes");
  const panel = objectOf(row.panel, "settings.panel");
  const present = objectOf(row.present, "settings.present");

  return {
    setup: setupFrom(row.setup),
    speech: speechFrom(row.speech),
    dismissedIdeas: arrayOf(row.dismissedIdeas, "settings.dismissedIdeas").map((idea, index) =>
      stringOf(idea, `dismissed idea ${index + 1}`),
    ),
    spaceModes: Object.fromEntries(
      Object.entries(modes).map(([slug, mode]) => [
        identifier(slug, "space mode slug"),
        oneOf(mode, ["talk", "notes"], `mode for ${slug}`),
      ]),
    ),
    newSpaceDraft: stringOf(row.newSpaceDraft, "new-space draft"),
    panel: {
      open: booleanOf(panel.open, "panel open state"),
      tab: backupPanelTab(panel.tab),
    },
    present: {
      tone: oneOf(present.tone, [...PRESENT_TONES_SET], "presentation tone") as PresentToneKey,
      spoken: booleanOf(present.spoken, "presentation speech state"),
    },
  };
}

function spaceFrom(value: unknown): BackupSpace {
  const row = objectOf(value, "space");
  const phrases_synced_count =
    row.phrases_synced_count === undefined
      ? undefined
      : integerOf(row.phrases_synced_count, "space phrase count");
  return {
    id: identifier(row.id, "space ID"),
    user_id: identifier(row.user_id, "space user ID"),
    ...(optionalString(row, "title", "space title") === undefined
      ? {}
      : { title: optionalString(row, "title", "space title") }),
    ...(optionalString(row, "context", "space context") === undefined
      ? {}
      : { context: optionalString(row, "context", "space context") }),
    ...(phrases_synced_count === undefined ? {} : { phrases_synced_count }),
    ...timestamps(row, "space"),
  };
}

function messageFrom(value: unknown): BackupMessage {
  const row = objectOf(value, "message");
  const space_id = row.space_id === undefined ? undefined : identifier(row.space_id, "message space ID");
  return {
    id: identifier(row.id, "message ID"),
    ...(space_id === undefined ? {} : { space_id }),
    user_id: identifier(row.user_id, "message user ID"),
    text: stringOf(row.text, "message text"),
    type: identifier(row.type, "message type"),
    created_at: integerOf(row.created_at, "message created_at"),
  };
}

function noteFrom(value: unknown): BackupNote {
  const row = objectOf(value, "note");
  const space_id = row.space_id === undefined ? undefined : identifier(row.space_id, "note space ID");
  const name = optionalString(row, "name", "note name");
  return {
    id: identifier(row.id, "note ID"),
    ...(space_id === undefined ? {} : { space_id }),
    ...(name === undefined ? {} : { name }),
    content: stringOf(row.content, "note content"),
    ...timestamps(row, "note"),
  };
}

function phraseFrom(value: unknown): BackupPhrase {
  const row = objectOf(value, "saved phrase");
  const code = optionalString(row, "code", "saved phrase code");
  return {
    id: identifier(row.id, "saved phrase ID"),
    space_id: identifier(row.space_id, "saved phrase space ID"),
    text: stringOf(row.text, "saved phrase text", { empty: false, maxBytes: 256 }),
    kind: oneOf(row.kind, ["phrase", "starter"], "saved phrase kind"),
    ...(code === undefined ? {} : { code }),
    pinned: booleanOf(row.pinned, "saved phrase pinned state"),
    ...timestamps(row, "saved phrase"),
  };
}

function usageEventFrom(value: unknown): BackupUsageEvent {
  const row = objectOf(value, "usage event");
  const event_type = oneOf(row.event_type, [...USAGE_EVENT_TYPE_SET], "usage event type");
  return {
    id: identifier(row.id, "usage event ID"),
    user_id: identifier(row.user_id, "usage event user ID"),
    event_type,
    timestamp: integerOf(row.timestamp, "usage event timestamp"),
    data: objectOf(row.data, "usage event data"),
  };
}

/**
 * One backup belongs to one person.
 *
 * Both apps read spaces, messages, and usage by owner, and the owner they
 * ask for is the one in the settings. A row that names anybody else is
 * stored by a restore and then never shown, which reads as lost data. The
 * owner in the settings is the one the restored app will use, so every row
 * takes it. A backup with no setup names no owner, so its rows keep theirs.
 */
function withOneOwner(backup: SeptemberBackup): SeptemberBackup {
  const owner = backup.settings.setup?.id;
  if (owner === undefined) return backup;

  const owned = <T extends { user_id: string }>(rows: T[]) =>
    rows.map((row) => (row.user_id === owner ? row : { ...row, user_id: owner }));

  return {
    ...backup,
    spaces: owned(backup.spaces),
    messages: owned(backup.messages),
    usageEvents: owned(backup.usageEvents),
  };
}

function validateReferences(backup: SeptemberBackup): void {
  const spaceIds = new Set(backup.spaces.map((space) => space.id));
  const requireSpace = (spaceId: string | undefined, label: string) => {
    if (spaceId !== undefined && !spaceIds.has(spaceId)) {
      invalid(`${label} refers to a missing space: ${spaceId}.`);
    }
  };
  for (const message of backup.messages) requireSpace(message.space_id, `Message ${message.id}`);
  for (const note of backup.notes) requireSpace(note.space_id, `Note ${note.id}`);
  for (const phrase of backup.savedPhrases) requireSpace(phrase.space_id, `Saved phrase ${phrase.id}`);

  const slugs = new Set<string>();
  for (const space of backup.spaces) {
    const slug = spaceSlug(space.title);
    if (slugs.has(slug)) invalid(`More than one space title uses the route ${slug}.`);
    slugs.add(slug);
  }
}

function backupFrom(value: unknown): SeptemberBackup {
  const row = objectOf(value, "backup");
  if (row.format !== BACKUP_FORMAT) invalid(`The format name must be ${BACKUP_FORMAT}.`);
  if (row.formatVersion !== BACKUP_FORMAT_VERSION) {
    invalid(`Backup format version ${String(row.formatVersion)} is not supported.`);
  }
  const exportedAt = stringOf(row.exportedAt, "export date");
  if (!Number.isFinite(Date.parse(exportedAt))) invalid("The export date is invalid.");

  const backup: SeptemberBackup = withOneOwner({
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt,
    source: oneOf(row.source, ["web", "desktop"], "source app"),
    appVersion: stringOf(row.appVersion, "app version", { empty: false, maxBytes: 64 }),
    settings: settingsFrom(row.settings),
    spaces: uniqueIds(arrayOf(row.spaces, "spaces").map(spaceFrom), "space"),
    messages: uniqueIds(arrayOf(row.messages, "messages").map(messageFrom), "message"),
    notes: uniqueIds(arrayOf(row.notes, "notes").map(noteFrom), "note"),
    savedPhrases: uniqueIds(
      arrayOf(row.savedPhrases, "saved phrases").map(phraseFrom),
      "saved phrase",
    ),
    usageEvents: uniqueIds(
      arrayOf(row.usageEvents, "usage events").map(usageEventFrom),
      "usage event",
    ),
  });
  validateReferences(backup);
  return backup;
}

/** Parses and validates one user-selected backup before any repository changes. */
export function parseBackup(source: string): SeptemberBackup {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error("This backup is not valid JSON.");
  }
  return backupFrom(value);
}

/** Produces stable, readable JSON after one final contract validation. */
export function encodeBackup(backup: SeptemberBackup): string {
  const valid = backupFrom(backup);
  // The text of the identifier orders the rows, never the locale of the
  // machine: two Macs must write one backup the same way.
  const byId = <T extends { id: string }>(rows: T[]) =>
    [...rows].sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    );
  return `${JSON.stringify(
    {
      ...valid,
      spaces: byId(valid.spaces),
      messages: byId(valid.messages),
      notes: byId(valid.notes),
      savedPhrases: byId(valid.savedPhrases),
      usageEvents: byId(valid.usageEvents),
    },
    null,
    2,
  )}\n`;
}

/** The parts of a backup that a repository replaces, and nothing else. */
export function backupContents(backup: SeptemberBackup): BackupContents {
  return {
    settings: backup.settings,
    spaces: backup.spaces,
    messages: backup.messages,
    notes: backup.notes,
    savedPhrases: backup.savedPhrases,
    usageEvents: backup.usageEvents,
  };
}

/**
 * The sentence a user reads when a backup cannot be used.
 *
 * Tauri refuses a command with a string, not an error, so the reason the
 * desktop backend gives is kept instead of a general apology.
 */
export function backupProblem(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();
  return "September could not use that file.";
}

export function backupFileName(at = new Date()): string {
  return `september-backup-${at.toISOString().slice(0, 10)}.json`;
}

export function backupSummary(backup: SeptemberBackup): BackupSummary {
  return {
    exportedAt: backup.exportedAt,
    source: backup.source,
    spaces: backup.spaces.length,
    messages: backup.messages.length,
    notes: backup.notes.length,
    savedPhrases: backup.savedPhrases.length,
    usageEvents: backup.usageEvents.length,
  };
}
