"use client";
import { useState, useEffect } from "react";
import { convertTextToSpeech, playAudioBlob } from "../../services/tts";
import { getSuggestions } from "../../services/completion";
import moment from "moment";
import Recorder from "../../components/Recorder";
import { v4 as uuidv4 } from "uuid";
import { PlayIcon } from "../../components/Icons";
import { Message } from "../../types/message";
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

      setMessages(
        parsedMessages.map((msg: Message) => ({
          ...msg,
          id: msg.id || uuidv4(), // Ensure all messages have an id
        }))
      );
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
        id: uuidv4(),
        text,
        sentAt: new Date(),
        authorId: "user",
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

  const handleTranscription = (msg: Message) => {
    const newMessages = [...messages, msg];
    setMessages(newMessages);

    localStorage.setItem("messages.v1", JSON.stringify(newMessages));
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto border border-gray-300 rounded-lg overflow-hidden">
      <header className="bg-blue-500 text-white p-4 text-center">
        Chat Interface
      </header>
      <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 my-2 rounded flex ${
              msg.authorId === "transcriber" ? "justify-start" : "justify-end"
            }`}
          >
            <div
              className={`max-w-1/2 ${
                msg.authorId === "transcriber" ? "bg-blue-100" : "bg-gray-50"
              } rounded p-2`}
            >
              <div>{msg.text}</div>
              <div className="text-xs text-gray-500 mt-1">
                {moment(msg.sentAt).fromNow()}
              </div>
              <button
                onClick={() => playMessage(msg)}
                className="mt-2 p-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
              >
                <PlayIcon />
              </button>
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
        {isLoading && <div className="p-2">Loading...</div>}
        {!isLoading && (
          <>
            <button
              type="submit"
              disabled={isLoading}
              className="ml-2 p-2 bg-blue-500 text-white rounded"
            >
              Send
            </button>
            <Recorder
              onTranscription={handleTranscription}
              onStarted={() => console.log("Recording started")}
              onStopped={() => console.log("Recording stopped")}
            />
          </>
        )}
      </form>
    </div>
  );
}
