import React from "react";

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

interface ConversationListProps {
  conversations: Conversation[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onSelectConversation: (id: string) => void;
  selectedConversationId: string | null;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  isLoading,
  error,
  onSelectConversation,
  selectedConversationId,
}) => {
  if (isLoading) return <div>Loading conversations...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Conversations</h2>
      <ul>
        {conversations?.map((conversation) => (
          <li
            key={conversation.id}
            className={`cursor-pointer p-2 hover:bg-gray-100 ${
              selectedConversationId === conversation.id ? "bg-blue-100" : ""
            }`}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <div className="flex flex-col">
              <span className="font-semibold">{conversation.title}</span>
              <span className="text-sm text-gray-600">
                {conversation.lastMessage}
              </span>
              <span className="text-xs text-gray-400">
                {conversation.timestamp}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ConversationList;
