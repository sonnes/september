import { API } from "@/utils/api";
import type { Message } from "@/db/schema/messages";
export const getMessagesAPI = async (page = 1, pageSize = 100) => {
  return API.get({
    path: "/api/messages",
    query: new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    }),
  });
};

export const createMessageAPI = async (message: Message) => {
  return API.post("/api/messages", JSON.stringify(message));
};
