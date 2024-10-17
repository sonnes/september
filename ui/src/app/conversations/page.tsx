"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ConversationList from "@/components/ConversationList";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useRouter } from "next/navigation";

// API functions
const fetchConversations = async () => {
  const response = await fetch("/api/conversations/list");
  if (!response.ok) {
    throw new Error("Failed to fetch conversations");
  }
  return response.json();
};

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const {
    data: conversations,
    isLoading: isLoadingConversations,
    error: conversationsError,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
  });

  const handleSelectConversation = (id: string) => {
    router.push(`/conversations/${id}`);
  };

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
                    onSelectConversation={handleSelectConversation}
                    selectedConversationId={null}
                  />
                </div>
                <div className="flex-1 pl-4">
                  {/* You can add a welcome message or instructions here */}
                  <p>Select a conversation to view details</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
