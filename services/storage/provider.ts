import { Alignment } from '@/types/audio';
import { CreateMessageData, Message } from '@/types/message';

export abstract class StorageProvider {
  abstract createMessage(message: CreateMessageData): Promise<Message>;
  abstract uploadAudio(params: {
    path: string;
    blob: string;
    alignment?: Alignment;
  }): Promise<string>;
  abstract getMessages(user_id: string): Promise<Message[]>;
  abstract searchMessages(user_id: string, query: string): Promise<Message[]>;
  abstract downloadAudio(path: string): Promise<Blob>;
}
