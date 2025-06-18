'use client';

import { useEffect, useRef, useState } from 'react';

import { usePlayer } from '@/components/context/player';

export default function Waveform() {
  const { audio } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // Handle canvas resize
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    if (!audio) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();

    const source = audioContext.createMediaElementSource(audio);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    source.mediaElement.addEventListener('ended', () => {
      setAnalyser(null);
      audioContext.close();
    });

    setAnalyser(analyser);
  }, [audio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser?.frequencyBinCount || 32;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas with transparent background
      ctx.clearRect(0, 0, width, height);

      if (analyser) {
        // Draw wave
        ctx.beginPath();
        ctx.moveTo(0, height / 2);

        analyser.getByteTimeDomainData(dataArray);

        for (let x = 0; x < width; x++) {
          const sliceWidth = width / bufferLength;
          const i = Math.floor(x / sliceWidth);
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2 + height / 4; // Adjust vertical position
          ctx.lineTo(x, y);
        }

        // Complete the wave path
        ctx.lineTo(width, height / 2);

        // Style for the wave
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)'; // Increased opacity
        ctx.stroke();

        // Fill the wave
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        // Create gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.2)'); // Increased opacity
        gradient.addColorStop(1, 'rgba(21, 128, 61, 0.1)'); // Increased opacity
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
  }, [analyser]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
