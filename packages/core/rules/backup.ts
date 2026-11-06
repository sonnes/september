import { parseAccess } from "./access.ts";
import { AGENT_TOOLS, isAgentWriteTool, parseAgentCall } from "./agent/tools.ts";
import { CLOSED_PANEL, PANEL_TABS, panelStateFrom, type PanelState } from "./panel.ts";
import { presentSettings, type PresentSettings } from "./present/settings.ts";
import { PRESENT_TONES } from "./present/stage.ts";
import {
  SETUP_MODES,
  speechFromOlderSetup,
  WRITING_SERVICES,
  type SavedSetup,
} from "./onboarding.ts";
import {
  AGENT_ROLES,
  AGENT_TOOL_STATES,
  PHRASE_KINDS,
  PHRASE_TEXT_LIMIT,
  SPACE_MODES,
  type AgentMessage,
  type Message,
  type Note,
  type SavedPhrase,
  type Space,
  type SpaceMode,
} from "./records.ts";
import { PORTABLE_SETTINGS } from "./settings.ts";
import { spaceSlug } from "./spaces.ts";
import { USAGE_EVENT_TYPES, type UsageEvent } from "./usage-summary.ts";
import { SPEECH_SERVICES, SPEED_RANGE, type SpeechSettings } from "./voice.ts";

export const BACKUP_FORMAT = "september-backup" as const;
export const BACKUP_FORMAT_VERSION = 2 as const;

export const BACKUP_SOURCES = ["web", "desktop"] as const;

export type BackupSource = (typeof BACKUP_SOURCES)[number];

export interface BackupSettings {
  setup: SavedSetup | null;
  speech: SpeechSettings | null;
  dismissedIdeas: string[];
  spaceModes: Record<string, SpaceMode>;
  panel: PanelState;
  present: PresentSettings;
}


export interface SeptemberBackup {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  source: BackupSource;
  appVersion: string;
  settings: BackupSettings;
  spaces: Space[];
  messages: Message[];
  agentMessages: AgentMessage[];
  notes: Note[];
  savedPhrases: SavedPhrase[];
  usageEvents: UsageEvent[];
}

export type BackupContents = Pick<
  SeptemberBackup,
  | "settings"
  | "spaces"
  | "messages"
  | "agentMessages"
  | "notes"
  | "savedPhrases"
  | "usageEvents"
>;

/**
 * The portable settings as a store holds them, by their stored key. A setup
 * saved before setups had an identifier has none.
 */
export type StoredSettings = {
  -readonly [K in keyof typeof PORTABLE_SETTINGS as (typeof PORTABLE_SETTINGS)[K]]?: K extends "setup"
    ? (Omit<SavedSetup, "id"> & { id?: string }) | null
    : BackupSettings[K];
};

/** The portable rows as a store holds them: the settings, and the rows of each table. */
export type StoredBackup = Omit<BackupContents, "settings"> & { settings: StoredSettings };

/** The contents of a backup, from the rows that a store holds. */
export function backupContentsFrom(stored: StoredBackup, userId: string): BackupContents {
  const { settings } = stored;
  const setup = settings[PORTABLE_SETTINGS.setup];
  return {
    ...stored,
    settings: {
      setup: setup ? { ...setup, id: setup.id ?? userId } : null,
      speech: settings[PORTABLE_SETTINGS.speech] ?? null,
      dismissedIdeas: settings[PORTABLE_SETTINGS.dismissedIdeas] ?? [],
      spaceModes: settings[PORTABLE_SETTINGS.spaceModes] ?? {},
      panel: panelStateFrom(settings[PORTABLE_SETTINGS.panel]),
      present: presentSettings(settings[PORTABLE_SETTINGS.present]),
    },
  };
}

/** The rows that a store keeps for the contents of a backup. */
export function storedBackupFrom(contents: BackupContents): StoredBackup {
  const { settings } = contents;
  return {
    ...contents,
    settings: {
      ...(settings.setup ? { [PORTABLE_SETTINGS.setup]: settings.setup } : {}),
      ...(settings.speech ? { [PORTABLE_SETTINGS.speech]: settings.speech } : {}),
      [PORTABLE_SETTINGS.dismissedIdeas]: settings.dismissedIdeas,
      [PORTABLE_SETTINGS.spaceModes]: settings.spaceModes,
      [PORTABLE_SETTINGS.panel]: settings.panel,
      [PORTABLE_SETTINGS.present]: settings.present,
    },
  };
}

export interface ParsedBackup {
  backup: SeptemberBackup;
  /** How many settings and rows had errors and were left out. */
  skipped: number;
}

export interface BackupSummary {
  exportedAt: string;
  source: BackupSource;
  spaces: number;
  messages: number;
  agentMessages: number;
  notes: number;
  savedPhrases: number;
  usageEvents: number;
}

const PANEL_TAB_KEYS = PANEL_TABS.map((tab) => tab.key);
const PRESENT_TONE_KEYS = PRESENT_TONES.map((tone) => tone.key);
const WRITING_SERVICE_KEYS = WRITING_SERVICES.map((service) => service.value);
const AGENT_TOOL_NAMES = AGENT_TOOLS.map((tool) => tool.function.name);
const textEncoder = new TextEncoder();

function invalid(detail: string): never {
  throw new Error(`This is not a valid September backup. ${detail}`);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function objectOf(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) invalid(`${label} must be an object.`);
  return value;
}

function arrayOf(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) invalid(`${label} must be an array.`);
  return value;
}

function stringOf(
  value: unknown,
  label: string,
  {
    empty = true,
    maxBytes,
    maxLength,
  }: { empty?: boolean; maxBytes?: number; maxLength?: number } = {},
): string {
  if (typeof value !== "string") invalid(`${label} must be text.`);
  if (maxLength !== undefined && value.length > maxLength) {
    invalid(`${label} must contain no more than ${maxLength} characters.`);
  }
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

function optionalString(
  row: Record<string, unknown>,
  key: string,
  label: string,
): string | undefined {
  return row[key] === undefined ? undefined : stringOf(row[key], label);
}

function oneOf<T extends string>(
  value: unknown,
  choices: readonly T[],
  label: string,
): T {
  const found = choices.find((choice) => choice === value);
  if (found === undefined) invalid(`${label} is not supported.`);
  return found;
}

function backupPanelTab(value: unknown): PanelState["tab"] {
  if (value === "camera") return "phrases";
  return oneOf(value, PANEL_TAB_KEYS, "panel tab");
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

function boundedNumber(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    invalid(`${label} must be from ${minimum} to ${maximum}.`);
  }
  return value;
}

function timestamps(
  row: Record<string, unknown>,
  label: string,
): Pick<Space, "created_at" | "updated_at"> {
  const created_at = integerOf(row.created_at, `${label} created_at`);
  const updated_at = integerOf(row.updated_at, `${label} updated_at`);
  if (updated_at < created_at)
    invalid(`${label} updated_at must not precede created_at.`);
  return { created_at, updated_at };
}

/** How many settings and rows an import left out. */
interface Skips {
  count: number;
}

/**
 * One value, or nothing when it has an error.
 *
 * A backup is the only copy of somebody's words. One bad row must not cost
 * the user the other thousand, so each value is read on its own and a value
 * that fails is counted and left out.
 */
function kept<T>(read: () => T, skips: Skips): T | undefined {
  try {
    return read();
  } catch {
    skips.count += 1;
    return undefined;
  }
}

function listFrom<T>(
  value: unknown,
  label: string,
  from: (entry: unknown, index: number) => T,
  skips: Skips,
): T[] {
  const entries = kept(() => arrayOf(value, label), skips) ?? [];
  const rows: T[] = [];
  entries.forEach((entry, index) => {
    const row = kept(() => from(entry, index), skips);
    if (row !== undefined) rows.push(row);
  });
  return rows;
}

function rowsFrom<T extends { id: string }>(
  value: unknown,
  label: string,
  from: (entry: unknown) => T,
  skips: Skips,
): T[] {
  const found = new Set<string>();
  return listFrom(value, label, from, skips).filter((row) => {
    if (found.has(row.id)) {
      skips.count += 1;
      return false;
    }
    found.add(row.id);
    return true;
  });
}

function setupFrom(value: unknown): SavedSetup | null {
  if (value === null) return null;
  const row = objectOf(value, "settings.setup");
  return {
    autoSuggestions:
      row.autoSuggestions === undefined
        ? true
        : booleanOf(row.autoSuggestions, "automatic suggestions"),
    autoPhrases:
      row.autoPhrases === undefined
        ? true
        : booleanOf(row.autoPhrases, "automatic phrase generation"),
    agentEnabled:
      row.agentEnabled === undefined
        ? true
        : booleanOf(row.agentEnabled, "agent switch"),
    id: identifier(row.id, "setup ID"),
    name: stringOf(row.name, "setup name", { empty: false }),
    speakingStyle: stringOf(row.speakingStyle, "setup speaking style"),
    personalWords: stringOf(row.personalWords, "setup personal words"),
    mode: oneOf(row.mode, SETUP_MODES, "setup mode"),
    defaultModel: modelConfigFrom(
      row.defaultModel === undefined
        ? { service: row.writingService, model: row.writingModel }
        : row.defaultModel,
      "setup default model",
    ),
    suggestionsModel:
      row.suggestionsModel === undefined || row.suggestionsModel === null
        ? null
        : modelConfigFrom(row.suggestionsModel, "setup Suggestions model"),
    access: parseAccess(row.access),
  };
}

function modelConfigFrom(value: unknown, label: string): SavedSetup["defaultModel"] {
  const row = objectOf(value, label);
  return {
    service: oneOf(row.service, WRITING_SERVICE_KEYS, `${label} service`),
    model: stringOf(row.model, `${label} model`),
  };
}

function speechFrom(value: unknown): SpeechSettings | null {
  if (value === null) return null;
  const row = objectOf(value, "settings.speech");
  return {
    provider: oneOf(row.provider, SPEECH_SERVICES, "speech provider"),
    voiceId:
      row.voiceId === null ? null : identifier(row.voiceId, "speech voice ID"),
    modelId: identifier(row.modelId, "speech model ID"),
    ...(row.dialogueModelId === undefined
      ? {}
      : { dialogueModelId: identifier(row.dialogueModelId, "speech dialogue model ID") }),
    stability: boundedNumber(row.stability, 0, 1, "speech stability"),
    similarity: boundedNumber(row.similarity, 0, 1, "speech similarity"),
    speed: boundedNumber(row.speed, SPEED_RANGE.min, SPEED_RANGE.max, "speech speed"),
  };
}

function spaceModesFrom(
  value: unknown,
  skips: Skips,
): BackupSettings["spaceModes"] {
  const modes = kept(() => objectOf(value, "settings.spaceModes"), skips) ?? {};
  const chosen: BackupSettings["spaceModes"] = {};
  for (const [slug, mode] of Object.entries(modes)) {
    const entry = kept(
      () =>
        [
          identifier(slug, "space mode slug"),
          oneOf(mode, SPACE_MODES, `mode for ${slug}`),
        ] as const,
      skips,
    );
    if (entry) chosen[entry[0]] = entry[1];
  }
  return chosen;
}

function panelFrom(value: unknown): PanelState {
  const panel = objectOf(value, "settings.panel");
  return {
    open: booleanOf(panel.open, "panel open state"),
    tab: backupPanelTab(panel.tab),
  };
}

function presentFrom(value: unknown): PresentSettings {
  const present = objectOf(value, "settings.present");
  return {
    tone: oneOf(present.tone, PRESENT_TONE_KEYS, "presentation tone"),
    spoken: booleanOf(present.spoken, "presentation speech state"),
  };
}

function settingsFrom(value: unknown, skips: Skips): BackupSettings {
  const row = kept(() => objectOf(value, "settings"), skips) ?? {};

  return {
    setup: kept(() => setupFrom(row.setup), skips) ?? null,
    speech: kept(() => speechFrom(row.speech), skips) ?? speechFromOlderSetup(row.setup),
    dismissedIdeas: listFrom(
      row.dismissedIdeas,
      "settings.dismissedIdeas",
      (idea, index) => stringOf(idea, `dismissed idea ${index + 1}`),
      skips,
    ),
    spaceModes: spaceModesFrom(row.spaceModes, skips),
    panel: kept(() => panelFrom(row.panel), skips) ?? CLOSED_PANEL,
    present: kept(() => presentFrom(row.present), skips) ?? presentSettings(undefined),
  };
}

function spaceFrom(value: unknown): Space {
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

function messageFrom(value: unknown): Message {
  const row = objectOf(value, "message");
  const space_id =
    row.space_id === undefined
      ? undefined
      : identifier(row.space_id, "message space ID");
  return {
    id: identifier(row.id, "message ID"),
    ...(space_id === undefined ? {} : { space_id }),
    user_id: identifier(row.user_id, "message user ID"),
    text: stringOf(row.text, "message text"),
    type: identifier(row.type, "message type"),
    created_at: integerOf(row.created_at, "message created_at"),
  };
}

function noteFrom(value: unknown): Note {
  const row = objectOf(value, "note");
  const space_id =
    row.space_id === undefined
      ? undefined
      : identifier(row.space_id, "note space ID");
  const name = optionalString(row, "name", "note name");
  return {
    id: identifier(row.id, "note ID"),
    ...(space_id === undefined ? {} : { space_id }),
    ...(name === undefined ? {} : { name }),
    content: stringOf(row.content, "note content"),
    ...timestamps(row, "note"),
  };
}

function phraseFrom(value: unknown): SavedPhrase {
  const row = objectOf(value, "saved phrase");
  const code = optionalString(row, "code", "saved phrase code");
  return {
    id: identifier(row.id, "saved phrase ID"),
    space_id: identifier(row.space_id, "saved phrase space ID"),
    text: stringOf(row.text, "saved phrase text", {
      empty: false,
      maxLength: PHRASE_TEXT_LIMIT,
    }),
    kind: oneOf(row.kind, PHRASE_KINDS, "saved phrase kind"),
    ...(code === undefined ? {} : { code }),
    pinned: booleanOf(row.pinned, "saved phrase pinned state"),
    ...timestamps(row, "saved phrase"),
  };
}

function usageEventFrom(value: unknown): UsageEvent {
  const row = objectOf(value, "usage event");
  const event_type = oneOf(row.event_type, USAGE_EVENT_TYPES, "usage event type");
  return {
    id: identifier(row.id, "usage event ID"),
    user_id: identifier(row.user_id, "usage event user ID"),
    event_type,
    timestamp: integerOf(row.timestamp, "usage event timestamp"),
    data: objectOf(row.data, "usage event data"),
  };
}

function agentMessageFrom(value: unknown): AgentMessage {
  const row = objectOf(value, "agent message");
  const id = identifier(row.id, "agent message ID");
  const role = oneOf(row.role, AGENT_ROLES, "agent message role");
  const tool_call_id =
    row.tool_call_id === undefined
      ? undefined
      : identifier(row.tool_call_id, "agent tool call ID");
  const tool_name =
    row.tool_name === undefined
      ? undefined
      : oneOf(row.tool_name, AGENT_TOOL_NAMES, "agent tool name");
  const tool_arguments = optionalString(
    row,
    "tool_arguments",
    "agent tool arguments",
  );
  const tool_state =
    row.tool_state === undefined
      ? undefined
      : oneOf(row.tool_state, AGENT_TOOL_STATES, "agent tool state");
  const toolFields = [tool_call_id, tool_name, tool_arguments, tool_state];
  if (role === "tool" && toolFields.some((field) => field === undefined)) {
    invalid(
      `Agent message ${id} must include its tool call ID, name, arguments, and state.`,
    );
  }
  if (role !== "tool" && toolFields.some((field) => field !== undefined)) {
    invalid(
      `Agent message ${id} cannot carry tool fields for the ${role} role.`,
    );
  }
  if (tool_name !== undefined && tool_arguments !== undefined) {
    try {
      parseAgentCall(tool_name, tool_arguments);
    } catch (error) {
      invalid(
        `Agent message ${id} has invalid tool arguments. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  if (
    tool_state === "pending" &&
    tool_name !== undefined &&
    !isAgentWriteTool(tool_name)
  ) {
    invalid(`Agent message ${id} cannot leave a read tool pending.`);
  }
  return {
    id,
    space_id: identifier(row.space_id, "agent message space ID"),
    role,
    content: stringOf(row.content, "agent message content", {
      maxBytes: 100_000,
    }),
    ...(tool_call_id === undefined ? {} : { tool_call_id }),
    ...(tool_name === undefined ? {} : { tool_name }),
    ...(tool_arguments === undefined ? {} : { tool_arguments }),
    ...(tool_state === undefined ? {} : { tool_state }),
    ...timestamps(row, "agent message"),
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
    rows.map((row) =>
      row.user_id === owner ? row : { ...row, user_id: owner },
    );

  return {
    ...backup,
    spaces: owned(backup.spaces),
    messages: owned(backup.messages),
    usageEvents: owned(backup.usageEvents),
  };
}

/**
 * The spaces with their own route, and the rows that still have a space.
 *
 * Two spaces that share a route hide one another, and a row whose space is
 * gone never appears on a screen. Both are left out instead of stored.
 */
function withLiveSpaces(
  backup: SeptemberBackup,
  skips: Skips,
): SeptemberBackup {
  const slugs = new Set<string>();
  const spaces = backup.spaces.filter((space) => {
    const slug = spaceSlug(space.title);
    if (slugs.has(slug)) {
      skips.count += 1;
      return false;
    }
    slugs.add(slug);
    return true;
  });

  const spaceIds = new Set(spaces.map((space) => space.id));
  const hasSpace = (spaceId: string | undefined) => {
    if (spaceId === undefined || spaceIds.has(spaceId)) return true;
    skips.count += 1;
    return false;
  };

  return {
    ...backup,
    spaces,
    messages: backup.messages.filter((row) => hasSpace(row.space_id)),
    agentMessages: backup.agentMessages.filter((row) => hasSpace(row.space_id)),
    notes: backup.notes.filter((row) => hasSpace(row.space_id)),
    savedPhrases: backup.savedPhrases.filter((row) => hasSpace(row.space_id)),
  };
}

function backupFrom(value: unknown, skips: Skips): SeptemberBackup {
  const row = objectOf(value, "backup");
  if (row.format !== BACKUP_FORMAT)
    invalid(`The format name must be ${BACKUP_FORMAT}.`);
  if (row.formatVersion !== 1 && row.formatVersion !== BACKUP_FORMAT_VERSION) {
    invalid(
      `Backup format version ${String(row.formatVersion)} is not supported.`,
    );
  }
  const exportedAt = stringOf(row.exportedAt, "export date");
  if (!Number.isFinite(Date.parse(exportedAt)))
    invalid("The export date is invalid.");

  return withLiveSpaces(
    withOneOwner({
      format: BACKUP_FORMAT,
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt,
      source: oneOf(row.source, BACKUP_SOURCES, "source app"),
      appVersion: stringOf(row.appVersion, "app version", {
        empty: false,
        maxBytes: 64,
      }),
      settings: settingsFrom(row.settings, skips),
      spaces: rowsFrom(row.spaces, "spaces", spaceFrom, skips),
      messages: rowsFrom(row.messages, "messages", messageFrom, skips),
      agentMessages:
        row.formatVersion === 1
          ? []
          : rowsFrom(
              row.agentMessages,
              "agent messages",
              agentMessageFrom,
              skips,
            ),
      notes: rowsFrom(row.notes, "notes", noteFrom, skips),
      savedPhrases: rowsFrom(
        row.savedPhrases,
        "saved phrases",
        phraseFrom,
        skips,
      ),
      usageEvents: rowsFrom(
        row.usageEvents,
        "usage events",
        usageEventFrom,
        skips,
      ),
    }),
    skips,
  );
}

/**
 * Reads one user-selected backup before any repository changes.
 *
 * The envelope must name a September backup of a version the app knows. The
 * settings and rows inside it are read one at a time, and `skipped` counts
 * the ones with errors that the import leaves out.
 */
export function parseBackup(source: string): ParsedBackup {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error("This backup is not valid JSON.");
  }
  const skips: Skips = { count: 0 };
  return { backup: backupFrom(value, skips), skipped: skips.count };
}

/** Writes what the app holds as stable, readable JSON. */
export function encodeBackup(backup: SeptemberBackup): string {
  // The text of the identifier orders the rows, never the locale of the
  // machine: two Macs must write one backup the same way.
  const byId = <T extends { id: string }>(rows: T[]) =>
    [...rows].sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    );
  return `${JSON.stringify(
    {
      ...backup,
      spaces: byId(backup.spaces),
      messages: byId(backup.messages),
      agentMessages: byId(backup.agentMessages),
      notes: byId(backup.notes),
      savedPhrases: byId(backup.savedPhrases),
      usageEvents: byId(backup.usageEvents),
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
    agentMessages: backup.agentMessages,
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
    agentMessages: backup.agentMessages.length,
    notes: backup.notes.length,
    savedPhrases: backup.savedPhrases.length,
    usageEvents: backup.usageEvents.length,
  };
}
