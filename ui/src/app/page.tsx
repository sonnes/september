"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [messages, setMessages] = useState<string[]>([]);
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

  useEffect(() => {
    const savedMessages = localStorage.getItem("messages");
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      const newMessages = [...messages, text];
      setMessages(newMessages);
      setText("");

      localStorage.setItem("messages", JSON.stringify(newMessages));
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto border border-gray-300 rounded-lg overflow-hidden">
      <header className="bg-blue-500 text-white p-4 text-center">
        Chat Interface
      </header>
      <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
        {messages.map((msg, index) => (
          <div key={index} className="p-2 my-2 bg-gray-300 rounded">
            {msg}
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
