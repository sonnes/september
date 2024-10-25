"use client";

import React, { useState, useEffect } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileSidebar } from "./mobile-sidebar";
import { DesktopSidebar } from "./desktop-sidebar";
import { ConversationList } from "./conversation-list";
import { ConversationDetail } from "./conversation-detail";
import { Message, Conversation } from "@/types/types";
import { storageService } from "@/services/storage";
import { v4 as uuidv4 } from "uuid";

export function ConversationsComponent() {
  const [conversations, setConversations] = useState(
    storageService.getConversations()
  );
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (selectedConversation) {
      setMessages(storageService.getMessages(selectedConversation));
    }
  }, [selectedConversation]);

  const handleSendMessage = (content: string) => {
    if (content.trim() && selectedConversation) {
      const message: Message = {
        id: uuidv4(),
        sender: "User",
        content: content,
        createdAt: new Date(),
      };
      storageService.saveMessage(selectedConversation, message);
      setMessages([...messages, message]);

      // Update the conversation's last message and updatedAt
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
    <div className="flex flex-col h-screen bg-background lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-primary text-primary-foreground">
        <h1 className="text-2xl font-bold">September</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground"
            >
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-card">
            <MobileSidebar />
          </SheetContent>
        </Sheet>
      </header>

      {/* Sidebar - hidden on mobile, visible on larger screens */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-card text-card-foreground p-4">
        <DesktopSidebar />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden bg-background">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-primary">Conversations</h2>
          <Button
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            onClick={handleNewConversation}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Conversation
          </Button>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 overflow-hidden">
          <ConversationList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={setSelectedConversation}
          />
          <ConversationDetail
            messages={messages}
            onSendMessage={handleSendMessage}
          />
        </div>
      </main>
    </div>
  );
}
