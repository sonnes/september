import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import moment from "moment";
import { Conversation } from "@/types/types";

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: string | null;
  onSelectConversation: (id: string) => void;
}

export function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
}: ConversationListProps) {
  return (
    <div className="w-full lg:w-1/3 bg-card rounded-lg shadow p-4 flex flex-col h-full">
      <div className="relative mb-4">
        <Input placeholder="Search conversations..." className="pl-10" />
        <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
      </div>
      <div className="space-y-4 overflow-y-auto flex-1">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`flex items-center p-2 hover:bg-accent hover:text-accent-foreground rounded cursor-pointer ${
              selectedConversation === conversation.id
                ? "bg-accent text-accent-foreground"
                : ""
            }`}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={`/placeholder-avatar.jpg`}
                alt={conversation.name}
              />
              <AvatarFallback>{conversation.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <p className="font-medium">{conversation.name}</p>
              <p className="text-sm text-muted-foreground">
                {(conversation.lastMessage || "No messages yet").slice(0, 30)}
              </p>
            </div>
            <span className="ml-auto text-xs text-muted-foreground">
              {moment(conversation.updatedAt).fromNow()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
