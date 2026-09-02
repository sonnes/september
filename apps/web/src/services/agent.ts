import {
  askSpaceAgent,
  continueSpaceAgent,
  resolveSpaceAgentProposal,
  type AgentMessage,
  type AgentRuntimeAdapter,
  type AgentRunOptions,
  type AgentSpace,
} from '@september/core/rules/agent';

import { openAgentWriter } from '@/services/ai';
import { currentUserId } from '@/services/os';
import { getRepository } from '@/services/repository';

const adapter: AgentRuntimeAdapter = {
  openWriter: openAgentWriter,
  listAgentMessages: async spaceId => (await getRepository()).listAgentMessages(spaceId),
  putAgentMessage: async message => (await getRepository()).putAgentMessage(message),
  updateAgentToolState: async (id, expected, state, content, updatedAt) =>
    (await getRepository()).updateAgentToolState(id, expected, state, content, updatedAt),
  listSpaces: async userId => (await getRepository()).listSpaces(userId),
  getSpace: async id => (await getRepository()).getSpace(id),
  patchSpace: async patch => (await getRepository()).patchSpace(patch),
  listNotes: async spaceId => (await getRepository()).listNotes(spaceId),
  getNote: async id => (await getRepository()).getNote(id),
  putNote: async note => (await getRepository()).putNote(note),
  deleteNote: async id => (await getRepository()).deleteNote(id),
  listPhrases: async spaceId => (await getRepository()).listPhrases(spaceId),
  putPhrase: async phrase => (await getRepository()).putPhrase(phrase),
  deletePhrase: async id => (await getRepository()).deletePhrase(id),
  listMessages: async spaceId => (await getRepository()).listMessages(spaceId),
  getMessage: async id => (await getRepository()).getMessage(id),
  putMessage: async message => (await getRepository()).putMessage(message),
  deleteMessage: async id => (await getRepository()).deleteMessage(id),
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
