import React, { useState, useRef } from "react";
import { MicrophoneIcon, StopIcon, SpinnerIcon } from "./Icons";
import { Message } from "../types/message";
import { v4 as uuidv4 } from "uuid";
interface RecorderProps {
  onTranscription: (msg: Message) => void;
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

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === "recording") {
      mediaRecorderRef.current.stop();
      setStatus("transcribing");
      onStopped?.();

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        audioChunksRef.current = [];

        if (audioBlob.size > 0) {
          await submitTranscription(audioBlob);
        }
      };
    }
  };

  const submitTranscription = async (audioBlob: Blob) => {
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
      const msg: Message = {
        id: uuidv4(),
        text: data.text,
        sentAt: new Date(),
        authorId: "transcriber",
      };

      onTranscription(msg);
    } catch (error) {
      console.error("Error transcribing audio:", error);
    } finally {
      setStatus("idle");
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
