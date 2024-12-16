"use client";

import SingleColumnLayout from "@/layouts/single-column";
import { Input } from "@/components/catalyst/input";
import { Button } from "@/components/catalyst/button";
import { Text } from "@/components/catalyst/text";
import { useState } from "react";
import { MicrophoneIcon } from "@heroicons/react/24/outline";
import { Heading } from "@/components/catalyst/heading";

const metadata = {
  title: "AAC",
};

export default function AACPage() {
  const [messages, setMessages] = useState<string[]>([
    "How are you feeling today?",
    "I want to",
  ]);
  const [inputValue, setInputValue] = useState("");

  const quickResponses = [
    "talk about my day",
    "go for a walk",
    "rest a bit",
    "watch a movie",
  ];

  const latestMessage = messages[messages.length - 1];

  return (
    <SingleColumnLayout title={metadata.title}>
      <div className="flex flex-col h-[calc(100vh-320px)]">
        {/* Latest message card */}
        <div className="p-6 mb-4 bg-white rounded-lg shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-800 dark:ring-white/10">
          <Heading level={2} className="text-zinc-900 dark:text-white">
            {latestMessage}
          </Heading>
        </div>

        {/* Messages area */}
        <div className="grid grid-cols-1overflow-y-auto p-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className="mb-4 p-3 bg-zinc-50 rounded-lg inline-block dark:bg-zinc-800"
            >
              {message}
            </div>
          ))}
        </div>

        {/* Quick responses */}
        <div className="p-4 border-t bg-zinc-50 dark:bg-zinc-800">
          <div className="flex flex-wrap gap-2 mb-2">
            {quickResponses.map((response, index) => (
              <Button
                key={index}
                color="white"
                onClick={() => setMessages([...messages, response])}
                className="rounded-full"
              >
                {response}
              </Button>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="p-4 border-t flex items-center gap-2">
          <Button plain>
            <MicrophoneIcon className="size-8" />
          </Button>
          <Input
            type="text"
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && inputValue.trim()) {
                setMessages([...messages, inputValue]);
                setInputValue("");
              }
            }}
          />
          <div className="flex items-center gap-1 text-sm bg-zinc-800 text-white px-2 py-1 rounded dark:bg-zinc-700">
            <Button>Send</Button>
          </div>
        </div>
      </div>
    </SingleColumnLayout>
  );
}
