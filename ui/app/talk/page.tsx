"use client";

import SingleColumnLayout from "@/layouts/single-column";
import { Heading } from "@/components/catalyst/heading";
import { getAllMessages, putMessage } from "@/db/messages";
import Autocomplete from "@/components/autocomplete";
import { useEffect, useState, useRef } from "react";
import SettingsMenu from "@/components/settings-menu";

import type { Message } from "@/db/messages";
import type { EditorType } from "@/components/settings-menu";

const metadata = {
  title: "Talk",
};

export default function TalkPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [editorType, setEditorType] = useState<EditorType>("autocomplete");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const latestMessage = messages[messages.length - 1];

  const sendMessage = async (text: string) => {
    const msg = {
      id: crypto.randomUUID(),
      text,
      createdAt: new Date(),
    };

    await putMessage(msg);
    getAllMessages()
      .then(setMessages)
      .catch((error) => {
        console.error("Error fetching messages:", error);
      });

    playMessage(msg);
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

  const playMessage = async (message: Message) => {
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
  };

  return (
    <SingleColumnLayout title={metadata.title}>
      <div className="flex flex-col h-[calc(100vh-288px)]">
        {/* Latest message card */}
        <div className="p-6 mb-4 bg-white rounded-lg shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-800 dark:ring-white/10">
          <Heading level={2} className="text-zinc-900 dark:text-white">
            {latestMessage?.text}
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
          <div className="flex-1">
            {editorType === "autocomplete" ? (
              <Autocomplete
                onSubmit={sendMessage}
                history={messages}
                placeholder="Type your message..."
              />
            ) : null}
          </div>
          <SettingsMenu value={editorType} onChange={setEditorType} />
        </div>
      </div>
    </SingleColumnLayout>
  );
}
