'use client';

import { CheckCircle2 } from 'lucide-react';

import { preloadKokoro } from '@/packages/speech/lib/providers/kokoro-runtime';
import { Button } from '@/packages/ui/components/button';
import { Progress } from '@/packages/ui/components/progress';
import { Spinner } from '@/packages/ui/components/spinner';

import { useKokoroModelStatus } from '../hooks/use-kokoro-model-status';

/**
 * Kokoro model card for the speech settings: shows download/load status and
 * lets the user fetch the model ahead of the first utterance.
 */
export function KokoroModelCard() {
  const status = useKokoroModelStatus();

  return (
    <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-200">
      <p className="text-sm font-medium text-zinc-900">Kokoro 82M v1.0</p>
      <p className="text-xs text-zinc-600 mt-1">
        High-quality English TTS with 28 voices (US &amp; UK)
      </p>
      <p className="text-xs text-zinc-500 mt-2">
        Downloads once and runs entirely on this device — your words never leave the browser.
      </p>

      <div className="mt-3">
        {status.state === 'idle' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              preloadKokoro().catch(() => {
                // Failure is surfaced through the status store.
              });
            }}
          >
            Download voice model
          </Button>
        )}

        {status.state === 'loading' && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <Spinner className="h-3.5 w-3.5" />
              <span>
                {status.progress > 0
                  ? `Downloading voice model… ${Math.round(status.progress * 100)}%`
                  : 'Preparing voice model…'}
              </span>
            </div>
            <Progress value={Math.round(status.progress * 100)} />
          </div>
        )}

        {status.state === 'ready' && (
          <div className="flex items-center gap-2 text-xs font-medium text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>Ready — running on {status.device === 'webgpu' ? 'GPU' : 'CPU'}</span>
          </div>
        )}

        {status.state === 'error' && (
          <div className="space-y-1.5">
            <p className="text-xs text-red-600">Could not load the voice model: {status.message}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                preloadKokoro().catch(() => {});
              }}
            >
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
