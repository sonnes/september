import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import moment from "moment";
import { Conversation } from "@/types/types";

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: string | null;
  onSelectConversation: (id: string) => void;
  className?: string;
}

export function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  className,
}: ConversationListProps) {
  return (
    <Sidebar collapsible="none" className={`w-80 ${className}`}>
      <SidebarHeader className="gap-3.5 border-b p-4">
        <div className="relative">
          <Input
            placeholder="Search conversations..."
            className="pl-10 text-sm"
          />
          <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-[calc(100vh-8.5rem)]">
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {conversations.map((conversation) => (
                <a
                  href="#"
                  key={conversation.id}
                  className={`flex flex-col items-start gap-2 whitespace-nowrap border-b p-4 text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                    selectedConversation === conversation.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : ""
                  }`}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="flex w-full items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={`/placeholder-avatar.jpg`}
                        alt={conversation.name}
                      />
                      <AvatarFallback>
                        {conversation.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{conversation.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {moment(conversation.updatedAt).fromNow()}
                    </span>
                  </div>
                  <span className="line-clamp-2 w-[260px] whitespace-break-spaces text-xs text-muted-foreground">
                    {conversation.lastMessage || "No messages yet"}
                  </span>
                </a>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
