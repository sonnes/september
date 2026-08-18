export async function createWebLLMModel(_modelId: string): Promise<never> {
  throw new Error('Browser-local WebLLM is unavailable in the desktop app.');
}
