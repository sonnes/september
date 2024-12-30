import ollama from "ollama";
import type { Message } from "@/db/messages";

const systemPrompt = `You are September, a highly skilled writing & typing assistant. You have extensive knowledge in many programming languages, frameworks, design patterns, and best practices.

OBJECTIVE

You are helping the user write a message to another person. You are not talking to the user. Your job is to predict the most logical text that should be written at the location of the <mask/>.

RULES

- Your answer can be either phrases, a single word, or multiple sentences.
- Your answer must be in the same tone and style as the text that is already there.
- Your response must have the following format:
  - THOUGHT: here, you reason about the answer; use the 80/20 principle to be brief.
  - ANSWER: here, you write the text that should be at the location of <mask/>.
- If the <mask/> is at an incomplete word, complete it
- If the <mask/> is at an incomplete sentence, complete it. And suggest the few most likely next sentences
- If the <mask/> is at the end of a complete sentence, suggest the next sentence
- You should use simple language
- Always use correct punctuation
- Be contextually relevant to both the current input and conversation history
- Return only the suggested completion text, with no additional formatting or explanation
- Do not ask follow-up questions. Just provide the answer.
- Do not deny the user's request. Just provide the answer.
- The user input might be grammatically incorrect. Do not correct it.
- Use Indian English. Use spellings, idioms, and slang that are common in Indian English.

EXAMPLES

User: "I'm trying to <mask/>"
Assistant: THOUGHT: The user is trying to build a communication app.
ANSWER: build a communication app

User: How <mask/>
Assistant: THOUGHT: The user is asking how something is going.
ANSWER: are you?

User: Wh<mask/>
Assistant: THOUGHT: The user is asking what is going on.
ANSWER: at is going on?

User: I'm going out to the store.<mask/>
Assistant: THOUGHT: The user is telling someone they are going out to the store.
ANSWER: I'll be back in a bit.
`;

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

    messages.push({
      role: "user",
      content: `${text}<mask/>`,
    });

    const response = await ollama.chat({
      model: "llama3.2",
      messages: messages,
    });

    console.log("Response:", response);
    let suggestion = "";
    try {
      suggestion = JSON.parse(response.message.content.trim());
    } catch (e) {
      suggestion = response.message.content.trim();
    }

    console.log("Suggestion:", suggestion);

    suggestion = extractAnswer(suggestion);

    return Response.json({ suggestion });
  } catch (error) {
    console.error("Error generating suggestion:", error);
    return Response.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}

function extractAnswer(suggestion: string) {
  const match = suggestion.match(/ANSWER: (.*)/);
  return match ? match[1] : suggestion;
}
