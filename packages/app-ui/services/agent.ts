import { platform } from "@platform/adapter";
import {
  askSpaceAgent,
  resolveSpaceAgentProposal,
  type AgentRunOptions,
} from "@september/core/rules/agent/loop";
import type { AgentMessage, Space } from "@september/core/rules/records";

import { openAgentWriter } from "./ai";
import { currentUserId } from "./settings";

const adapter = () => ({ ...platform.store, openWriter: openAgentWriter });

export const askAgent = (space: Space, text: string, options?: AgentRunOptions) =>
  askSpaceAgent(adapter(), space, text, options);

export const resolveAgentProposal = (
  space: Space,
  proposal: AgentMessage,
  approve: boolean,
  options?: AgentRunOptions,
) => resolveSpaceAgentProposal(adapter(), space, currentUserId(), proposal, approve, options);
