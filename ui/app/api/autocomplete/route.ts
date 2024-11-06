import { NextRequest, NextResponse } from "next/server";

interface Message {
  role: string;
  content: string;
}

interface RequestBody {
  text: string;
  messages: Message[];
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { text, messages } = body;

    // Construct conversation history for context
    const conversationContext = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    // Construct the prompt
    const prompt = `You are a helpful assistant to a user who is writing a message. Your job is providing suggestions that reduce the keystrokes needed to write a message. Speaker is another person talking to the user. Given the following conversation and current input, suggest 10, very diverse, phrases or sentences that could be used as completions. Suggestions should start with the user's current input. Only return the suggestions as a JSON array of strings.

Conversation history:
${conversationContext}

Current input: "${text}"

Return format example:
["completion 1", "completion 2", "completion 3"]`;

    // Call Ollama API
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3.2",
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error(
        "Failed to get suggestions from Ollama",
        response.body,
        response.status
      );
      throw new Error("Failed to get suggestions from Ollama");
    }

    const data = await response.json();

    console.log("data", data.response);
    // Parse the response to extract suggestions
    try {
      // The model should return a JSON array, but it might be embedded in the response
      const suggestionText = data.response.trim();
      const suggestions: string[] = JSON.parse(
        suggestionText.replace(/```json\n?|\n?```/g, "") // Remove any markdown code blocks
      );

      // Filter out any invalid suggestions and ensure they start with the input text
      const validSuggestions = suggestions
        .filter((s): s is string => typeof s === "string")
        .slice(0, 10);

      return NextResponse.json({ suggestions: validSuggestions });
    } catch (error) {
      console.error("Error parsing suggestions:", error);
      // Fallback to empty suggestions if parsing fails
      return NextResponse.json({ suggestions: [] });
    }
  } catch (error) {
    console.error("Autocomplete API error:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
