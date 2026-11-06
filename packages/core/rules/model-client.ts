/**
 * The bridge between a stored conversation and a typed model client.
 *
 * The shapes are declared here, so this package depends on no client. A
 * client whose fields drift from these fails an application build.
 */

/** One message of a conversation, in the OpenAI chat shape. */
export type ProviderMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; content: string; tool_call_id: string };

export interface ModelTextContent {
  type: "text";
  text: string;
}

export interface ModelToolCallContent {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ModelUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}

export interface ModelUserMessage {
  role: "user";
  content: string;
  timestamp: number;
}

/** Every way a model can stop, in the words a typed client uses. */
export type ModelStopReason =
  | "stop"
  | "length"
  | "toolUse"
  | "error"
  | "aborted";

/**
 * The client names its own services and its own APIs, so the identity of a
 * row is whatever those names are. September carries them through rather
 * than keeping a second list that has to stay in step.
 */
export interface ModelAssistantMessage<
  TApi extends string = string,
  TProvider extends string = string,
> {
  role: "assistant";
  content: (ModelTextContent | ModelToolCallContent)[];
  api: TApi;
  provider: TProvider;
  model: string;
  usage: ModelUsage;
  stopReason: ModelStopReason;
  timestamp: number;
}

export interface ModelToolResultMessage {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: ModelTextContent[];
  isError: boolean;
  timestamp: number;
}

export type ModelMessage<
  TApi extends string = string,
  TProvider extends string = string,
> =
  | ModelUserMessage
  | ModelAssistantMessage<TApi, TProvider>
  | ModelToolResultMessage;

/** Which client, which service, and which model a rebuilt row belongs to. */
export interface ModelIdentity<
  TApi extends string = string,
  TProvider extends string = string,
> {
  api: TApi;
  provider: TProvider;
  model: string;
}

export interface ModelContext<
  TApi extends string = string,
  TProvider extends string = string,
> {
  systemPrompt?: string;
  messages: ModelMessage<TApi, TProvider>[];
}

/** A rebuilt row spent nothing. Only the answer of a real call carries usage. */
const emptyModelUsage = (): ModelUsage => ({
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
});

/** The arguments of a stored call. A stored call was validated before it was written. */
function storedArguments(raw: string): Record<string, unknown> {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A stored tool call has arguments that are not an object.");
  }
  return value as Record<string, unknown>;
}

/**
 * One history, in the shape a typed client takes.
 *
 * It carries no tools. A caller that wants the model to act adds them.
 */
export function modelContextFrom<TApi extends string, TProvider extends string>(
  history: readonly ProviderMessage[],
  identity: ModelIdentity<TApi, TProvider>,
  options: { now?: () => number } = {},
): ModelContext<TApi, TProvider> {
  const at = (options.now ?? Date.now)();
  const messages: ModelMessage<TApi, TProvider>[] = [];
  // A tool result must name its tool, and only the call before it knows.
  const names = new Map<string, string>();
  let systemPrompt: string | undefined;

  for (const row of history) {
    if (row.role === "system") {
      systemPrompt = row.content;
      continue;
    }
    if (row.role === "user") {
      messages.push({ role: "user", content: row.content, timestamp: at });
      continue;
    }
    if (row.role === "tool") {
      messages.push({
        role: "toolResult",
        toolCallId: row.tool_call_id,
        toolName: names.get(row.tool_call_id) ?? "",
        content: [{ type: "text", text: row.content }],
        isError: false,
        timestamp: at,
      });
      continue;
    }

    const content: (ModelTextContent | ModelToolCallContent)[] = [];
    if (row.content) content.push({ type: "text", text: row.content });
    for (const call of row.tool_calls ?? []) {
      names.set(call.id, call.function.name);
      content.push({
        type: "toolCall",
        id: call.id,
        name: call.function.name,
        arguments: storedArguments(call.function.arguments),
      });
    }
    messages.push({
      role: "assistant",
      content,
      api: identity.api,
      provider: identity.provider,
      model: identity.model,
      usage: emptyModelUsage(),
      stopReason: row.tool_calls?.length ? "toolUse" : "stop",
      timestamp: at,
    });
  }

  return {
    ...(systemPrompt === undefined ? {} : { systemPrompt }),
    messages,
  };
}

/** The words in the content of one model message. Other parts are left out. */
export const textOfContent = (content: unknown): string =>
  (Array.isArray(content) ? content : [])
    .filter(
      (part): part is ModelTextContent =>
        !!part &&
        typeof part === "object" &&
        (part as ModelTextContent).type === "text" &&
        typeof (part as ModelTextContent).text === "string",
    )
    .map((part) => part.text)
    .join("");

/**
 * The words of one finished message from a typed client.
 *
 * A typed client answers a failure with a message that holds the reason.
 * This throws that reason.
 */
export function modelTextFrom(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The writing service returned an invalid reply.");
  }
  const message = value as Record<string, unknown>;
  if (message.stopReason === "aborted") {
    throw new Error("The request was stopped.");
  }
  if (message.stopReason === "error") {
    const detail =
      typeof message.errorMessage === "string" && message.errorMessage.trim()
        ? message.errorMessage.trim()
        : "The writing service did not answer.";
    throw new Error(detail);
  }
  return textOfContent(message.content);
}
