import { Button } from "@/components/catalyst/button";
import { useEffect, useState, useCallback } from "react";

interface SuggestionsProps {
  text: string;
  onSuggestionClick: (suggestion: string) => void;
}

export default function Suggestions({
  text,
  onSuggestionClick,
}: SuggestionsProps) {
  const [status, setStatus] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onInterrupt() {
    // NOTE: We do not set isRunning to false here because the worker
    // will send a 'complete' message when it is done.
    worker?.postMessage({ type: "interrupt" });
  }

  // Create a callback function for messages from the worker thread.
  const onMessageReceived = (e: MessageEvent) => {
    switch (e.data.status) {
      case "loading":
        // Model file start load: add a new progress item to the list.
        setStatus("loading");
        setLoadingMessage(e.data.data);
        break;

      case "ready":
        // Pipeline ready: the worker is ready to accept messages.
        setStatus("ready");
        break;

      case "update":
        {
          // Generation update: update the output text.
          // Parse messages
          const { output, tps, numTokens } = e.data;

          console.log(output);
        }
        break;

      case "complete":
        setStatus("");
        break;

      case "error":
        setError(e.data.data);
        break;
    }
  };

  const onErrorReceived = (e: ErrorEvent) => {
    console.error("Worker error:", e);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && !worker) {
      const newWorker = new Worker(
        new URL("../../workers/suggestions.js", import.meta.url),
        {
          type: "module",
        }
      );

      newWorker.addEventListener("message", onMessageReceived);
      newWorker.addEventListener("error", onErrorReceived);

      newWorker.postMessage({ type: "check" });
      setWorker(newWorker);

      return () => {
        newWorker.removeEventListener("message", onMessageReceived);
        newWorker.removeEventListener("error", onErrorReceived);
        newWorker.terminate();
      };
    }
  }, []);

  const getSuggestions = useCallback(
    (text: string) => {
      if (!worker) return;
      setStatus("loading");
      setError(null);
      worker.postMessage({
        type: "generate",
        data: {
          text,
        },
      });
    },
    [worker]
  );

  // Get new suggestions whenever input changes
  useEffect(() => {
    if (text.trim()) {
      getSuggestions(text);
    } else {
      setSuggestions([]);
      setStatus("ready");
    }
  }, [text, getSuggestions]);

  if (error) {
    return (
      <div className="border-t bg-red-50 dark:bg-red-900/20 p-4 text-red-600 dark:text-red-400">
        Error loading suggestions: {error}
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="border-t bg-zinc-50 dark:bg-zinc-800 p-4">
        Loading suggestions...
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="border-t bg-zinc-50 dark:bg-zinc-800">
      <div className="flex flex-wrap gap-2 p-4">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            color="white"
            onClick={() => onSuggestionClick(suggestion)}
            className="rounded-full"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
