"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { AutocompleteTextarea } from "@/components/ui/autocomplete-textarea";
import { useAutocomplete } from "@/hooks/use-autocomplete";
import { VoiceRecorder } from "@/components/aac/recorder";
import { CommunicationHistory } from "@/components/aac/history";
import { CommunicationButtons } from "@/components/aac/buttons";

function useTypewriter(text: string, speed: number = 50) {
  const [displayText, setDisplayText] = React.useState("");

  React.useEffect(() => {
    let i = 0;
    setDisplayText("");
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayText((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return displayText;
}

export function AACComponent() {
  const [message, setMessage] = React.useState("");
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const [history, setHistory] = React.useState<
    Array<{ type: "voice" | "text"; text: string; time: string }>
  >([
    { type: "voice", text: "I need help", time: "10:30 AM" },
    { type: "text", text: "Please and Thank you", time: "10:28 AM" },
    { type: "voice", text: "Yes, I want that", time: "10:25 AM" },
  ]);
  const [inputText, setInputText] = React.useState("");
  const {
    suggestions,
    selectedIndex,
    getSuggestions,
    selectSuggestion,
    acceptFirstWord,
    clearSuggestions,
  } = useAutocomplete();

  const displayText = useTypewriter(message);

  const addToMessage = (text: string) => {
    setMessage((prev) => (prev ? `${prev} ${text}` : text));
    setHistory((prev) => [
      {
        type: "text",
        text,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...prev,
    ]);
  };

  const handleSubmit = () => {
    if (inputText.trim()) {
      addToMessage(inputText.trim());
      setInputText("");
      clearSuggestions();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectSuggestion((selectedIndex + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectSuggestion(
          selectedIndex - 1 < 0 ? suggestions.length - 1 : selectedIndex - 1
        );
      } else if (e.key === "Tab") {
        e.preventDefault();
        const newText = acceptFirstWord(
          suggestions[selectedIndex],
          e.currentTarget.value
        );
        setInputText(newText);
        clearSuggestions();
      }
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setRecordingTime(0);
      const timer = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3 lg:px-6">
        <h1 className="text-xl lg:text-2xl font-semibold">
          AAC Communication Board
        </h1>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Settings</SheetTitle>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Message Card - Takes up full width on mobile, 2/3 on desktop */}
            <Card className="flex-1 lg:flex-[2] overflow-hidden">
              <CardContent className="p-3 lg:p-4">
                <div className="flex flex-col gap-4">
                  <div
                    className="min-h-[80px] lg:min-h-[100px] text-xl lg:text-2xl font-medium leading-relaxed p-3 bg-primary/10 rounded-md"
                    aria-live="polite"
                  >
                    {displayText || "Your message will appear here"}
                  </div>
                  <div className="flex gap-2">
                    <AutocompleteTextarea
                      value={inputText}
                      onChange={(e) => {
                        setInputText(e.target.value);
                        getSuggestions(e.target.value, []);
                      }}
                      onKeyDown={handleKeyDown}
                      onSubmit={handleSubmit}
                      placeholder="Type your message..."
                      className="flex-1"
                    />
                    <Button onClick={handleSubmit}>Send</Button>
                  </div>
                  {suggestions.length > 0 && (
                    <div className="border rounded-md p-2">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={suggestion}
                          className={cn(
                            "p-2 cursor-pointer rounded",
                            index === selectedIndex && "bg-primary/10"
                          )}
                          onClick={() => {
                            setInputText(suggestion);
                            clearSuggestions();
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Voice Recorder Card */}
            <VoiceRecorder
              isRecording={isRecording}
              recordingTime={recordingTime}
              onToggleRecording={toggleRecording}
            />
          </div>

          <CommunicationButtons onMessageAdd={addToMessage} />
        </div>
      </div>

      <CommunicationHistory history={history} onClearHistory={clearHistory} />
    </div>
  );
}
