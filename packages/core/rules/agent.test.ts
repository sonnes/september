import { describe, expect, it } from "vitest";
import {
  createFauxCore,
  fauxAssistantMessage,
  fauxText,
  fauxToolCall,
  type AssistantMessage,
} from "@earendil-works/pi-ai";

import {
  AGENT_OPENERS,
  AGENT_TOOL_DEFINITIONS,
  agentSaidRow,
  agentProposalIsDelete,
  agentProposalIsUnpin,
  agentProposalLines,
  agentCallNeedsApproval,
  isAgentWriteTool,
  agentToolOutcome,
  agentToolResult,
  agentToolSummary,
  AGENT_MAX_WRITES,
  askSpaceAgent,
  continueSpaceAgent,
  executeAgentTool,
  agentOwesReply,
  groupAgentTurns,
  INTRODUCTION_WAIT_MS,
  modelContextFrom,
  modelTextFrom,
  parseAgentToolArguments,
  type AgentMessage,
  type AgentToolName,
  type AgentToolState,
} from "./agent.ts";
import { composerAction, rememberSpaceMode, spaceModeFrom } from "./spaces.ts";

/** What a model would answer, in order, and the writer that hands it over. */
function scripted(...answers: AssistantMessage[]) {
  const faux = createFauxCore({ tokensPerSecond: 0 });
  /** Each request as the model saw it, in the order they were made. */
  const asked: Array<{ systemPrompt?: string; tools?: Array<{ name: string }> }> =
    [];
  faux.setResponses(
    answers.map((answer) => (context) => {
      asked.push(context);
      return answer;
    }),
  );
  return {
    faux,
    asked,
    openWriter: async () => ({
      model: faux.getModel(),
      stream: faux.streamSimple,
    }),
  };
}

const says = (text: string) => fauxAssistantMessage(fauxText(text));

const uses = (
  name: string,
  args: Record<string, unknown>,
  id = "call-1",
): AssistantMessage =>
  fauxAssistantMessage([fauxToolCall(name, args, { id })], {
    stopReason: "toolUse",
  });

describe("space agent", () => {
  it("is a remembered, non-speaking composer mode", () => {
    expect(composerAction("agent")).toEqual({
      label: "Ask",
      field: "Message to the agent",
      placeholder: "Ask about this space or request a change…",
      speaks: false,
    });
    expect(spaceModeFrom({ general: "agent" }, "general")).toBe("agent");
    expect(rememberSpaceMode({}, "general", "agent")).toEqual({
      general: "agent",
    });
  });

  it("keeps space selection out of every model-visible tool schema", () => {
    expect(AGENT_TOOL_DEFINITIONS.map((tool) => tool.function.name)).toEqual([
      "inspect_space",
      "read_note",
      "read_talk_messages",
      "configure_space",
      "change_note",
      "change_phrase",
      "change_talk_message",
    ]);
    expect(JSON.stringify(AGENT_TOOL_DEFINITIONS)).not.toContain("space_id");
  });

  it("separates the tools that change the space from the tools that read it", () => {
    expect(isAgentWriteTool("inspect_space")).toBe(false);
    expect(isAgentWriteTool("read_note")).toBe(false);
    expect(isAgentWriteTool("read_talk_messages")).toBe(false);
    expect(isAgentWriteTool("configure_space")).toBe(true);
    expect(isAgentWriteTool("change_note")).toBe(true);
    expect(isAgentWriteTool("change_phrase")).toBe(true);
    expect(isAgentWriteTool("change_talk_message")).toBe(true);
  });

  it("asks before a delete, and before nothing else", () => {
    const call = (name: AgentToolName, args: Record<string, unknown>) =>
      agentCallNeedsApproval(name, JSON.stringify(args));

    const phrase = {
      phrase_id: "phrase-1",
      text: null,
      kind: null,
      pinned: null,
      expected_updated_at: null,
    };
    expect(call("change_phrase", { ...phrase, operation: "delete" })).toBe(true);
    expect(call("change_phrase", { ...phrase, operation: "unpin" })).toBe(false);
    expect(
      call("change_phrase", { ...phrase, phrase_id: null, operation: "create", text: "Thank you" }),
    ).toBe(false);
    expect(
      call("change_note", {
        operation: "delete",
        note_id: "note-1",
        name: null,
        text: null,
        expected_updated_at: null,
      }),
    ).toBe(true);
    expect(
      call("change_talk_message", {
        operation: "delete",
        message_id: "message-1",
        text: null,
        expected_text: null,
        expected_created_at: null,
      }),
    ).toBe(true);

    // A tool with no operation at all can only add or change, never remove.
    expect(
      call("configure_space", {
        title: "Sister",
        context: null,
        expected_updated_at: 1,
      }),
    ).toBe(false);
    // Reading has never asked and still does not.
    expect(call("inspect_space", {})).toBe(false);
    // Arguments the model mangled are not a delete. They fail on the way in,
    // where the model can read the reason and try again, rather than waiting
    // for a press that cannot help them.
    expect(agentCallNeedsApproval("change_phrase", "{ not json")).toBe(false);
  });

  it("validates and normalizes bounded tool arguments", () => {
    expect(
      parseAgentToolArguments(
        "read_note",
        '{"note_id":"note-1","offset":4,"limit":99}',
      ),
    ).toEqual({ note_id: "note-1", offset: 4, limit: 99 });
    expect(
      parseAgentToolArguments(
        "change_phrase",
        JSON.stringify({
          operation: "create",
          text: "  Please give me a minute.  ",
          kind: "phrase",
          pinned: true,
        }),
      ),
    ).toEqual({
      operation: "create",
      text: "Please give me a minute.",
      kind: "phrase",
      pinned: true,
    });
  });

  it("rejects malformed, oversized, and cross-space arguments", () => {
    expect(() =>
      parseAgentToolArguments("inspect_space", '{"space_id":"other"}'),
    ).toThrow("not allowed");
    expect(() =>
      parseAgentToolArguments(
        "change_note",
        '{"operation":"append","note_id":"note-1"}',
      ),
    ).toThrow("text");
    expect(() =>
      parseAgentToolArguments("read_talk_messages", '{"limit":101}'),
    ).toThrow("limit");
    expect(() =>
      parseAgentToolArguments(
        "change_talk_message",
        JSON.stringify({
          operation: "create",
          text: "x".repeat(10_001),
        }),
      ),
    ).toThrow("text");
  });

  it("lifts the system prompt out of the history and parses stored tool arguments", () => {
    const context = modelContextFrom(
      [
        { role: "system", content: "Be brief." },
        { role: "user", content: "Rename this space." },
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call-1",
              type: "function",
              function: {
                name: "configure_space",
                arguments: '{"title":"Clinic"}',
              },
            },
          ],
        },
        { role: "tool", tool_call_id: "call-1", content: '{"ok":true}' },
        { role: "assistant", content: "I called it Clinic." },
      ],
      { api: "openai-completions", provider: "openrouter", model: "a/b" },
      { now: () => 7 },
    );

    // A history is words and calls, and nothing else. The loop hands the
    // model its tools, and a plain generation is offered none.
    expect(context.systemPrompt).toBe("Be brief.");
    expect(context.messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "toolResult",
      "assistant",
    ]);
    expect(context.messages[1]).toEqual({
      role: "assistant",
      content: [
        {
          type: "toolCall",
          id: "call-1",
          name: "configure_space",
          arguments: { title: "Clinic" },
        },
      ],
      api: "openai-completions",
      provider: "openrouter",
      model: "a/b",
      usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: "toolUse",
      timestamp: 7,
    });
    // A tool result must name its tool, and only the call before it knows the name.
    expect(context.messages[2]).toEqual({
      role: "toolResult",
      toolCallId: "call-1",
      toolName: "configure_space",
      content: [{ type: "text", text: '{"ok":true}' }],
      isError: false,
      timestamp: 7,
    });
  });

  it("joins the text of a typed answer, and raises a failed one", () => {
    expect(
      modelTextFrom({
        role: "assistant",
        content: [
          { type: "thinking", thinking: "hidden" },
          { type: "text", text: "One. " },
          { type: "text", text: "Two." },
        ],
        model: "m",
        stopReason: "stop",
        usage: {
          input: 2,
          output: 3,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 5,
          cost: {
            input: 0.5,
            output: 0.25,
            cacheRead: 0,
            cacheWrite: 0,
            total: 0.75,
          },
        },
      }),
    ).toBe("One. Two.");
    expect(() =>
      modelTextFrom({
        role: "assistant",
        content: [],
        model: "m",
        stopReason: "error",
        errorMessage: "No answer came back.",
        usage: {
          input: 2,
          output: 3,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 5,
          cost: {
            input: 0.5,
            output: 0.25,
            cacheRead: 0,
            cacheWrite: 0,
            total: 0.75,
          },
        },
      }),
    ).toThrow("No answer came back.");
  });

  it("hands the words of a turn on while they are still arriving", async () => {
    const transcript: Array<Record<string, unknown>> = [];
    const seen: string[] = [];
    const writer = scripted(says("One. Two."));
    const adapter = {
      ...writer,
      listAgentMessages: async () => transcript,
      putAgentMessage: async (row: Record<string, unknown>) => {
        transcript.push(row);
        return row;
      },
    };
    const space = {
      id: "space-1",
      user_id: "user-1",
      created_at: 1,
      updated_at: 1,
    };

    await askSpaceAgent(adapter as never, space, "Say two things", {
      now: () => 10,
      id: (() => {
        let at = 0;
        return () => `row-${++at}`;
      })(),
      onPartial: (text) => seen.push(text),
    });

    // Each call gives the answer so far, so a screen sets it and never joins.
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.at(-1)).toBe("One. Two.");
    expect(seen).toEqual([...seen].sort((one, other) => one.length - other.length));
    // The user's own words are stored too, by the same hook.
    expect(transcript.map((row) => row.role)).toEqual(["user", "assistant"]);
    expect(transcript.at(-1)).toMatchObject({
      role: "assistant",
      content: "One. Two.",
    });
  });

  it("offers the model every tool of the open space, and no way to leave it", async () => {
    const transcript: Array<Record<string, unknown>> = [
      {
        id: "asked",
        space_id: "space-1",
        role: "user",
        content: "What can you do?",
        created_at: 1,
        updated_at: 1,
      },
    ];
    const writer = scripted(says("Quite a lot."));
    const adapter = {
      ...writer,
      listAgentMessages: async () => transcript,
      putAgentMessage: async (row: Record<string, unknown>) => {
        transcript.push(row);
        return row;
      },
    };

    await continueSpaceAgent(
      adapter as never,
      { id: "space-1", user_id: "user-1", created_at: 1, updated_at: 1 },
      { now: () => 10, id: () => "row-1" },
    );

    expect(writer.asked[0]?.tools?.map((tool) => tool.name)).toEqual(
      AGENT_TOOL_DEFINITIONS.map((tool) => tool.function.name),
    );
    // The open space is bound by the loop, never chosen by the model.
    expect(JSON.stringify(writer.asked[0]?.tools)).not.toContain("space_id");
  });

  it("reads for as long as it needs to, with no count that cuts it short", async () => {
    // A turn continues from something the user said.
    const transcript: Array<Record<string, unknown>> = [
      {
        id: "asked",
        space_id: "space-1",
        role: "user",
        content: "What is in here?",
        created_at: 1,
        updated_at: 1,
      },
    ];
    const space = {
      id: "space-1",
      user_id: "user-1",
      title: "General",
      created_at: 1,
      updated_at: 1,
    };
    const reads = 12;
    const writer = scripted(
      ...Array.from({ length: reads }, (_, at) =>
        uses("inspect_space", {}, `call-${at + 1}`),
      ),
      says("Read it all."),
    );
    const adapter = {
      ...writer,
      listAgentMessages: async () => transcript,
      putAgentMessage: async (row: Record<string, unknown>) => {
        transcript.push(row);
        return row;
      },
      getSpace: async () => space,
      listNotes: async () => [],
      listPhrases: async () => [],
      listMessages: async () => [],
    };

    await continueSpaceAgent(adapter as never, space, {
      now: () => 10,
      id: (() => {
        let at = 0;
        return () => `row-${++at}`;
      })(),
    });

    // A read costs the user nothing to approve, so nothing stops the turn
    // except the model running out of things to look at.
    expect(writer.faux.state.callCount).toBe(reads + 1);
    expect(transcript.filter((row) => row.role === "tool")).toHaveLength(reads);
    expect(
      transcript.every(
        (row) => row.role !== "tool" || row.tool_state === "applied",
      ),
    ).toBe(true);
    expect(transcript.at(-1)).toMatchObject({
      role: "assistant",
      content: "Read it all.",
    });
  });

  it("applies a write as it makes it, and generates the phrase code itself", async () => {
    const transcript: Array<Record<string, unknown>> = [];
    const phrases: Array<Record<string, unknown>> = [];
    const writer = scripted(
      uses("change_phrase", {
        operation: "create",
        phrase_id: null,
        text: "Thank you",
        kind: "phrase",
        pinned: true,
        expected_updated_at: null,
      }),
      says("The phrase is ready."),
    );
    const adapter = {
      ...writer,
      listAgentMessages: async () => transcript,
      putAgentMessage: async (row: Record<string, unknown>) => {
        transcript.push(row);
        return row;
      },
      listPhrases: async () => phrases,
      putPhrase: async (row: Record<string, unknown>) => {
        phrases.push(row);
        return row;
      },
    };
    const space = {
      id: "space-1",
      user_id: "user-1",
      title: "General",
      created_at: 1,
      updated_at: 1,
    };

    await askSpaceAgent(
      adapter as never,
      space,
      "Add a pinned thank-you phrase",
      {
        now: () => 10,
        id: (() => {
          let at = 0;
          return () => `row-${++at}`;
        })(),
      },
    );

    // Nothing waited. A phrase the user did not want is one press to remove,
    // and a press to approve every phrase is a press they cannot spare.
    expect(transcript.some((row) => row.tool_state === "pending")).toBe(false);
    expect(phrases).toMatchObject([
      { space_id: "space-1", text: "Thank you", code: "ty" },
    ]);
  });

  it("gives a new question the whole budget, however busy the last turn was", async () => {
    // A turn that spent every write it had, and answered.
    const transcript: Array<Record<string, unknown>> = [
      {
        id: "asked",
        space_id: "space-1",
        role: "user",
        content: "Write me some phrases",
        created_at: 1,
        updated_at: 1,
      },
      ...Array.from({ length: AGENT_MAX_WRITES }, (_, at) => ({
        id: `wrote-${at}`,
        space_id: "space-1",
        role: "tool",
        content: JSON.stringify({ ok: true }),
        tool_call_id: `old-${at}`,
        tool_name: "change_phrase",
        tool_arguments: JSON.stringify({
          operation: "create",
          phrase_id: null,
          text: `Phrase ${at}`,
          kind: "phrase",
          pinned: true,
          expected_updated_at: null,
        }),
        tool_state: "applied",
        created_at: 2 + at,
        updated_at: 2 + at,
      })),
      {
        id: "said",
        space_id: "space-1",
        role: "assistant",
        content: "Wrote ten phrases.",
        created_at: 20,
        updated_at: 20,
      },
    ];
    const phrases: Array<Record<string, unknown>> = [];
    const writer = scripted(
      uses("change_phrase", {
        operation: "create",
        phrase_id: null,
        text: "One more",
        kind: "phrase",
        pinned: true,
        expected_updated_at: null,
      }),
      says("Added it."),
    );
    const adapter = {
      ...writer,
      listAgentMessages: async () => transcript,
      putAgentMessage: async (row: Record<string, unknown>) => {
        transcript.push(row);
        return row;
      },
      listPhrases: async () => phrases,
      putPhrase: async (row: Record<string, unknown>) => {
        phrases.push(row);
        return row;
      },
    };

    let at = 0;
    await askSpaceAgent(
      adapter as never,
      { id: "space-1", user_id: "user-1", created_at: 1, updated_at: 1 },
      "One more, please",
      { now: () => 30, id: () => `row-${++at}` },
    );

    // The budget bounds one turn. Asking again is the user saying carry on,
    // and a question that arrived with nothing left to spend would ask for a
    // press on the first phrase it wrote.
    expect(phrases.map((row) => row.text)).toEqual(["One more"]);
    expect(transcript.some((row) => row.tool_state === "pending")).toBe(false);
  });

  it("holds a delete until the user presses, because it cannot be undone", async () => {
    const transcript: Array<Record<string, unknown>> = [
      {
        id: "asked",
        space_id: "space-1",
        role: "user",
        content: "Remove the thank-you phrase",
        created_at: 1,
        updated_at: 1,
      },
    ];
    const phrases: Array<Record<string, unknown>> = [
      {
        id: "phrase-1",
        space_id: "space-1",
        text: "Thank you",
        kind: "phrase",
        pinned: true,
        created_at: 1,
        updated_at: 1,
      },
    ];
    const removed: string[] = [];
    const writer = scripted(
      uses("change_phrase", {
        operation: "delete",
        phrase_id: "phrase-1",
        text: null,
        kind: null,
        pinned: null,
        expected_updated_at: 1,
      }),
    );
    const adapter = {
      ...writer,
      listAgentMessages: async () => transcript,
      putAgentMessage: async (row: Record<string, unknown>) => {
        transcript.push(row);
        return row;
      },
      listPhrases: async () => phrases,
      deletePhrase: async (id: string) => {
        removed.push(id);
        return true;
      },
    };
    const space = {
      id: "space-1",
      user_id: "user-1",
      created_at: 1,
      updated_at: 1,
    };

    await continueSpaceAgent(adapter as never, space, {
      now: () => 10,
      id: () => "row-1",
    });

    expect(removed).toEqual([]);
    const proposal = transcript.find((row) => row.tool_state === "pending")!;
    expect(proposal).toMatchObject({
      tool_name: "change_phrase",
      content: "Delete phrase",
    });

    await executeAgentTool(
      adapter as never,
      space,
      "user-1",
      proposal as never,
      { now: () => 20 },
    );
    expect(removed).toEqual(["phrase-1"]);
  });

  it("cannot change an entity from another space", async () => {
    const proposal = {
      id: "proposal-1",
      space_id: "space-1",
      role: "tool",
      content: "Edit phrase",
      tool_call_id: "call-1",
      tool_name: "change_phrase",
      tool_arguments: JSON.stringify({
        operation: "edit",
        phrase_id: "phrase-2",
        text: "Changed",
        expected_updated_at: 4,
      }),
      tool_state: "pending",
      created_at: 5,
      updated_at: 5,
    } as const;
    const adapter = {
      listPhrases: async () => [
        {
          id: "phrase-2",
          space_id: "space-2",
          text: "Private",
          kind: "phrase",
          pinned: true,
          created_at: 3,
          updated_at: 4,
        },
      ],
    };

    await expect(
      executeAgentTool(
        adapter as never,
        { id: "space-1", user_id: "user-1", created_at: 1, updated_at: 1 },
        "user-1",
        proposal,
      ),
    ).rejects.toThrow("not in this space");
  });

  it("edits a Talk transcript without speaking and marks generated phrases stale", async () => {
    const written: Array<Record<string, unknown>> = [];
    const patches: Array<Record<string, unknown>> = [];
    const adapter = {
      getMessage: async () => ({
        id: "message-1",
        space_id: "space-1",
        user_id: "user-1",
        text: "Old words",
        type: "user",
        created_at: 7,
      }),
      putMessage: async (row: Record<string, unknown>) => {
        written.push(row);
        return row;
      },
      patchSpace: async (patch: Record<string, unknown>) => {
        patches.push(patch);
        return patch;
      },
    };
    const result = await executeAgentTool(
      adapter as never,
      { id: "space-1", user_id: "user-1", created_at: 1, updated_at: 1 },
      "user-1",
      {
        id: "proposal-1",
        space_id: "space-1",
        role: "tool",
        content: "Edit Talk message",
        tool_call_id: "call-1",
        tool_name: "change_talk_message",
        tool_arguments: JSON.stringify({
          operation: "edit",
          message_id: "message-1",
          text: "New words",
          expected_text: "Old words",
          expected_created_at: 7,
        }),
        tool_state: "pending",
        created_at: 8,
        updated_at: 8,
      },
      { now: () => 9 },
    );

    expect(written).toMatchObject([
      { id: "message-1", text: "New words", type: "user" },
    ]);
    expect(patches).toEqual([
      {
        id: "space-1",
        reset_phrases_synced_count: true,
        updated_at: 9,
      },
    ]);
    expect(JSON.parse(result)).toMatchObject({ ok: true, spoken: false });
  });
});

describe("agent transcript", () => {
  const at = (n: number) => ({ created_at: n, updated_at: n });

  const said = (id: string, role: "user" | "assistant", content: string) =>
    ({ id, space_id: "space-1", role, content, ...at(1) }) as AgentMessage;

  const used = (
    id: string,
    tool_name: AgentToolName,
    tool_state: AgentToolState,
    tool_arguments = "{}",
  ) =>
    ({
      id,
      space_id: "space-1",
      role: "tool",
      content: agentToolSummary(tool_name, tool_arguments),
      tool_call_id: `call-${id}`,
      tool_name,
      tool_arguments,
      tool_state,
      ...at(1),
    }) as AgentMessage;

  it("opens a turn at every user message", () => {
    const turns = groupAgentTurns([
      said("a", "user", "Hello"),
      said("b", "assistant", "Hello back"),
      said("c", "user", "And again"),
    ]);

    expect(turns.map((turn) => [turn.id, turn.role])).toEqual([
      ["a", "user"],
      ["b", "assistant"],
      ["c", "user"],
    ]);
  });

  it("gathers consecutive tools of one outcome into a single part", () => {
    const turns = groupAgentTurns([
      said("a", "user", "Set this space up"),
      used("b", "inspect_space", "applied"),
      used("c", "read_note", "applied", '{"note_id":"note-1"}'),
      used("d", "change_phrase", "applied", '{"operation":"pin","phrase_id":"p1"}'),
      used("e", "change_phrase", "applied", '{"operation":"pin","phrase_id":"p2"}'),
      used("f", "change_note", "failed", '{"operation":"delete","note_id":"n1"}'),
      used("g", "inspect_space", "applied"),
      said("h", "assistant", "Done."),
    ]);

    expect(turns).toHaveLength(2);
    expect(
      turns[1].parts.map((part) =>
        part.kind === "run"
          ? ["run", part.rows.map((row) => row.id)]
          : [part.kind, part.row.id],
      ),
    ).toEqual([
      // Two reads answered one question, so they are one line.
      ["run", ["b", "c"]],
      // A different outcome starts a new line, or the word beside the mark
      // would have to stand for two of them.
      ["run", ["d", "e"]],
      // A failure carries its own reason, so it never joins a group.
      ["write", "f"],
      ["run", ["g"]],
      ["text", "h"],
    ]);
  });

  it("never gathers a change that is still waiting for a press", () => {
    const turns = groupAgentTurns([
      used("a", "change_phrase", "applied", '{"operation":"pin","phrase_id":"p1"}'),
      used("b", "change_phrase", "pending", '{"operation":"pin","phrase_id":"p2"}'),
      used("c", "change_phrase", "applied", '{"operation":"pin","phrase_id":"p3"}'),
    ]);

    expect(turns[0].parts.map((part) => part.kind)).toEqual([
      "run",
      "write",
      "run",
    ]);
  });

  it("drops an assistant row that carried only a tool call", () => {
    const turns = groupAgentTurns([
      said("a", "assistant", ""),
      used("b", "inspect_space", "applied"),
    ]);

    expect(turns[0].parts.map((part) => part.kind)).toEqual(["run"]);
  });

  it("names the outcome of every tool row", () => {
    const outcome = (name: AgentToolName, state: AgentToolState) =>
      agentToolOutcome(
        used(
          "x",
          name,
          state,
          name === "inspect_space"
            ? "{}"
            : '{"operation":"delete","note_id":"note-1"}',
        ),
      );

    expect(outcome("inspect_space", "applied")).toEqual({
      tone: "read",
      label: "Read",
    });
    expect(outcome("change_note", "applied")).toEqual({
      tone: "applied",
      label: "Applied",
    });
    expect(outcome("change_note", "rejected")).toEqual({
      tone: "rejected",
      label: "Not applied",
    });
    expect(outcome("change_note", "failed")).toEqual({
      tone: "failed",
      label: "Could not apply",
    });
    expect(outcome("change_note", "pending")).toEqual({
      tone: "pending",
      label: "Waiting for you",
    });
  });

  it("previews a create as the fields it will write", () => {
    const row = used(
      "x",
      "change_phrase",
      "pending",
      JSON.stringify({
        operation: "create",
        text: "Could you speak a bit slower?",
        pinned: true,
      }),
    );

    expect(agentProposalLines(row)).toEqual([
      { label: "Phrase", value: "Could you speak a bit slower?" },
      { label: "Pinned", value: "Yes — generation will keep it" },
    ]);
  });

  it("previews an edit as before and after when it knows the current words", () => {
    const row = used(
      "x",
      "change_talk_message",
      "pending",
      JSON.stringify({
        operation: "edit",
        message_id: "message-1",
        text: "Could you raise the bed a little?",
        expected_text: "Can you raise the bed",
      }),
    );

    expect(agentProposalLines(row)).toEqual([
      { label: "Now", value: "Can you raise the bed", was: true },
      { label: "After", value: "Could you raise the bed a little?" },
    ]);
  });

  it("takes the current words from the screen when the arguments hold none", () => {
    const row = used(
      "x",
      "configure_space",
      "pending",
      JSON.stringify({ title: "Sister", expected_updated_at: 4 }),
    );

    expect(agentProposalLines(row, { title: "Amber Cedar Meadow" })).toEqual([
      { label: "Now", value: "Amber Cedar Meadow", was: true },
      { label: "After", value: "Sister" },
    ]);
    expect(agentProposalLines(row)).toEqual([
      { label: "Name", value: "Sister" },
    ]);
  });

  it("shows a delete no preview, because it is named by an ID and not by text", () => {
    const row = used(
      "x",
      "change_note",
      "pending",
      JSON.stringify({ operation: "delete", note_id: "note-1" }),
    );

    // The card still says what it is and that it cannot be undone. Only the
    // words of the note are missing, and the screen does not hold them.
    expect(agentProposalLines(row)).toEqual([]);
  });

  it("separates a delete, which cannot be undone, from an unpin, which can", () => {
    const del = used(
      "x",
      "change_phrase",
      "pending",
      '{"operation":"delete","phrase_id":"phrase-1"}',
    );
    const unpin = used(
      "y",
      "change_phrase",
      "pending",
      '{"operation":"unpin","phrase_id":"phrase-1"}',
    );

    expect(agentProposalIsDelete(del)).toBe(true);
    expect(agentProposalIsUnpin(del)).toBe(false);
    expect(agentProposalIsDelete(unpin)).toBe(false);
    expect(agentProposalIsUnpin(unpin)).toBe(true);
    expect(agentProposalLines(unpin)).toEqual([
      { label: "Pinned", value: "No — generation can replace it" },
    ]);
  });

  it("offers openers that cost no keystrokes", () => {
    expect(AGENT_OPENERS.length).toBeGreaterThan(0);
    for (const opener of AGENT_OPENERS) {
      expect(opener).toBe(opener.trimStart());
      expect(opener.endsWith(" ")).toBe(true);
    }
  });
});

describe("the first turn of a new space", () => {
  /** A transcript, a phrase table, and a space the model can rename. */
  const bench = (calls: Array<Record<string, unknown>>) => {
    // The screen writes the words of the user before the turn runs, so the
    // first turn of a space continues from something, like every other turn.
    const transcript: Array<Record<string, unknown>> = [
      {
        id: "said",
        space_id: "space-1",
        role: "user",
        content: "I speak to my sister about the grandchildren.",
        created_at: 1,
        updated_at: 1,
      },
    ];
    const phrases: Array<Record<string, unknown>> = [];
    let space = {
      id: "space-1",
      user_id: "user-1",
      title: "Amber Cedar Meadow",
      created_at: 1,
      updated_at: 1,
    };
    let at = 0;

    const writer = scripted(
      ...calls.map((call, index) =>
        uses(
          call.name as string,
          call.arguments as Record<string, unknown>,
          `call-${index + 1}`,
        ),
      ),
      says("Called it Sister and wrote two phrases."),
    );

    const adapter = {
      ...writer,
      listAgentMessages: async () => transcript,
      putAgentMessage: async (row: Record<string, unknown>) => {
        transcript.push(row);
        return row;
      },
      listNotes: async () => [],
      listMessages: async () => [],
      updateAgentToolState: async (
        id: string,
        _expected: string,
        state: string,
        content: string,
      ) => {
        const row = transcript.find((item) => item.id === id)!;
        Object.assign(row, { tool_state: state, content });
        return row;
      },
      listSpaces: async () => [space],
      getSpace: async () => space,
      patchSpace: async (patch: Record<string, unknown>) => {
        space = { ...space, ...patch } as typeof space;
        return space;
      },
      listPhrases: async () => phrases,
      putPhrase: async (row: Record<string, unknown>) => {
        phrases.push(row);
        return row;
      },
    };

    const run = () =>
      continueSpaceAgent(adapter as never, space, {
        intro: true,
        now: () => 10,
        id: () => `row-${++at}`,
      });

    return {
      run,
      transcript,
      phrases,
      asked: writer.asked,
      space: () => space,
    };
  };

  const reading = { name: "inspect_space", arguments: {} };
  const naming = {
    name: "configure_space",
    arguments: {
      title: "Sister",
      context: "I speak to my sister about the grandchildren.",
      expected_updated_at: 1,
    },
  };
  const phrase = (text: string) => ({
    name: "change_phrase",
    arguments: {
      operation: "create",
      phrase_id: null,
      text,
      kind: "phrase",
      pinned: true,
      expected_updated_at: null,
    },
  });

  it("is told to name the space and write its phrases without asking", async () => {
    const bed = bench([reading, naming]);
    await bed.run();

    const system = bed.asked[0].systemPrompt ?? "";
    expect(system).toContain("configure_space");
    expect(system).toContain("change_phrase");
    // The ordinary prompt promises the user approves every write. This turn
    // must not, or the model will stop and ask.
    expect(system).not.toContain("must approve");
  });

  it("applies its own writes, because a new space holds nothing to protect", async () => {
    const bed = bench([
      reading,
      naming,
      phrase("Are the children well?"),
      phrase("Call me Sunday"),
    ]);
    await bed.run();

    expect(bed.space().title).toBe("Sister");
    expect(bed.phrases.map((row) => row.text)).toEqual([
      "Are the children well?",
      "Call me Sunday",
    ]);
    // Nothing is left waiting: the user pressed Create space, and that press
    // is the approval.
    expect(bed.transcript.some((row) => row.tool_state === "pending")).toBe(
      false,
    );
  });

  it("stops writing once one turn has spent its budget", async () => {
    const many = Array.from({ length: AGENT_MAX_WRITES + 4 }, (_, at) =>
      phrase(`Phrase ${at}`),
    );
    const bed = bench(many);
    await bed.run();

    expect(bed.phrases).toHaveLength(AGENT_MAX_WRITES);
    // Nothing else stops the loop now that a write does not wait for a press.
    // A model that keeps writing does not get to write for ever: the next one
    // asks, which is a brake the user can see and release.
    expect(bed.transcript.some((row) => row.tool_state === "pending")).toBe(
      true,
    );
  });

  it("holds nothing back on any other turn either", async () => {
    const transcript: Array<Record<string, unknown>> = [
      {
        id: "asked",
        space_id: "space-1",
        role: "user",
        content: "Write me a thank-you phrase",
        created_at: 1,
        updated_at: 1,
      },
    ];
    const phrases: Array<Record<string, unknown>> = [];
    const writer = scripted(
      uses("change_phrase", phrase("Thank you").arguments),
      says("Written."),
    );
    const adapter = {
      ...writer,
      listAgentMessages: async () => transcript,
      putAgentMessage: async (row: Record<string, unknown>) => {
        transcript.push(row);
        return row;
      },
      listPhrases: async () => phrases,
      putPhrase: async (row: Record<string, unknown>) => {
        phrases.push(row);
        return row;
      },
    };

    let at = 0;
    await continueSpaceAgent(
      adapter as never,
      { id: "space-1", user_id: "user-1", created_at: 1, updated_at: 1 },
      { now: () => 10, id: () => `row-${++at}` },
    );

    expect(phrases.map((row) => row.text)).toEqual(["Thank you"]);
    expect(transcript.some((row) => row.tool_state === "pending")).toBe(false);
    // The ordinary prompt is the one that names the single exception.
    const system = writer.asked[0].systemPrompt ?? "";
    expect(system).toContain("delete");
    expect(system).toContain("must approve");
  });
});

describe("what a tool found, in words", () => {
  const row = (
    tool_name: AgentToolName,
    content: string,
    tool_state: AgentToolState = "applied",
  ) =>
    ({
      id: "x",
      space_id: "space-1",
      role: "tool",
      content,
      tool_call_id: "call-1",
      tool_name,
      tool_arguments: "{}",
      tool_state,
      created_at: 1,
      updated_at: 1,
    }) as AgentMessage;

  it("counts what reading the space turned up", () => {
    expect(
      agentToolResult(
        row(
          "inspect_space",
          JSON.stringify({
            space: { title: "Hospital" },
            notes: [{ id: "n1" }, { id: "n2" }],
            phrases: [{ id: "p1" }],
            recent_talk_messages: [{ id: "m1" }, { id: "m2" }, { id: "m3" }],
          }),
        ),
      ),
    ).toBe("2 notes, 1 phrase, 3 recent messages");
  });

  it("measures a note by what it read of it", () => {
    expect(
      agentToolResult(
        row(
          "read_note",
          JSON.stringify({
            name: "Hospital visits",
            content: "Tuesday",
            has_more: true,
          }),
        ),
      ),
    ).toBe("Hospital visits — 7 characters, and more to read");
  });

  it("counts a page of Talk messages", () => {
    expect(
      agentToolResult(
        row(
          "read_talk_messages",
          JSON.stringify({ messages: [{ id: "m1" }], has_more: false }),
        ),
      ),
    ).toBe("1 message");
  });

  it("says a change landed without repeating the change", () => {
    expect(agentToolResult(row("change_phrase", '{"ok":true}'))).toBe("Done.");
  });

  it("never shows the user a payload it cannot read", () => {
    // A result the app does not recognise is not worth printing raw. The
    // labelled list above it already says what ran.
    for (const content of ["not json", "", "[1,2,3]"]) {
      expect(agentToolResult(row("inspect_space", content))).toBe("");
    }
  });
});

describe("the turn that makes a space", () => {
  it("knows the agent still owes a reply to the newest turn", () => {
    const asked = agentSaidRow("space-1", "user", "Who am I?", {
      now: () => 1_000,
      id: () => "a",
    });
    const answered = agentSaidRow("space-1", "assistant", "You are you.", {
      now: () => 1_100,
      id: () => "b",
    });

    // A screen that did not start the work still has to show it.
    expect(agentOwesReply([asked], 1_500)).toBe(true);
    expect(agentOwesReply([asked, answered], 1_500)).toBe(false);
    expect(agentOwesReply([], 1_500)).toBe(false);

    // An app closed mid-run would otherwise promise an answer for ever.
    expect(agentOwesReply([asked], 1_000 + INTRODUCTION_WAIT_MS)).toBe(false);
  });

  it("writes a plain row, so an introduction reads as any other turn", () => {
    const row = agentSaidRow("space-1", "user", "  I speak to my sister.  ", {
      now: () => 5,
      id: () => "row-1",
    });

    expect(row).toEqual({
      id: "row-1",
      space_id: "space-1",
      role: "user",
      content: "I speak to my sister.",
      created_at: 5,
      updated_at: 5,
    });
    // No tool name and no tool state: nothing here claims a tool call that
    // the runtime never made.
    expect(row.tool_name).toBeUndefined();
  });
});
