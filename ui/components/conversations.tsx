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
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar
          conversations={conversations}
          onNewConversation={handleNewConversation}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">
                      Toggle conversations sidebar
                    </span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <ConversationsSidebar
                    conversations={conversations}
                    selectedConversation={selectedConversation}
                    onSelectConversation={setSelectedConversation}
                    onNewConversation={handleNewConversation}
                  />
                </SheetContent>
              </Sheet>
              <Separator orientation="vertical" className="h-6" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#" className="text-sm font-medium">
                      All Conversations
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-sm font-medium">
                      Current Conversation
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 overflow-hidden">
            <ConversationsSidebar
              className="hidden border-r md:block w-80"
              conversations={conversations}
              selectedConversation={selectedConversation}
              onSelectConversation={setSelectedConversation}
              onNewConversation={handleNewConversation}
            />
            <main className="flex-1 overflow-hidden">
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
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppSidebar({
  conversations,
  onNewConversation,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  conversations: Conversation[];
  onNewConversation: () => void;
}) {
  const iconMap = {
    ChatBubbleLeftRightIcon,
    BookOpenIcon,
    MicrophoneIcon,
  };

  return (
    <Sidebar collapsible="icon" className="hidden border-r md:flex" {...props}>
      <SidebarHeader>
        <h1 className="text-xl font-semibold p-4">September</h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navigationData.items.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  tooltip={{
                    children: item.name,
                    hidden: false,
                  }}
                  className="px-2.5 md:px-2"
                  asChild
                >
                  <a href={item.href}>
                    {Icon && <Icon className="h-5 w-5 mr-2" />}
                    <span>{item.name}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: "User Name",
            email: "user@example.com",
            avatar: "/path/to/avatar.jpg",
          }}
        />
      </SidebarFooter>
    </Sidebar>
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
