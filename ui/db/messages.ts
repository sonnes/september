import { db } from "@/db";
import { messages } from "@/db/schema/messages";
import { type Message as MessageType } from "@/db/schema/messages";

export type Message = MessageType;

export const getAllMessages = async (): Promise<Message[]> => {
  if (typeof window === "undefined") return [];

  const messagesJson = localStorage.getItem("messages");
  if (!messagesJson) return [];

  const messages = JSON.parse(messagesJson);
  return messages.map((msg: any) => ({
    ...msg,
    createdAt: new Date(msg.createdAt),
  }));
};

export const putMessage = async (message: Message) => {
  if (typeof window === "undefined") return;

  const messages = await getAllMessages();
  messages.push(message);
  localStorage.setItem("messages", JSON.stringify(messages));
};

export const createMessage = async (message: Message) => {
  await db.insert(messages).values(message);
};

export const getMessages = async (page = 1, pageSize = 100) => {
  return await db
    .select()
    .from(messages)
    .limit(pageSize)
    .offset((page - 1) * pageSize);
};
