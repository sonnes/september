import { API } from "@/utils/api";
import type { Message } from "@/db/schema/messages";

export const getMessagesAPI = async (page = 1, pageSize = 100) => {
  return API.get<Message[]>({
    path: "/api/messages",
    query: new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    }),
  });
};

export const createMessageAPI = async (message: {
  text: string;
  type: "message" | "transcription";
}) => {
  return API.post<string, Message>("/api/messages", JSON.stringify(message));
};
