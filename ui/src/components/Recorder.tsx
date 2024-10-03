import React, { useState, useRef } from "react";
import { MicrophoneIcon, StopIcon } from "./Icons";

interface RecorderProps {
  onAudioData: (audioData: Blob) => void;
  onStarted?: () => void;
  onStopped?: () => void;
  silenceThreshold?: number;
  silenceDuration?: number;
}

const Recorder: React.FC<RecorderProps> = ({
  onAudioData,
  onStarted,
  onStopped,
  silenceThreshold = -50,
  silenceDuration = 1000,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceStartRef = useRef<number | null>(null);

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
      setIsRecording(true);
      onStarted?.();

      // ... rest of the recording logic ...
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onStopped?.();

      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });
      onAudioData(audioBlob);
      audioChunksRef.current = [];
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <button
      onClick={toggleRecording}
      className="ml-2 p-2 bg-green-500 text-white rounded"
    >
      {isRecording ? <StopIcon /> : <MicrophoneIcon />}
    </button>
  );
};

export default Recorder;
