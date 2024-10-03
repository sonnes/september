"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ConversationList from "@/components/ConversationList";
import ConversationDetails from "@/components/ConversationDetails";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

// API functions
const fetchConversations = async () => {
  const response = await fetch("/api/conversations/list");
  if (!response.ok) {
    throw new Error("Failed to fetch conversations");
  }
  return response.json();
};

const fetchConversationDetails = async (id: string) => {
  const response = await fetch(`/api/conversations/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch conversation details");
  }
  return response.json();
};

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  const {
    data: conversations,
    isLoading: isLoadingConversations,
    error: conversationsError,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
  });

  const {
    data: selectedConversation,
    isLoading: isLoadingConversation,
    error: conversationError,
  } = useQuery({
    queryKey: ["conversation", selectedConversationId],
    queryFn: () => fetchConversationDetails(selectedConversationId!),
    enabled: !!selectedConversationId,
  });

  return (
    <>
      <div>
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="lg:pl-20">
          <Header setSidebarOpen={setSidebarOpen} />

          <main className="py-10">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex">
                <div className="w-64 pr-4">
                  <ConversationList
                    conversations={conversations}
                    isLoading={isLoadingConversations}
                    error={conversationsError}
                    onSelectConversation={setSelectedConversationId}
                    selectedConversationId={selectedConversationId}
                  />
                </div>
                <div className="flex-1 pl-4">
                  <ConversationDetails
                    conversation={selectedConversation}
                    isLoading={isLoadingConversation}
                    error={conversationError}
                  />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
