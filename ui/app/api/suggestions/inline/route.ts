import ollama from "ollama";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import type { Message } from "@/db/messages";

const Suggestion = z.string().min(1);

const systemPrompt = `You are a helpful writing assistant. Given the user's current input and conversation history, provide a single natural completion suggestion that continues their thought. The suggestion should:
- Be contextually relevant to both the current input and conversation history
- Complete the current sentence or thought naturally
- Be concise and direct
- Return only the suggested completion text, with no additional formatting or explanation`;

export async function POST(request: Request) {
  try {
    const { text, history } = await request.json();

    const messages = [{ role: "system", content: systemPrompt }];

    if (history.length > 0) {
      messages.push({
        role: "user",
        content: history.map((m: Message) => m.text).join("\n"),
      });
    }

    messages.push({ role: "user", content: text });

    const response = await ollama.chat({
      model: "llama3.2:1b",
      messages: messages,
      format: zodToJsonSchema(Suggestion),
    });

    console.log("Response:", response);
    let suggestion = "";
    try {
      suggestion = JSON.parse(response.message.content.trim());
    } catch (e) {
      suggestion = response.message.content.trim();
    }

    return Response.json({ suggestion });
  } catch (error) {
    console.error("Error generating suggestion:", error);
    return Response.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}
