import {
  askSpaceAgent,
  resolveSpaceAgentProposal,
  type AgentRuntimeAdapter,
  type AgentRunOptions,
} from "@september/core/rules/agent/loop";
import type {
  AgentMessage,
  Message,
  Note,
  SavedPhrase,
  Space,
} from "@september/core/rules/records";

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
  listSpaces: userId => call<Space[]>("space_list", { user_id: userId }),
  getSpace: id => call<Space | null>("space_get", { id }),
  patchSpace: patch => call<Space>("space_patch", patch),
  listNotes: spaceId => call<Note[]>("note_list", { space_id: spaceId }),
  getNote: id => call<Note | null>("note_get", { id }),
  putNote: note => call<Note>("note_put", note),
  deleteNote: id => call<boolean>("note_delete", { id }),
  listPhrases: spaceId => call<SavedPhrase[]>("phrase_list", { space_id: spaceId ?? null }),
  putPhrase: phrase => call<SavedPhrase>("phrase_put", phrase),
  deletePhrase: id => call<boolean>("phrase_delete", { id }),
  listMessages: spaceId => call<Message[]>("message_list", { space_id: spaceId }),
  getMessage: id => call<Message | null>("message_get", { id }),
  putMessage: message => call<Message>("message_put", message),
  deleteMessage: id => call<boolean>("message_delete", { id }),
};

export const askAgent = (space: Space, text: string, options?: AgentRunOptions) =>
  askSpaceAgent(adapter, space, text, options);

export const resolveAgentProposal = (
  space: Space,
  proposal: AgentMessage,
  approve: boolean,
  options?: AgentRunOptions,
) => resolveSpaceAgentProposal(adapter, space, currentUserId(), proposal, approve, options);
