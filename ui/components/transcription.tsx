"use client";

import { useState, useRef } from "react";
import { MicrophoneIcon } from "@heroicons/react/24/outline";

interface TranscriptionProps {
  onTranscription: (text: string) => void;
}

export default function Transcription({ onTranscription }: TranscriptionProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", audioBlob);

        try {
          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Transcription failed");
          }

          const data = await response.json();
          if (data.text) {
            onTranscription(data.text);
          }
        } catch (error) {
          console.error("Transcription error:", error);
        } finally {
          setIsProcessing(false);
          // Clean up
          stream.getTracks().forEach((track) => track.stop());
          setIsListening(false);
        }
      };

      mediaRecorder.start();
      setIsListening(true);

      // Auto-stop after 10 seconds of silence
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 10000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={isProcessing}
        className={`p-2 rounded-full ${
          isListening
            ? "text-red-500"
            : isProcessing
            ? "text-zinc-300 dark:text-zinc-600"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
        aria-label={
          isProcessing
            ? "Processing audio"
            : isListening
            ? "Stop recording"
            : "Start recording"
        }
      >
        <MicrophoneIcon className="h-6 w-6" />
      </button>
      {isListening && (
        <div className="absolute -inset-1 animate-ping rounded-full border-2 border-red-500 opacity-75" />
      )}
      {isProcessing && (
        <div className="absolute -inset-1 animate-spin rounded-full border-2 border-t-transparent border-blue-500 opacity-75" />
      )}
    </div>
  );
}
