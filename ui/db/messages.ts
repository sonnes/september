import { db } from "@/db";
import { messages } from "@/db/schema/messages";
import { type Message as MessageType } from "@/db/schema/messages";

export type Message = MessageType;

export const createMessage = async (message: Message) => {
  await db.insert(messages).values(message);
};

export const getMessages = async (
  page = 1,
  pageSize = 100
): Promise<Message[]> => {
  return await db
    .select()
    .from(messages)
    .limit(pageSize)
    .offset((page - 1) * pageSize);
};
