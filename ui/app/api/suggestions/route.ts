import ollama from "ollama";
import type { Message } from "@/db/messages";

const SYSTEM_PROMPT = `# You're a superhuman autocomplete system that provides autocompletions for your users.
You take the TOPIC, the PREVIOUS_COMPLETIONS, DOMAIN_KNOWLEDGE and you generate a list of the most likely auto completions for your users based on their INPUT_VALUE.

You closely follow GENERATION_RULES to provide the best possible completions.

## GENERATION_RULES
- If the users INPUT_VALUE exists within their PREVIOUS_MESSAGES, prefer that completion. Always prefer the completion with the highest hits.
- If the users INPUT_VALUE does NOT exist in PREVIOUS_MESSAGES derive a completion from DOMAIN_KNOWLEDGE.
- If the users INPUT_VALUE isn't in PREVIOUS_MESSAGES and doesn't have a completion in DOMAIN_KNOWLEDGE, generate a new, short concise completion based on your own knowledge of the TOPIC.
- Return the list of completions as JSON in this format - {"completions": ["completion1", "completion2", "completion3"]}
- Provide completions that fully complete the users sentence.
- Your completions should be the remaining words in the sentence, and should be a valid sentence. It will be attached to the end of the sentence.
- Your completion will be attached to the end of the sentence.
- Be sure to use the correct grammar and punctuation.
- Use Indian English. Use spellings, idioms, and slang that are common in Indian English.
- Only provide the completions, no other text.

## EXAMPLES

User: "I'm trying to"
Assistant: ["build a communication app", "do my homework", "get a job"]

User: How
Assistant: ["are you?", "is it?", "was that?"]

User: Wh
Assistant: ["at is going on?", "ere are you?", "ere was that?"]

User: I'm going out to the store.
Assistant: ["I'll be back in a bit.", "Do you want anything?", "Do you want anything?"]

## TOPIC
{{TOPIC}}

## PREVIOUS_MESSAGES
{{PREVIOUS_MESSAGES}}

## DOMAIN_KNOWLEDGE
{{DOMAIN_KNOWLEDGE}}
`;

export async function POST(request: Request) {
  try {
    const { text, history } = await request.json();

    const previousMessages = history.map((m: Message) => m.text).join("\n");
    const domainKnowledge = "";
    const topic = "English";

    const systemPrompt = SYSTEM_PROMPT.replace("{{TOPIC}}", topic)
      .replace("{{PREVIOUS_MESSAGES}}", previousMessages)
      .replace("{{DOMAIN_KNOWLEDGE}}", domainKnowledge);

    const prompt = `## Complete the following INPUT_VALUE: ${text}`;

    const response = await ollama.generate({
      model: "llama3.2",
      system: systemPrompt,
      prompt: prompt,
    });

    let suggestions = {} as { completions: string[] };
    try {
      suggestions = JSON.parse(response.response.trim());
    } catch (e) {
      console.error("Error parsing suggestions:", e);
    }

    console.log("input:", text);
    console.log("Suggestions:", suggestions);

    return Response.json({
      suggestion: suggestions.completions ? suggestions.completions[0] : "",
      completions: suggestions.completions?.slice(1),
    });
  } catch (error) {
    console.error("Error generating suggestion:", error);
    return Response.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}
