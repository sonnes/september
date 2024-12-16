export type Message = {
  id: string;
  text: string;
  createdAt: Date;
};

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
