import { invoke } from "@tauri-apps/api/core";

import { currentSetup } from "./os";
import {
  buildSpaceContextPrompt,
  spaceDescriptionFrom,
  type SpaceDescription,
} from "./prompts";

/**
 * The writing service.
 *
 * Two commands answer in one shape: `apfel_generate` runs the model on this
 * Mac, and `openrouter_generate` calls the cloud. Both keep their key and
 * their network in Rust.
 */
export interface GenerateMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  messages: GenerateMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?:
    | { type: "json_object" }
    | { type: "json_schema"; name: string; schema: object };
}

/** The service the user chose in setup, or nothing. */
export function writingService(): "apple" | "openrouter" | null {
  const chosen = currentSetup()?.writingService;
  return chosen === "apple" || chosen === "openrouter" ? chosen : null;
}

export const hasWritingService = () => writingService() !== null;

/**
 * What the writing service knows about the user, from setup.
 *
 * Setup collects the speaking style and the personal words, and Writing help
 * keeps them current. Empty when the user wrote neither.
 */
export function userContext(): string {
  const setup = currentSetup();
  return [setup?.speakingStyle, setup?.personalWords]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Text from the chosen service.
 *
 * A user with no writing service still sees the phrases, the starters, the
 * codes, and the rows from past messages. Only the last rows of the stripe
 * need this.
 */
export async function generate(
  request: GenerateRequest,
  signal?: AbortSignal,
): Promise<string> {
  const service = writingService();
  if (!service) throw new Error("no writing service is chosen");

  const command =
    service === "apple" ? "apfel_generate" : "openrouter_generate";
  const answer = await invoke<{ text: string }>(command, { request });
  // The command cannot be stopped once it starts, so a caller that gave up
  // throws instead of using an answer it no longer wants.
  if (signal?.aborted) throw new Error("the request was dropped");

  return answer.text;
}

/** The strings of a `{"items": [...]}` reply, and nothing when it is not one. */
export function itemsFrom(text: string, key: string): string[] {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const value = parsed[key];
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * The name and the note of a space, from its first message.
 *
 * The note reaches the model that writes the stripe and the phrases, so a
 * space that has one gives better words than a space that has none. A user
 * with no writing service keeps the made-up title, and nothing else changes.
 */
export async function describeSpace(
  messageText: string,
): Promise<SpaceDescription | null> {
  if (!hasWritingService()) return null;

  const { system, user } = buildSpaceContextPrompt(messageText);
  const answer = await generate({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  return spaceDescriptionFrom(answer);
}
