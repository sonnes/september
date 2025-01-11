"use client";

import { useEffect, useRef } from "react";

interface WaveformProps {
  isActive: boolean;
  analyser: AnalyserNode | null;
}

export default function Waveform({ isActive, analyser }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser?.frequencyBinCount || 32;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas with white background
      ctx.fillStyle = "rgb(255, 255, 255)";
      ctx.fillRect(0, 0, width, height);

      if (isActive && analyser) {
        // Draw wave
        ctx.beginPath();
        ctx.moveTo(0, height / 2);

        analyser.getByteTimeDomainData(dataArray);

        for (let x = 0; x < width; x++) {
          const sliceWidth = width / bufferLength;
          const i = Math.floor(x / sliceWidth);
          const y = (dataArray[i] / 128.0) * (height / 2);
          ctx.lineTo(x, y);
        }

        // Complete the wave path
        ctx.lineTo(width, height / 2);

        // Style for the wave
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#22c55e"; // Green-500
        ctx.stroke();

        // Fill the wave
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        // Create gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "rgba(34, 197, 94, 0.2)"); // Green-500 with opacity
        gradient.addColorStop(1, "rgba(21, 128, 61, 0.1)"); // Green-700 with opacity
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, analyser]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className="rounded-lg bg-white dark:bg-white"
    />
  );
}
