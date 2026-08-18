export async function createWebLLMModel(modelId: string) {
  const { webLLM } = await import('@built-in-ai/web-llm');
  return webLLM(modelId);
}
