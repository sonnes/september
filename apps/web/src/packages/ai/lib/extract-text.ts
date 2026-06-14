const TEXT_EXTRACTION_PROMPT = `You are a text extraction service.

Extract all readable text from the provided files. Break down the text into smaller chunks. Each chunk can be 4-5 sentences.

The output should be markdown formatted text. Use --- to separate the chunks. Only extract text, do not describe the files. Use markdown syntax for showing lists, bold, italic, links, tables, etc.

Do not include any other text in the output.
`;

/**
 * Extract text from one or more files using Gemini 2.5 Flash.
 * Throws Error('Could not extract text from files') on failure.
 */
export async function extractText(apiKey: string, files: File[] | Blob[]): Promise<string> {
  // Heavy SDKs are imported lazily so they stay out of initial bundles.
  const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
  const { generateText } = await import('ai');
  const google = createGoogleGenerativeAI({ apiKey });

  const fileParts = await Promise.all(
    files.map(async file => ({
      type: 'file' as const,
      data: await file.arrayBuffer(),
      mediaType: file.type || 'application/pdf',
    }))
  );

  try {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: TEXT_EXTRACTION_PROMPT,
      messages: [
        {
          role: 'user',
          content: fileParts,
        },
      ],
    });

    return text.trim();
  } catch (err) {
    console.error('extractText error:', err);
    throw new Error('Could not extract text from files');
  }
}
