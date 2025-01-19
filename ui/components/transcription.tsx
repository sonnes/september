"use client";

import { useState, useRef } from "react";
import { MicrophoneIcon, PauseIcon } from "@heroicons/react/24/outline";

interface TranscriptionProps {
  onTranscription: (text: string) => void;
}

export default function Transcription({ onTranscription }: TranscriptionProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioChunks, setAudioChunks] = useState<BlobPart[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        setAudioChunks((prevChunks) => [...prevChunks, event.data]);
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsListening(false);

      const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
      setAudioChunks([]);
      transcribeAudio(audioBlob);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.wav");

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const result = await response.json();

      onTranscription(result.text);
    } catch (error) {
      console.error("Transcription error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      console.log("Stopping listening");
      stopListening();
    } else {
      console.log("Starting listening");
      startListening();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggleListening}
        disabled={!isListening && isProcessing}
        className={`p-2 rounded-full ${
          !isListening && isProcessing
            ? "text-zinc-300 dark:text-zinc-600"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        {isListening ? (
          <div className="relative">
            <PauseIcon className="h-6 w-6" />
            <div className="absolute -inset-1 animate-ping rounded-full border-2 border-red-500 opacity-75" />
          </div>
        ) : (
          <MicrophoneIcon className="h-6 w-6" />
        )}
      </button>

      {isProcessing && (
        <div className="absolute -inset-1 animate-spin rounded-full border-2 border-t-transparent border-blue-500 opacity-75" />
      )}
    </div>
  );
}
