/** How long the first turn of a new space may take. */

import type { AgentMessage } from "../records.ts";

/**
 * How long the first turn of a space may run, and how long a reply may be
 * owed before a screen stops saying it is coming.
 */
export const INTRODUCTION_WAIT_MS = 120_000;

/**
 * Whether the agent still owes a reply to the newest turn.
 *
 * An introduction runs on after the screen that asked for it closes, so any
 * screen reads this to know that work is in flight.
 */
export function agentOwesReply(
  rows: readonly AgentMessage[],
  now: number,
): boolean {
  const last = rows.at(-1);
  return (
    last?.role === "user" && now - last.created_at < INTRODUCTION_WAIT_MS
  );
}
