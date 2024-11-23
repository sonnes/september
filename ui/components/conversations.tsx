"use client";

import React, { useState, useEffect } from "react";
import {
  PlusIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  MicrophoneIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ConversationList } from "./conversation-list";
import { ConversationDetail } from "./conversation-detail";
import { Message, Conversation } from "@/types/types";
import { storageService } from "@/services/storage";
import { v4 as uuidv4 } from "uuid";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { NavUser } from "./sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Menu } from "lucide-react";
import navigationData from "@/data/navigation.json";

export function ConversationsComponent() {
  const [conversations, setConversations] = useState(
    storageService.getConversations()
  );
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Select the first conversation by default when the component mounts
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0].id);
    }
  }, [conversations, selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      setMessages(storageService.getMessages(selectedConversation));
    }
  }, [selectedConversation]);

  const handleSendMessage = (content: string, sender: string = "User") => {
    if (content.trim() && selectedConversation) {
      const message: Message = {
        id: uuidv4(),
        sender: sender,
        content: content,
        createdAt: new Date(),
      };
      storageService.saveMessage(selectedConversation, message);
      setMessages([...messages, message]);

      const updatedConversation = conversations.find(
        (c) => c.id === selectedConversation
      );
      if (updatedConversation) {
        updatedConversation.lastMessage = content;
        updatedConversation.updatedAt = new Date();
        storageService.saveConversation(updatedConversation);
        setConversations([...conversations]);
      }
    }
  };

  const handleNewConversation = () => {
    const now = new Date();
    const newConversation: Conversation = {
      id: uuidv4(),
      name: `Conversation ${conversations.length + 1}`,
      lastMessage: "",
      createdAt: now,
      updatedAt: now,
    };
    storageService.saveConversation(newConversation);
    setConversations([...conversations, newConversation]);
    setSelectedConversation(newConversation.id);
  };

  return (
    <div className="flex h-full">
      <ConversationsSidebar
        className="hidden border-r md:block w-80"
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversation}
        onNewConversation={handleNewConversation}
      />
      <div className="flex-1 overflow-hidden">
        {selectedConversation ? (
          <ConversationDetail
            conversation={
              conversations.find((c) => c.id === selectedConversation)!
            }
            messages={messages}
            onSendMessage={handleSendMessage}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              Select a conversation or start a new one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationsSidebar({
  conversations,
  selectedConversation,
  onSelectConversation,
  onNewConversation,
  className,
}: {
  conversations: Conversation[];
  selectedConversation: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="p-4 border-b">
        <Button
          className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground text-sm font-medium"
          onClick={onNewConversation}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Conversation
        </Button>
      </div>
      <ConversationList
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={onSelectConversation}
      />
    </div>
  );
}
