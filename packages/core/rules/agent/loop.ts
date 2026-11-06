/**
 * One turn of the Agent of a space.
 *
 * The loop is `@earendil-works/pi-agent-core`. A turn builds an `Agent` from
 * the stored rows, runs it once, and drops it. The transcript lasts.
 */

import type { Agent, AgentTool, StreamFn } from "@earendil-works/pi-agent-core";
import type { Api, AssistantMessage, Model, TSchema } from "@earendil-works/pi-ai";

import {
  modelContextFrom,
  textOfContent,
  type ModelIdentity,
  type ProviderMessage,
} from "../model-client.ts";
import { agentSystemPrompt } from "../prompts/agent.ts";
import type { AgentMessage, AgentToolState, Space } from "../records.ts";
import {
  applyAgentWrite,
  executeAgentRead,
  type AgentSpaceData,
} from "./executor.ts";
import {
  AGENT_TOOLS,
  agentCallNeedsApproval,
  isAgentToolName,
  isAgentWriteTool,
} from "./tools.ts";
import { agentToolSummary } from "./transcript.ts";

/** How many stored rows a turn sends to the model. */
const AGENT_HISTORY_LIMIT = 40;

/**
 * How many writes one turn may apply before it starts to ask.
 *
 * It counts from the last thing the user said, because approving a change
 * starts a new turn on the same conversation. One call names a new space,
 * and the rest are its first phrases.
 */
export const AGENT_MAX_WRITES = 10;

/**
 * The model a turn runs on, and the client that streams it.
 *
 * September owns the transcript and the tools. The application owns the
 * service, the key, and what a call costs.
 */
export interface AgentWriter {
  model: Model<Api>;
  stream: StreamFn;
  /** What one finished answer spent. */
  spent?: (message: AssistantMessage) => void;
}

/** The platform operations of one turn. */
export interface AgentRuntimeAdapter extends AgentSpaceData {
  openWriter(): Promise<AgentWriter>;
  listAgentMessages(spaceId: string): Promise<AgentMessage[]>;
  putAgentMessage(message: AgentMessage): Promise<AgentMessage>;
  updateAgentToolState(
    id: string,
    expected: AgentToolState,
    state: AgentToolState,
    content: string,
    updatedAt: number,
  ): Promise<AgentMessage>;
}

export interface AgentRunOptions {
  now?: () => number;
  id?: () => string;
  signal?: AbortSignal;
  /**
   * The words of the answer being written, each time more of them arrive.
   *
   * Each call gives the whole answer so far. A turn that calls a tool starts
   * the next answer over.
   */
  onPartial?: (text: string) => void;
  /** The first turn of a new space. It names the space and writes its first phrases. */
  intro?: boolean;
}

const defaultId = () => crypto.randomUUID();

function providerHistory(
  rows: readonly AgentMessage[],
  intro?: boolean,
): ProviderMessage[] {
  const messages: ProviderMessage[] = [
    {
      role: "system",
      content: agentSystemPrompt({ intro: intro === true, maxPhrases: AGENT_MAX_WRITES - 1 }),
    },
  ];
  for (const row of rows.slice(-AGENT_HISTORY_LIMIT)) {
    if (row.role === "user") {
      messages.push({ role: "user", content: row.content });
    } else if (row.role === "assistant") {
      messages.push({ role: "assistant", content: row.content });
    } else if (
      row.tool_call_id &&
      row.tool_name &&
      row.tool_arguments &&
      row.tool_state !== "pending"
    ) {
      messages.push({
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: row.tool_call_id,
            type: "function",
            function: { name: row.tool_name, arguments: row.tool_arguments },
          },
        ],
      });
      messages.push({
        role: "tool",
        tool_call_id: row.tool_call_id,
        content: row.content,
      });
    }
  }
  return messages;
}

/** The writes this turn already applied, back to the last thing the user said. */
const writesThisTurn = (rows: readonly AgentMessage[]): number => {
  let count = 0;
  for (let at = rows.length - 1; at >= 0; at -= 1) {
    const row = rows[at];
    if (row.role === "user") break;
    if (
      row.role === "tool" &&
      row.tool_state === "applied" &&
      row.tool_name &&
      isAgentWriteTool(row.tool_name)
    ) {
      count += 1;
    }
  }
  return count;
};

/** The arguments, with null for each missing property that may be null. */
function withNulls(schema: Record<string, unknown>, args: object): object {
  const properties = (schema.properties ?? {}) as Record<
    string,
    { type?: unknown }
  >;
  const filled: Record<string, unknown> = { ...args };
  for (const [name, property] of Object.entries(properties)) {
    const nullable =
      Array.isArray(property.type) && property.type.includes("null");
    if (nullable && !(name in filled)) filled[name] = null;
  }
  return filled;
}

function agentTools(
  adapter: AgentRuntimeAdapter,
  space: Space,
  now: () => number,
): AgentTool[] {
  return AGENT_TOOLS.map((definition) => {
    const name = definition.function.name;
    return {
      name,
      label: name,
      description: definition.function.description,
      parameters: definition.function.parameters as unknown as TSchema,
      executionMode: "sequential",
      // A model can answer `[]` for a schema with no properties, and can leave
      // out an argument that may be null. Apple Intelligence does both.
      prepareArguments: (args: unknown) =>
        withNulls(
          definition.function.parameters,
          args && typeof args === "object" && !Array.isArray(args) ? args : {},
        ),
      execute: async (toolCallId: string, params: unknown) => {
        const raw = JSON.stringify(params ?? {});
        const text = isAgentWriteTool(name)
          ? await applyAgentWrite(adapter, space, space.user_id, name, raw, toolCallId, now)
          : await executeAgentRead(adapter, space, name, raw);
        return { content: [{ type: "text" as const, text }] };
      },
    } as AgentTool;
  });
}

const nextTranscriptTime = (rows: readonly AgentMessage[], now: () => number) =>
  Math.max(now(), (rows[rows.length - 1]?.created_at ?? -1) + 1);

/**
 * One turn.
 *
 * Three hooks join the loop to the transcript: `subscribe` stores every
 * message that lands, `beforeToolCall` decides whether a tool may run, and
 * `shouldStopAfterTurn` ends the turn when a change waits for a press.
 *
 * `opening` is true for a question that is not stored yet. Its writes count
 * from zero.
 */
async function runTurn(
  adapter: AgentRuntimeAdapter,
  space: Space,
  options: AgentRunOptions,
  start: (agent: Agent) => Promise<void>,
  opening = false,
): Promise<void> {
  const now = options.now ?? Date.now;
  const id = options.id ?? defaultId;
  let rows = await adapter.listAgentMessages(space.id);
  if (rows.some((row) => row.tool_state === "pending")) return;

  const writer = await adapter.openWriter();
  const identity: ModelIdentity = {
    api: writer.model.api,
    provider: writer.model.provider,
    model: writer.model.id,
  };
  const context = modelContextFrom(providerHistory(rows, options.intro), identity);

  let applied = opening ? 0 : writesThisTurn(rows);
  let partial = "";
  let held = false;
  const blocked = new Set<string>();
  const calls = new Map<string, { name: string; arguments: unknown }>();

  const put = async (row: Omit<AgentMessage, "created_at" | "updated_at">) => {
    const at = nextTranscriptTime(rows, now);
    const stored = await adapter.putAgentMessage({
      ...row,
      created_at: at,
      updated_at: at,
    });
    rows = [...rows, stored];
  };

  // The loop loads with the first turn, so a user who never opens Agent never downloads it.
  const { Agent } = await import("@earendil-works/pi-agent-core");
  const agent = new Agent({
    initialState: {
      systemPrompt: context.systemPrompt ?? "",
      model: writer.model,
      messages: context.messages as never,
      tools: agentTools(adapter, space, now),
    },
    streamFn: writer.stream,
    toolExecution: "sequential",

    // A read and a visible change run. A delete, a call that is not valid,
    // and a write past the budget wait for a press.
    beforeToolCall: async ({ toolCall, args }) => {
      if (!isAgentToolName(toolCall.name) || !isAgentWriteTool(toolCall.name)) {
        return undefined;
      }
      const name = toolCall.name;
      const raw = JSON.stringify(args ?? {});
      if (!agentCallNeedsApproval(name, raw) && applied < AGENT_MAX_WRITES) {
        applied += 1;
        return undefined;
      }
      await put({
        id: id(),
        space_id: space.id,
        role: "tool",
        content: agentToolSummary(name, raw),
        tool_call_id: toolCall.id,
        tool_name: name,
        tool_arguments: raw,
        tool_state: "pending",
      });
      blocked.add(toolCall.id);
      held = true;
      return { block: true, reason: "This change is waiting for approval." };
    },

    shouldStopAfterTurn: () => held,
  });

  agent.subscribe(async (event) => {
    if (event.type === "message_update") {
      const inner = event.assistantMessageEvent;
      if (inner.type === "text_delta" && options.onPartial) {
        partial += inner.delta;
        options.onPartial(partial);
      }
      return;
    }
    if (event.type !== "message_end") return;
    const message = event.message;

    if (message.role === "user") {
      await put({
        id: id(),
        space_id: space.id,
        role: "user",
        content: textOfContent(message.content) || String(message.content ?? ""),
      });
      return;
    }

    if (message.role === "assistant") {
      partial = "";
      writer.spent?.(message);
      for (const part of message.content) {
        if (part.type === "toolCall") {
          calls.set(part.id, { name: part.name, arguments: part.arguments });
        }
      }
      const said = textOfContent(message.content).trim();
      if (said) {
        await put({
          id: id(),
          space_id: space.id,
          role: "assistant",
          content: said,
        });
      }
      return;
    }

    if (message.role !== "toolResult") return;
    // A blocked write already has its row. The refusal the loop wrote for the model is not a record.
    if (blocked.has(message.toolCallId)) return;
    if (!isAgentToolName(message.toolName)) return;
    const call = calls.get(message.toolCallId);
    await put({
      id: id(),
      space_id: space.id,
      role: "tool",
      content: textOfContent(message.content),
      tool_call_id: message.toolCallId,
      tool_name: message.toolName,
      tool_arguments: JSON.stringify(call?.arguments ?? {}),
      tool_state: message.isError ? "failed" : "applied",
    });
  });

  const stop = () => agent.abort();
  options.signal?.addEventListener("abort", stop);
  try {
    await start(agent);
  } finally {
    options.signal?.removeEventListener("abort", stop);
  }

  // The client reports a failure in its state. A screen needs a throw.
  const failure = agent.state.errorMessage;
  if (failure) throw new Error(failure);
}

/** Stores a user request and runs until the model answers or a change waits. */
export async function askSpaceAgent(
  adapter: AgentRuntimeAdapter,
  space: Space,
  text: string,
  options: AgentRunOptions = {},
): Promise<void> {
  await runTurn(adapter, space, options, (agent) => agent.prompt(text.trim()), true);
}

const continueSpaceAgent = (
  adapter: AgentRuntimeAdapter,
  space: Space,
  options: AgentRunOptions,
) => runTurn(adapter, space, options, (agent) => agent.continue());

/** Resolves a waiting change once, then lets the model read the result. */
export async function resolveSpaceAgentProposal(
  adapter: AgentRuntimeAdapter,
  space: Space,
  userId: string,
  proposal: AgentMessage,
  approve: boolean,
  options: AgentRunOptions = {},
): Promise<void> {
  const now = options.now ?? Date.now;
  if (!approve) {
    await adapter.updateAgentToolState(
      proposal.id,
      "pending",
      "rejected",
      JSON.stringify({ ok: false, rejected: true }),
      now(),
    );
    await continueSpaceAgent(adapter, space, options);
    return;
  }
  try {
    if (
      proposal.space_id !== space.id ||
      proposal.role !== "tool" ||
      proposal.tool_state !== "pending" ||
      !proposal.tool_name ||
      proposal.tool_arguments === undefined
    ) {
      throw new Error("That is not a pending change for this space.");
    }
    const result = await applyAgentWrite(
      adapter,
      space,
      userId,
      proposal.tool_name,
      proposal.tool_arguments,
      proposal.id,
      now,
    );
    await adapter.updateAgentToolState(proposal.id, "pending", "applied", result, now());
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : String(reason);
    await adapter.updateAgentToolState(
      proposal.id,
      "pending",
      "failed",
      JSON.stringify({ ok: false, error: message }),
      now(),
    );
  }
  await continueSpaceAgent(adapter, space, options);
}
