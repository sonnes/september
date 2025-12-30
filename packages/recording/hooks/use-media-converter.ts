'use client';

import { useCallback, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { UseMediaConverterReturn } from '../types';

export function useMediaConverter(): UseMediaConverterReturn {
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const convert = useCallback(async (webmBlob: Blob): Promise<Blob> => {
    setIsConverting(true);
    setProgress(0);
    setError(null);

    try {
      // Load ffmpeg.wasm on demand
      const ffmpeg = new FFmpeg();

      // Load core from CDN
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      setProgress(20);

      // Progress listener
      ffmpeg.on('progress', ({ progress: p }) => {
        setProgress(20 + Math.floor(p * 70)); // 20-90%
      });

      // Write input file
      await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
      setProgress(90);

      // Convert to MP4
      await ffmpeg.exec([
        '-i', 'input.webm',
        '-c:v', 'libx264',      // H.264 video codec
        '-preset', 'fast',       // Balance speed/quality
        '-c:a', 'aac',          // AAC audio codec
        '-b:a', '192k',         // Audio bitrate
        'output.mp4',
      ]);

      setProgress(95);

      // Read output file
      const data = await ffmpeg.readFile('output.mp4');
      // Create a copy of the data to ensure it's compatible with Blob
      const dataArray = new Uint8Array(data instanceof ArrayBuffer ? data : data as Uint8Array);
      const mp4Blob = new Blob([dataArray], { type: 'video/mp4' });

      setProgress(100);
      setIsConverting(false);

      return mp4Blob;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Conversion failed';
      setError(errorMessage);
      setIsConverting(false);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    convert,
    isConverting,
    progress,
    error,
  };
}
