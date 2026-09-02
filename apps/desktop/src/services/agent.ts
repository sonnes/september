import {
  askSpaceAgent,
  continueSpaceAgent,
  resolveSpaceAgentProposal,
  type AgentMessage,
  type AgentRuntimeAdapter,
  type AgentRunOptions,
  type AgentSpace,
  type AgentTalkMessage,
  type AgentNote,
} from "@september/core/rules/agent";
import type { SavedPhrase } from "@september/core/rules/phrases";

import { openAgentWriter } from "@/services/ai";
import { call } from "@/services/data";
import { currentUserId } from "@/services/os";

const adapter: AgentRuntimeAdapter = {
  openWriter: openAgentWriter,
  listAgentMessages: spaceId => call<AgentMessage[]>("agent_message_list", { space_id: spaceId }),
  putAgentMessage: message => call<AgentMessage>("agent_message_put", message),
  updateAgentToolState: (id, expected, state, content, updatedAt) =>
    call<AgentMessage>("agent_tool_state", {
      id,
      expected,
      state,
      content,
      updated_at: updatedAt,
    }),
  listSpaces: userId => call<AgentSpace[]>("space_list", { user_id: userId }),
  getSpace: id => call<AgentSpace | null>("space_get", { id }),
  patchSpace: patch => call<AgentSpace>("space_patch", patch),
  listNotes: spaceId => call<AgentNote[]>("note_list", { space_id: spaceId }),
  getNote: id => call<AgentNote | null>("note_get", { id }),
  putNote: note => call<AgentNote>("note_put", note),
  deleteNote: id => call<boolean>("note_delete", { id }),
  listPhrases: spaceId => call<SavedPhrase[]>("phrase_list", { space_id: spaceId ?? null }),
  putPhrase: phrase => call<SavedPhrase>("phrase_put", phrase),
  deletePhrase: id => call<boolean>("phrase_delete", { id }),
  listMessages: spaceId => call<AgentTalkMessage[]>("message_list", { space_id: spaceId }),
  getMessage: id => call<AgentTalkMessage | null>("message_get", { id }),
  putMessage: message => call<AgentTalkMessage>("message_put", message),
  deleteMessage: id => call<boolean>("message_delete", { id }),
};

export const askAgent = (space: AgentSpace, text: string, options?: AgentRunOptions) =>
  askSpaceAgent(adapter, space, text, options);

/** Run a turn whose request is already in the transcript. */
export const continueAgent = (space: AgentSpace, options?: AgentRunOptions) =>
  continueSpaceAgent(adapter, space, options);

export const resolveAgentProposal = (
  space: AgentSpace,
  proposal: AgentMessage,
  approve: boolean,
  options?: AgentRunOptions,
) => resolveSpaceAgentProposal(adapter, space, currentUserId(), proposal, approve, options);

/**
 * Writes one row straight into the transcript.
 *
 * The introduction of a new space is a user turn and a reply that no model
 * loop produced, so it does not go through `askSpaceAgent`. It is still the
 * same transcript, in the same table, read by the same screen.
 */
export const writeAgentMessage = (message: AgentMessage) =>
  adapter.putAgentMessage(message);
