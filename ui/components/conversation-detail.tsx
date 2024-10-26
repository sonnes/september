import React, { useState, useRef, useEffect } from "react";
import {
  Cog6ToothIcon,
  PaperAirplaneIcon,
  PlayIcon,
  MicrophoneIcon,
} from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Conversation, Message } from "@/types/types";
import { Textarea } from "@/components/ui/textarea";
import moment from "moment";
import { useToast } from "@/hooks/use-toast";

export interface ConversationDetailProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (message: string) => void;
}

export function ConversationDetail({
  conversation,
  messages,
  onSendMessage,
}: ConversationDetailProps) {
  const [inputText, setInputText] = useState("");
  const [transcription, setTranscription] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const [voiceSettings, setVoiceSettings] = useState({
    voice: "Default",
    speed: 1,
    pitch: 1,
  });

  useEffect(() => {
    let index = -1;
    const intervalId = setInterval(() => {
      if (index < transcription.length) {
        setDisplayedText((prev) => prev + transcription[index]);
        index++;
      } else {
        clearInterval(intervalId);
      }
    }, 50);

    return () => clearInterval(intervalId);
  }, [transcription]);

  const generateSpeech = async (text: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate speech");
      }

      const result = await response.json();
      const audioBlob = new Blob(
        [Uint8Array.from(atob(result.audio_base64), (c) => c.charCodeAt(0))],
        { type: "audio/mp3" }
      );
      const audioUrl = URL.createObjectURL(audioBlob);

      setTranscription(text);
      setDisplayedText("");
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }

      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate speech. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (inputText.trim()) {
      const success = await generateSpeech(inputText);
      if (success) {
        onSendMessage(inputText);
        setInputText("");
      }
    }
  };

  const handlePlayMessage = async (messageContent: string) => {
    await generateSpeech(messageContent);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Conversation header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src="/placeholder-avatar.jpg"
              alt={conversation.name}
            />
            <AvatarFallback>{conversation.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <h3 className="text-lg font-semibold">{conversation.name}</h3>
            <p className="text-sm text-muted-foreground">
              {conversation.lastMessage || "No messages yet"}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Cog6ToothIcon className="h-4 w-4" />
              <span className="sr-only">Open voice settings</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Voice Settings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <label className="flex items-center justify-between w-full">
                Voice:
                <select
                  value={voiceSettings.voice}
                  onChange={(e) =>
                    setVoiceSettings({
                      ...voiceSettings,
                      voice: e.target.value,
                    })
                  }
                  className="ml-2 p-1 border rounded"
                >
                  <option>Default</option>
                  <option>Voice 1</option>
                  <option>Voice 2</option>
                </select>
              </label>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <label className="flex items-center justify-between w-full">
                Speed:
                <Slider
                  value={[voiceSettings.speed]}
                  onValueChange={([speed]) =>
                    setVoiceSettings({ ...voiceSettings, speed })
                  }
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="w-32 ml-2"
                />
              </label>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <label className="flex items-center justify-between w-full">
                Pitch:
                <Slider
                  value={[voiceSettings.pitch]}
                  onValueChange={([pitch]) =>
                    setVoiceSettings({ ...voiceSettings, pitch })
                  }
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="w-32 ml-2"
                />
              </label>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "User" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] bg-primary text-primary-foreground rounded-lg p-3 flex items-center`}
            >
              <div className="flex-grow">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{message.sender}</span>
                  <span className="text-xs opacity-70">
                    {moment(message.createdAt).fromNow()}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 text-primary-foreground/80 hover:text-primary-foreground self-center"
                onClick={() => handlePlayMessage(message.content)}
              >
                <PlayIcon className="h-4 w-4" />
                <span className="sr-only">Play</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Transcription */}
      <Card className="mx-4 mb-4">
        <CardContent className="p-4 flex items-center">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 mr-4"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            ) : (
              <MicrophoneIcon className="h-6 w-6" />
            )}
            <span className="sr-only">Voice input</span>
          </Button>
          <div className="flex-1">
            <h4 className="text-sm font-semibold mb-1 text-primary">
              Transcription
            </h4>
            <p className="text-sm text-muted-foreground">
              {displayedText || "No active transcription"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Input area */}
      <div className="p-4 border-t border-border">
        <div className="flex flex-col space-y-2">
          <Textarea
            placeholder="Type your message..."
            value={inputText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setInputText(e.target.value)
            }
            onKeyPress={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="min-h-[100px] resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSendMessage}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
              ) : (
                <PaperAirplaneIcon className="h-4 w-4 mr-2" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
