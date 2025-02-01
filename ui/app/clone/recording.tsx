"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/catalyst/button";
import { MicrophoneIcon, StopIcon } from "@heroicons/react/24/outline";
import { Field, Label } from "@/components/catalyst/fieldset";

export const SAMPLE_TEXTS = [
  "The quick brown fox jumps over the lazy dog",
  "She sells seashells by the seashore",
  "How much wood would a woodchuck chuck if a woodchuck could chuck wood",
  "Peter Piper picked a peck of pickled peppers",
];

interface RecordingSectionProps {
  onRecordingsChange: (recordings: Record<string, Blob>) => void;
}

export function RecordingSection({
  onRecordingsChange,
}: RecordingSectionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<Record<string, Blob>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = async (textId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setRecordings((prev) => {
          const newRecordings = {
            ...prev,
            [textId]: blob,
          };
          onRecordingsChange(newRecordings);
          return newRecordings;
        });
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingId(textId);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setRecordingId(null);
  };

  return (
    <Field>
      <Label>Sample Recordings</Label>
      <div className="space-y-4 mt-2">
        {SAMPLE_TEXTS.map((text, index) => (
          <div
            key={index}
            className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg shadow-sm flex items-center justify-between"
          >
            <div className="flex-1 mr-4">
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                Sample {index + 1}
              </p>
              <p className="text-sm text-zinc-500">{text}</p>
              {recordings[`text-${index}`] && (
                <p className="text-xs text-green-600 mt-1">✓ Recorded</p>
              )}
            </div>
            <Button
              outline
              type="button"
              onClick={() =>
                isRecording && recordingId === `text-${index}`
                  ? stopRecording()
                  : startRecording(`text-${index}`)
              }
            >
              {isRecording && recordingId === `text-${index}` ? (
                <StopIcon className="h-5 w-5" />
              ) : (
                <MicrophoneIcon className="h-5 w-5" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </Field>
  );
}
