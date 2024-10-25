"use client";

import React, { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileSidebar } from "./mobile-sidebar";
import { DesktopSidebar } from "./desktop-sidebar";
import { ConversationList } from "./conversation-list";
import { ConversationDetail } from "./conversation-detail";
import { Message } from "@/types/types";

export function ConversationsComponent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "User",
      content: "Hello, how are you?",
      timestamp: "10:00 AM",
    },
    {
      id: 2,
      sender: "Assistant",
      content: "I'm doing well, thank you! How can I assist you today?",
      timestamp: "10:01 AM",
    },
    {
      id: 3,
      sender: "User",
      content: "Can you help me with my schedule?",
      timestamp: "10:02 AM",
    },
  ]);

  const handleSendMessage = (newMessage: string) => {
    if (newMessage.trim()) {
      const message: Message = {
        id: messages.length + 1,
        sender: "User",
        content: newMessage,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages([...messages, message]);
    }
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
          <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
            <PlusIcon className="h-5 w-5 mr-2" />
            New Conversation
          </Button>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 overflow-hidden">
          {/* Left column: Conversation list */}
          <ConversationList />

          {/* Right column: Conversation details */}
          <ConversationDetail
            messages={messages}
            onSendMessage={handleSendMessage}
          />
        </div>
      </main>
    </div>
  );
}
