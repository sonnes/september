/** The rows that both apps store and a backup carries. */

import type { AgentToolName } from "./agent/tools.ts";

/** A space opens in one of three modes, and the address holds which one. */
export type SpaceMode = "talk" | "notes" | "agent";

export const SPACE_MODES: readonly SpaceMode[] = ["talk", "notes", "agent"];

export interface Space {
  id: string;
  user_id: string;
  title?: string;
  context?: string;
  /** How many messages the space held when a model last wrote its phrases. */
  phrases_synced_count?: number;
  created_at: number;
  updated_at: number;
}

/** The fields of a space that one writer changes. A field left out keeps its value. */
export interface SpacePatch {
  id: string;
  title?: string;
  context?: string;
  phrases_synced_count?: number;
  reset_phrases_synced_count?: boolean;
  updated_at: number;
}

/** One message of Talk. */
export interface Message {
  id: string;
  space_id?: string;
  user_id: string;
  text: string;
  type: string;
  created_at: number;
}

export interface Note {
  id: string;
  space_id?: string;
  name?: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export type PhraseKind = "phrase" | "starter";

export const PHRASE_KINDS: readonly PhraseKind[] = ["phrase", "starter"];

export interface SavedPhrase {
  id: string;
  space_id: string;
  text: string;
  kind: PhraseKind;
  code?: string;
  pinned: boolean;
  created_at: number;
  updated_at: number;
}

export const AGENT_ROLES = ["user", "assistant", "tool"] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

export const AGENT_TOOL_STATES = ["pending", "applied", "rejected", "failed"] as const;
export type AgentToolState = (typeof AGENT_TOOL_STATES)[number];

/** One row of the Agent transcript of a space. */
export interface AgentMessage {
  id: string;
  space_id: string;
  role: AgentRole;
  content: string;
  tool_call_id?: string;
  tool_name?: AgentToolName;
  tool_arguments?: string;
  tool_state?: AgentToolState;
  created_at: number;
  updated_at: number;
}
