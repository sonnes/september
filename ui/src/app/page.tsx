"use client";
import { useState, useEffect } from "react";
import { convertTextToSpeech, playAudioBlob } from "./services/tts";
import { getSuggestions } from "./services/completion";
import moment from "moment";

type Message = {
  text: string;
  sentAt: Date;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const triggerCompletion = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      setIsLoading(true);

      getSuggestions(text).then((suggestions) => {
        if (suggestions.length > 0) {
          setText(suggestions[0]);
        }
        setIsLoading(false);
      });
    }
  };

  const loadMessages = async () => {
    const savedMessages = localStorage.getItem("messages.v1");
    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages, (key, value) => {
        if (key === "sentAt") return new Date(value);
        return value;
      });

      setMessages(parsedMessages);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      setIsLoading(true);
      const audioBlob = await convertTextToSpeech(text);

      const newMessage: Message = {
        text,
        sentAt: new Date(),
      };
      const newMessages = [...messages, newMessage];
      setMessages(newMessages);
      setText("");
      setIsLoading(false);

      localStorage.setItem("messages.v1", JSON.stringify(newMessages));

      if (audioBlob) {
        playAudioBlob(audioBlob);
      }
    }
  };

  const playMessage = async (message: Message) => {
    const audioBlob = await convertTextToSpeech(message.text);
    if (audioBlob) {
      playAudioBlob(audioBlob);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto border border-gray-300 rounded-lg overflow-hidden">
      <header className="bg-blue-500 text-white p-4 text-center">
        Chat Interface
      </header>
      <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
        {messages.map((msg, index) => (
          <div
            key={index}
            className="p-2 my-2 bg-gray-50 rounded flex justify-between items-start"
          >
            <div className="flex-1">
              <div>{msg.text}</div>
              <div className="text-xs text-gray-500 mt-1">
                {moment(msg.sentAt).fromNow()}
              </div>
            </div>
            <button
              onClick={() => playMessage(msg)}
              className="ml-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="flex p-4 border-t border-gray-300">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={triggerCompletion}
          className="flex-1 p-2 border border-gray-300 rounded"
        />
        {isLoading && <div className="p-2">Loading...</div>}
        {!isLoading && (
          <button
            type="submit"
            disabled={isLoading}
            className="ml-2 p-2 bg-blue-500 text-white rounded"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
