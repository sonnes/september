import React from "react";
import { Message } from "@/types/message";
import moment from "moment";
import { PlayIcon } from "./Icons";

interface ConversationDetailsProps {
  conversation: {
    id: string;
    messages: Message[];
  } | null;
  isLoading: boolean;
  error: Error | null;
  onPlayMessage: (message: Message) => void;
}

const ConversationDetails: React.FC<ConversationDetailsProps> = ({
  conversation,
  isLoading,
  error,
  onPlayMessage,
}) => {
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!conversation) return <div>No conversation selected</div>;

  return (
    <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
      {conversation.messages.map((msg) => (
        <div
          key={msg.id}
          className={`p-2 my-2 rounded flex ${
            msg.authorId === "transcriber" ? "justify-start" : "justify-end"
          }`}
        >
          <div
            className={`max-w-3/4 ${
              msg.authorId === "transcriber" ? "bg-blue-100" : "bg-gray-50"
            } rounded p-3 shadow`}
          >
            <div className="text-lg mb-2">{msg.text}</div>
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-500">
                {moment(msg.sentAt).fromNow()}
              </div>
              <button
                onClick={() => onPlayMessage(msg)}
                className="ml-2 p-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs flex items-center"
              >
                <PlayIcon className="w-4 h-4 mr-1" />
                Play
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConversationDetails;
