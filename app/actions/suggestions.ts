'use server';

import { GoogleGenAI } from '@google/genai';

import { getAuthUser } from '@/app/actions/user';

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Generates autocomplete suggestions using Gemini AI
 */
async function generateSuggestionWithGemini(previousText: string): Promise<string | null> {
  try {
    if (!GEMINI_API_KEY) {
      console.warn('Gemini API key not configured');
      return null;
    }

    // Create system prompt for autocomplete suggestions
    const AUTOCOMPLETE_SYSTEM_PROMPT = `You are an intelligent writing assistant that provides autocomplete suggestions for markdown documents.

Your task is to complete the user's current text naturally.

Rules:
- Provide ONLY the completion text, not the full sentence
- Keep completions concise (1-15 words maximum)
- Return only the completion text, no JSON or extra formatting
- Complete the text naturally based on the context
- For markdown syntax, complete it appropriately
- Make suggestions that flow naturally from the existing text`;

    const prompt = `Complete this text naturally: "${previousText.slice(-100)}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      config: {
        systemInstruction: AUTOCOMPLETE_SYSTEM_PROMPT,
        temperature: 0.3, // Lower temperature for more predictable completions
        maxOutputTokens: 50, // Short completions
        stopSequences: ['\n', '.', '!', '?'], // Stop at sentence boundaries
      },
    });

    const suggestion = response.text?.trim();

    // Validate and clean the suggestion
    if (!suggestion || suggestion.length > 100) {
      return null;
    }

    // Remove quotes if Gemini added them
    const cleanSuggestion = suggestion.replace(/^["']|["']$/g, '');

    return cleanSuggestion;
  } catch (error) {
    console.error('Error generating Gemini suggestion:', error);
    return null;
  }
}

/**
 * Server action for generating autocomplete suggestions based on document context
 */
export async function getAutocompleteSuggestions(
  previousText: string,
  cursorPosition: number,
  documentContent: string
): Promise<string | null> {
  try {
    // Verify user authentication
    const user = await getAuthUser();
    if (!user) {
      return null;
    }

    // Basic validation
    if (!previousText && !documentContent) {
      return null;
    }

    // Generate suggestion using Gemini AI
    const geminiSuggestion = await generateSuggestionWithGemini(previousText);

    return geminiSuggestion;
  } catch (error) {
    console.error('Error generating autocomplete suggestion:', error);
    return null;
  }
}
