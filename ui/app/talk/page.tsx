"use client";

import SingleColumnLayout from "@/layouts/single-column";
import { Input } from "@/components/catalyst/input";
import { Button } from "@/components/catalyst/button";
import { MicrophoneIcon } from "@heroicons/react/24/outline";
import { Heading } from "@/components/catalyst/heading";
import { getAllMessages, putMessage } from "@/db/messages";
import Suggestions from "./suggestions";
import { useEffect, useState, useRef } from "react";

import type { Message } from "@/db/messages";

const metadata = {
  title: "Talk",
};

export default function TalkPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const latestMessage = messages[messages.length - 1];

  const sendMessage = async () => {
    const msg = {
      id: crypto.randomUUID(),
      text: inputValue,
      createdAt: new Date(),
    };

    await putMessage(msg);
    getAllMessages()
      .then(setMessages)
      .catch((error) => {
        console.error("Error fetching messages:", error);
      });

    playMessage(msg);
    setInputValue("");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    getAllMessages().then((msgs) => {
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    });
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
  };

  const appendInput = (text: string) => {
    setInputValue(inputValue.trim() + " " + text);
  };

  const playMessage = async (message: Message) => {
    setIsLoading(true);
    const response = await fetch("/api/speech", {
      method: "POST",
      body: JSON.stringify({ text: message.text }),
    });

    const result = await response.json();

    const audioBlob = new Blob(
      [Uint8Array.from(atob(result.audio_base64), (c) => c.charCodeAt(0))],
      { type: "audio/mp3" }
    );
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
    setIsLoading(false);
  };

  return (
    <SingleColumnLayout title={metadata.title}>
      <div className="flex flex-col h-[calc(100vh-256px)]">
        {/* Latest message card */}
        <div className="p-6 mb-4 bg-white rounded-lg shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-800 dark:ring-white/10">
          <Heading level={2} className="text-zinc-900 dark:text-white">
            {isLoading ? "Thinking..." : latestMessage?.text}
          </Heading>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className="mb-4 p-3 bg-zinc-50 rounded-lg w-full dark:bg-zinc-800"
            >
              {message.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick responses */}
        <Suggestions text={inputValue} onSuggestionClick={appendInput} />

        {/* Input area */}
        <div className="border-t bg-white dark:bg-zinc-900 p-4 flex items-center gap-2">
          <Button plain>
            <MicrophoneIcon className="size-10" />
          </Button>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Type your message..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={(e) => {
              if (e.key === "Enter" && inputValue.trim()) {
                sendMessage();
                e.preventDefault();
              }
            }}
            className="flex-1"
          />
          <Button onClick={sendMessage} color="dark/zinc">
            Send
          </Button>
        </div>
      </div>
    </SingleColumnLayout>
  );
}
