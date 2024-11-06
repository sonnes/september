import { Message, Conversation } from "@/types/types";

const CONVERSATIONS_KEY = "september_conversations";
const MESSAGES_KEY = "september_messages";

export const storageService = {
  getConversations: (): Conversation[] => {
    const conversations = localStorage.getItem(CONVERSATIONS_KEY);
    const parsedConversations = conversations
      ? JSON.parse(conversations, (key, value) => {
          if (key === "createdAt" || key === "updatedAt")
            return new Date(value);
          return value;
        })
      : [];
    return parsedConversations.sort((a: Conversation, b: Conversation) => {
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  },

  saveConversation: (conversation: Conversation): void => {
    const conversations = storageService.getConversations();
    const index = conversations.findIndex((c) => c.id === conversation.id);
    if (index !== -1) {
      conversations[index] = conversation;
    } else {
      conversations.push(conversation);
    }
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  },

  getMessages: (conversationId: string): Message[] => {
    const allMessages = localStorage.getItem(MESSAGES_KEY);
    const messages = allMessages
      ? JSON.parse(allMessages, (key, value) => {
          if (key === "createdAt") return new Date(value);
          return value;
        })
      : {};
    return messages[conversationId] || [];
  },

  saveMessage: (conversationId: string, message: Message): void => {
    const allMessages = localStorage.getItem(MESSAGES_KEY);
    const messages = allMessages ? JSON.parse(allMessages) : {};
    if (!messages[conversationId]) {
      messages[conversationId] = [];
    }
    messages[conversationId].push(message);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  },
};
