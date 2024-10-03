"use client";
import { useState, useEffect } from "react";

type Message = {
  text: string;
  sentAt: Date;
  audioBlob?: Blob;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const triggerCompletion = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      setIsLoading(true);

      fetch("/api/completion", {
        method: "POST",
        body: JSON.stringify({ text }),
      })
        .then((res) => res.json())
        .then((data) => {
          setText(data.text);
          setIsLoading(false);
        });
    }
  };

  const convertTextToSpeech = async (text: string): Promise<Blob | null> => {
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        return await response.blob();
      } else {
        console.error("Failed to convert text to speech");
        return null;
      }
    } catch (error) {
      console.error("Error calling text-to-speech API:", error);
      return null;
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
        audioBlob: audioBlob || undefined,
      };
      const newMessages = [...messages, newMessage];
      setMessages(newMessages);
      setText("");
      setIsLoading(false);

      localStorage.setItem(
        "messages.v1",
        JSON.stringify(newMessages, (key, value) => {
          if (key === "sentAt") return value.toISOString();
          return value;
        })
      );

      if (audioBlob) {
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.play();
      }
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto border border-gray-300 rounded-lg overflow-hidden">
      <header className="bg-blue-500 text-white p-4 text-center">
        Chat Interface
      </header>
      <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
        {messages.map((msg, index) => (
          <div key={index} className="p-2 my-2 bg-gray-50 rounded">
            <div>{msg.text}</div>
            <div className="text-xs text-gray-500 mt-1">
              {msg.sentAt.toLocaleString()}
            </div>
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
        <button
          type="submit"
          disabled={isLoading}
          className="ml-2 p-2 bg-blue-500 text-white rounded"
        >
          Send
        </button>
      </form>
    </div>
  );
}
