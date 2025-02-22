import ollama from 'ollama';

import type { Message } from '@/supabase/types';

const SYSTEM_PROMPT = `# You're a superhuman autocomplete system that provides autocompletions for your users.
You take the PREVIOUS_COMPLETIONS, DOMAIN_KNOWLEDGE and you generate a list of the most likely auto completions for your users based on their INPUT_VALUE.

You closely follow GENERATION_RULES to provide the best possible completions.

## GENERATION_RULES
- If the users INPUT_VALUE exists within their PREVIOUS_MESSAGES, prefer that completion. Always prefer the completion with the highest hits.
- If the users INPUT_VALUE does NOT exist in PREVIOUS_MESSAGES derive a completion from DOMAIN_KNOWLEDGE.
- If the users INPUT_VALUE isn't in PREVIOUS_MESSAGES and doesn't have a completion in DOMAIN_KNOWLEDGE, generate a new, short concise completion based on your own knowledge of the TOPIC.
- Return the list of completions as JSON in this format - {"completions": ["completion1", "completion2", "completion3"]}
- Provide completions that fully complete the users sentence.
- Your completions should be the remaining words in the sentence, and should be a valid sentence. It will be attached to the end of the sentence.
- Be sure to use the correct grammar and punctuation.
- Use Indian English. Use spellings, idioms, and slang that are common in Indian English.
- Only provide the completions, no other text or thought process.

## EXAMPLES

User: "I'm trying to"
Assistant: {"completions": ["build a communication app", "do my homework", "get a job"]}

User: How
Assistant: {"completions": ["are you?", "is it?", "was that?"]}

User: Wh
Assistant: {"completions": ["at is going on?", "ere are you?", "ere was that?"]}

User: I'm going out to the store.
Assistant: {"completions": ["I'll be back in a bit.", "Do you want anything?", "Do you want anything?"]}`;

export interface SuggestionResponse {
  suggestions: string[];
}

export async function generateSuggestions(
  text: string,
  history: Message[]
): Promise<SuggestionResponse> {
  const previousMessages = history.map(m => m.text).join('\n');
  const domainKnowledge = '';
  const topic = 'English';

  const systemPrompt = SYSTEM_PROMPT.replace('{{TOPIC}}', topic)
    .replace('{{PREVIOUS_MESSAGES}}', previousMessages)
    .replace('{{DOMAIN_KNOWLEDGE}}', domainKnowledge);

  const prompt = `## Complete the following INPUT_VALUE: ${text}`;

  const response = await ollama.generate({
    model: 'llama3.2',
    system: systemPrompt,
    prompt: prompt,
  });

  let suggestions = {} as { completions: string[] };
  try {
    // Extract JSON using regex to find content between curly braces
    const jsonMatch = response.response.match(/\{[^]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      suggestions = JSON.parse(jsonStr.trim());
    }
  } catch (e) {
    console.log(response.response);
    console.error('Error parsing suggestions:', e);
  }

  return {
    suggestions: suggestions.completions || [],
  };
}
