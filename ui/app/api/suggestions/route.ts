import { generateSuggestions as generateOllamaSuggestions } from "./ollama";
import { generateSuggestions as generateGroqSuggestions } from "./groq";

const MODEL_PROVIDER = process.env.MODEL_PROVIDER || "groq";

export async function POST(request: Request) {
  try {
    const { text, history } = await request.json();

    const generateSuggestions =
      MODEL_PROVIDER === "groq"
        ? generateGroqSuggestions
        : generateOllamaSuggestions;

    const result = await generateSuggestions(text, history);

    return Response.json(result);
  } catch (error) {
    console.error("Error generating suggestion:", error);
    return Response.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}
