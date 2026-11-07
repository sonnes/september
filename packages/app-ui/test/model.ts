/** The writing service as the tests fake it: streamed OpenAI-compatible replies. */

/** One streamed reply made of `deltas`, which is what the model client reads. */
export function streamedReply(
  deltas: Array<Record<string, unknown>>,
  {
    model = 'test',
    finish = 'stop',
    usage = { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 },
  }: { model?: string; finish?: string; usage?: Record<string, number> } = {},
): Response {
  const events = [
    ...deltas.map(delta => JSON.stringify({ id: '1', model, choices: [{ index: 0, delta, finish_reason: null }] })),
    JSON.stringify({ id: '1', model, choices: [{ index: 0, delta: {}, finish_reason: finish }], usage }),
    '[DONE]',
  ];
  return new Response(events.map(event => `data: ${event}\n\n`).join(''), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });
}

/** One streamed reply that says `content`. */
export const textReply = (content: string, options?: Parameters<typeof streamedReply>[1]): Response =>
  streamedReply([{ role: 'assistant', content }], options);

/** One streamed reply with `answer` as its JSON. */
export const jsonReply = (answer: object): Response => textReply(JSON.stringify(answer));

type Request = { mock: { calls: unknown[][] } };

/** The parsed body of one request to the service. */
export const bodyOf = <T = { messages: { role: string; content: unknown }[] }>(request: Request, call = 0): T =>
  JSON.parse(String((request.mock.calls[call]?.[1] as RequestInit | undefined)?.body)) as T;

/** The signal of one request to the service. */
export const signalOf = (request: Request, call = 0): AbortSignal =>
  (request.mock.calls[call]![1] as RequestInit).signal as AbortSignal;
