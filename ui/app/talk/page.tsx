"use client";

import SingleColumnLayout from "@/layouts/single-column";
import { Heading } from "@/components/catalyst/heading";
import { getMessagesAPI, createMessageAPI } from "@/service/messages";
import Autocomplete from "@/components/autocomplete";
import { useEffect, useState, useRef } from "react";
import SettingsMenu from "@/components/settings-menu";
import Waveform from "@/components/waveform";
import { PlayCircleIcon } from "@heroicons/react/24/outline";
import Transcription from "@/components/transcription";

import type { Message } from "@/db/messages";
import type { EditorType } from "@/components/settings-menu";
import AAC from "@/components/aac";
import CircularKeyboard from "@/components/circular/keyboard";

const metadata = {
  title: "Talk",
};

export default function TalkPage() {
  const [speakingText, setSpeakingText] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [editorType, setEditorType] = useState<EditorType>("circular");
  const [waveform, setWaveform] = useState<{
    isActive: boolean;
    analyser: AnalyserNode | null;
  }>({
    isActive: false,
    analyser: null,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sendMessage = async (text: string) => {
    const msg = {
      text,
      type: "message" as const,
    };

    createMessageAPI(msg).then((createdMessage) => {
      getMessagesAPI()
        .then((messages) => setMessages(messages))
        .catch((error) => {
          console.error("Error fetching messages:", error);
        });

      playMessage(createdMessage);
      setSpeakingText(createdMessage.text ?? "");
    });
  };

  const sendTranscription = async (text: string) => {
    const msg = {
      text: text,
      type: "transcription" as const,
    };

    await createMessageAPI(msg).then(() => {
      getMessagesAPI()
        .then((messages) => setMessages(messages))
        .catch((error) => {
          console.error("Error fetching messages:", error);
        });
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    getMessagesAPI().then((messages) => {
      setMessages(messages);
      setTimeout(scrollToBottom, 100);
    });
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const playMessage = async (message: Message) => {
    try {
      const response = await fetch("/api/speech", {
        method: "POST",
        body: JSON.stringify({ text: message.text }),
      });

      const result = await response.json();
      const audioBlob = new Blob(
        [Uint8Array.from(atob(result.audio_base64), (c) => c.charCodeAt(0))],
        { type: "audio/mp3" }
      );

      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaElementSource(
        new Audio(URL.createObjectURL(audioBlob))
      );

      source.connect(analyser);
      analyser.connect(audioContext.destination);

      setWaveform({ isActive: true, analyser });

      source.mediaElement.addEventListener("ended", () => {
        setWaveform({ isActive: false, analyser: null });
        audioContext.close();
      });

      source.mediaElement.play();
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  return (
    <SingleColumnLayout title={metadata.title} color="red">
      <div className="flex flex-col h-[calc(100vh-288px)]">
        {/* Latest message card */}
        <div className="p-6 mb-4 bg-white rounded-lg shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-800 dark:ring-white/10">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <Heading
                level={2}
                className="text-zinc-900 dark:text-white truncate"
              >
                {speakingText}
              </Heading>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <Waveform
                isActive={waveform.isActive}
                analyser={waveform.analyser}
              />
              <Transcription onTranscription={sendTranscription} />
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 p-3 bg-zinc-50 rounded-lg w-full dark:bg-zinc-800 ${
                message.type === "transcription"
                  ? "bg-red-100 dark:bg-red-900"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div>{message.text}</div>
                {message.type === "message" && (
                  <button
                    onClick={() => {
                      playMessage(message);
                      setSpeakingText(message.text ?? "");
                    }}
                    className="ml-2 p-1 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    aria-label="Play message"
                  >
                    <PlayCircleIcon className="h-6 w-6" />
                  </button>
                )}
              </div>
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
            ) : editorType === "aac" ? (
              <AAC onSubmit={sendMessage} />
            ) : editorType === "circular" ? (
              <CircularKeyboard onSubmit={sendMessage} />
            ) : null}
          </div>
          <SettingsMenu value={editorType} onChange={setEditorType} />
        </div>
      </div>
    </SingleColumnLayout>
  );
}
