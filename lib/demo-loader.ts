import { readFile } from 'fs/promises';
import { join } from 'path';

import { Message } from '@/packages/chats';

interface DemoMessage {
  text: string;
  type: 'message' | 'transcription';
}

interface DemoScenario {
  id: string;
  title: string;
  context: string;
  messages: DemoMessage[];
}

interface DemoData {
  scenarios: DemoScenario[];
}

/**
 * Load demo scenarios and convert to Message format
 * @param scenarioId - Optional scenario ID to load specific scenario
 * @returns Array of Messages in the proper format
 */
export async function loadDemoMessages(scenarioId?: string): Promise<Message[]> {
  try {
    const filePath = join(process.cwd(), 'public', 'demo-scenarios.json');
    const fileContent = await readFile(filePath, 'utf-8');
    const data: DemoData = JSON.parse(fileContent);

    // If scenarioId is provided, load only that scenario
    const scenarios = scenarioId ? data.scenarios.filter(s => s.id === scenarioId) : data.scenarios;

    if (scenarioId && scenarios.length === 0) {
      throw new Error(`Scenario '${scenarioId}' not found`);
    }

    // Convert demo messages to Message format
    const messages: Message[] = [];
    const demoUserId = 'demo-user';
    const pastDate = new Date().getTime() - 1000 * 60 * 20;

    scenarios.forEach(scenario => {
      scenario.messages.forEach((message, messageIndex) => {
        // Create timestamps with 2-minute intervals between messages
        const timestamp = new Date(pastDate + messageIndex * 1000 * 60 * 2);

        messages.push({
          id: `demo-${scenario.id}-${messageIndex}`,
          text: message.text,
          type: message.type,
          user_id: demoUserId,
          created_at: timestamp,
        });
      });
    });

    // Sort by created_at
    //messages.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());

    return messages.reverse();
  } catch (error) {
    console.error('Error loading demo messages:', error);
    return [];
  }
}

/**
 * Get list of available demo scenarios
 */
export async function getDemoScenarios(): Promise<
  Array<{ id: string; title: string; context: string }>
> {
  try {
    const filePath = join(process.cwd(), 'public', 'demo-scenarios.json');
    const fileContent = await readFile(filePath, 'utf-8');
    const data: DemoData = JSON.parse(fileContent);
    return data.scenarios.map(s => ({
      id: s.id,
      title: s.title,
      context: s.context,
    }));
  } catch (error) {
    console.error('Error loading demo scenarios:', error);
    return [];
  }
}
