import ollama from "ollama";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import type { Message } from "@/db/messages";

const Suggestion = z.string().min(1);

const Suggestions = z.array(Suggestion);

const systemPrompt = `You are a helpful assistant. Given a user's input, return a list of autocomplete phrases that start with the user's input. Use previous messages to context the suggestions. Do not include user input in the suggestions. Format the response as a JSON array of strings.`;

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
      format: zodToJsonSchema(Suggestions),
    });

    let suggestions: string[];
    try {
      suggestions = JSON.parse(response.message.content.trim());
      if (!Array.isArray(suggestions)) {
        suggestions = [];
      }
    } catch (e) {
      suggestions = [];
    }

    return Response.json({ suggestions });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return Response.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
