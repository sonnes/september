"use client";

import SingleColumnLayout from "@/layouts/single-column";
import { Heading } from "@/components/catalyst/heading";
import { getAllMessages, putMessage } from "@/db/messages";
import Autocomplete from "@/components/autocomplete";
import { useEffect, useState, useRef } from "react";
import Editor from "@/components/editor";
import { Switch } from "@/components/catalyst/switch";

import type { Message } from "@/db/messages";

const metadata = {
  title: "Talk",
};

export default function TalkPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useEditor, setUseEditor] = useState(true);

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

        {/* Input area */}
        <div className="border-t bg-white dark:bg-zinc-900 p-4">
          <div className="mb-4 flex items-center justify-end gap-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Quick suggestions
            </span>
            <Switch
              checked={useEditor}
              onChange={setUseEditor}
              className="relative inline-flex h-6 w-11 items-center rounded-full"
            />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Inline suggestions
            </span>
          </div>

          {useEditor ? (
            <Editor
              onSubmit={(text) => {
                const msg = {
                  id: crypto.randomUUID(),
                  text: text,
                  createdAt: new Date(),
                };
                putMessage(msg);
                getAllMessages()
                  .then(setMessages)
                  .catch((error) => {
                    console.error("Error fetching messages:", error);
                  });
                playMessage(msg);
              }}
              history={messages}
              placeholder="Type your message..."
            />
          ) : (
            <Autocomplete
              value={inputValue}
              onChange={setInputValue}
              onSubmit={sendMessage}
              history={messages}
              placeholder="Type your message..."
            />
          )}
        </div>
      </div>
    </SingleColumnLayout>
  );
}
