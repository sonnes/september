import React from "react";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
}

interface ConversationDetailsProps {
  conversation: { id: string; title: string; messages: Message[] } | undefined;
  isLoading: boolean;
  error: Error | null;
}

const ConversationDetails: React.FC<ConversationDetailsProps> = ({
  conversation,
  isLoading,
  error,
}) => {
  if (isLoading) return <div>Loading conversation...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!conversation) return <div>Select a conversation to view details</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{conversation.title}</h2>
      <div className="space-y-4">
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={`p-2 rounded-lg ${
              message.sender === "user"
                ? "bg-blue-100 text-right"
                : "bg-gray-100"
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationDetails;
