import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StopCircle, Mic } from "lucide-react";

interface VoiceRecorderProps {
  isRecording: boolean;
  recordingTime: number;
  onToggleRecording: () => void;
}

export function formatTime(time: number) {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function VoiceRecorder({
  isRecording,
  recordingTime,
  onToggleRecording,
}: VoiceRecorderProps) {
  return (
    <Card className="flex-1 overflow-hidden">
      <CardContent className="p-3 lg:p-4">
        <div className="flex flex-row lg:flex-col h-full">
          <h2 className="text-lg font-semibold mb-4">Voice Input</h2>
          <div className="flex items-center lg:flex-col justify-center flex-1 gap-4">
            <Button
              size="lg"
              variant={isRecording ? "destructive" : "secondary"}
              className="h-12 w-12 lg:h-16 lg:w-16 rounded-full"
              onClick={onToggleRecording}
            >
              {isRecording ? (
                <StopCircle className="h-6 w-6 lg:h-8 lg:w-8" />
              ) : (
                <Mic className="h-6 w-6 lg:h-8 lg:w-8" />
              )}
            </Button>
            {isRecording && (
              <span className="text-base lg:text-lg font-medium text-muted-foreground animate-pulse">
                {formatTime(recordingTime)}
              </span>
            )}
            <p className="hidden lg:block text-sm text-muted-foreground text-center">
              {isRecording
                ? "Recording... Click to stop"
                : "Click to start recording"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
