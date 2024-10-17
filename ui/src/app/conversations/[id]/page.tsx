"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ConversationList from "@/components/ConversationList";
import ConversationDetails from "@/components/ConversationDetails";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import MessageInput from "@/components/MessageInput";
import { useParams, useRouter } from "next/navigation";
import { Message } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { convertTextToSpeech, playAudioBlob } from "@/services/tts";

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

const addMessageToConversation = async (
  conversationId: string,
  message: Message
) => {
  const response = await fetch(
    `/api/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }
  );
  if (!response.ok) {
    throw new Error("Failed to add message to conversation");
  }
  return response.json();
};

export default function ConversationPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const conversationId = params.id as string;

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
    queryKey: ["conversation", conversationId],
    queryFn: () => fetchConversationDetails(conversationId),
    enabled: !!conversationId,
  });

  const addMessageMutation = useMutation({
    mutationFn: (message: Message) =>
      addMessageToConversation(conversationId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversation", conversationId],
      });
    },
  });

  const handleSelectConversation = (id: string) => {
    router.push(`/conversations/${id}`);
  };

  const handleSendMessage = async (text: string) => {
    const newMessage: Message = {
      id: uuidv4(),
      text,
      sentAt: new Date(),
      authorId: "user",
    };

    addMessageMutation.mutate(newMessage);

    const audioBlob = await convertTextToSpeech(text);
    if (audioBlob) {
      playAudioBlob(audioBlob);
    }
  };

  const handlePlayMessage = async (message: Message) => {
    const audioBlob = await convertTextToSpeech(message.text);
    if (audioBlob) {
      playAudioBlob(audioBlob);
    }
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
                    selectedConversationId={conversationId}
                  />
                </div>
                <div className="flex-1 pl-4">
                  <ConversationDetails
                    conversation={selectedConversation}
                    isLoading={isLoadingConversation}
                    error={conversationError}
                    onPlayMessage={handlePlayMessage}
                  />
                  <MessageInput onSendMessage={handleSendMessage} />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
