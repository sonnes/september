import React, { useState } from "react";
import { getSuggestions } from "@/services/completion";
import Recorder from "./Recorder";

interface MessageInputProps {
  onSendMessage: (text: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage }) => {
  const [text, setText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText("");
    }
  };

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

  const handleTranscription = (msg: { text: string }) => {
    onSendMessage(msg.text);
  };

  return (
    <form onSubmit={handleSubmit} className="flex p-4 border-t border-gray-300">
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
  );
};

export default MessageInput;
