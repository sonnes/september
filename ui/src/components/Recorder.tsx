import React, { useState, useRef } from "react";
import { MicrophoneIcon, StopIcon, SpinnerIcon } from "./Icons";

interface RecorderProps {
  onTranscription: (text: string) => void;
  onStarted?: () => void;
  onStopped?: () => void;
}

const Recorder: React.FC<RecorderProps> = ({
  onTranscription,
  onStarted,
  onStopped,
}) => {
  const [status, setStatus] = useState<"idle" | "recording" | "transcribing">(
    "idle"
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setStatus("recording");
      onStarted?.();
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && status === "recording") {
      mediaRecorderRef.current.stop();
      setStatus("transcribing");
      onStopped?.();

      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });
      audioChunksRef.current = [];

      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");

      try {
        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Transcription failed");
        }

        const data = await response.json();
        onTranscription(data.text);
      } catch (error) {
        console.error("Error transcribing audio:", error);
      } finally {
        setStatus("idle");
      }
    }
  };

  const toggleRecording = () => {
    if (status === "recording") {
      stopRecording();
    } else if (status === "idle") {
      startRecording();
    }
  };

  const getIcon = () => {
    switch (status) {
      case "recording":
        return <StopIcon />;
      case "transcribing":
        return <SpinnerIcon />;
      default:
        return <MicrophoneIcon />;
    }
  };

  return (
    <button
      onClick={toggleRecording}
      className={`ml-2 p-2 text-white rounded ${
        status === "recording" ? "bg-red-500" : "bg-green-500"
      }`}
      disabled={status === "transcribing"}
    >
      {getIcon()}
    </button>
  );
};

export default Recorder;
