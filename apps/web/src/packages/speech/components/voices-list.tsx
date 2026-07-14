'use client';

import { PlayIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import type { Voice } from '@/packages/shared';
import { Button } from '@/packages/ui/components/button';

interface VoicesListProps {
  voices: Voice[];
  selectedVoiceId?: string;
  onSelectVoice: (voice: Voice) => void;
}

export function VoicesList({ voices, selectedVoiceId, onSelectVoice }: VoicesListProps) {
  // Get gender style based on gender value
  const getGenderStyle = (gender?: string) => {
    if (!gender) return 'text-muted-foreground bg-muted ring-border';

    const styles: Record<string, string> = {
      male: 'text-primary bg-primary/10 ring-primary/20',
      female: 'text-primary bg-primary/10 ring-primary/20',
      neutral: 'text-primary bg-primary/10 ring-primary/20',
    };

    return styles[gender.toLowerCase()] || 'text-muted-foreground bg-muted ring-border';
  };

  return (
    <div className="w-full">
      <ul role="list" className="divide-y rounded-lg border bg-card">
        {voices.map(voice => (
          <li key={voice.id} className="flex items-center justify-between gap-x-6 px-4 py-4">
            <div className="flex min-w-0 flex-1 items-center gap-x-4">
              {voice.preview_url && (
                <button
                  onClick={() => {
                    const audio = new Audio(voice.preview_url);
                    audio.play();
                  }}
                  aria-label={`Play a sample of ${voice.name}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <PlayIcon className="size-5" />
                </button>
              )}
              <div className="min-w-0">
                <div className="flex items-start gap-x-3">
                  <p className="text-sm/6 font-semibold text-foreground">{voice.name}</p>
                  {voice.gender && (
                    <span
                      className={clsx(
                        getGenderStyle(voice.gender),
                        'mt-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset'
                      )}
                    >
                      {voice.gender}
                    </span>
                  )}
                  {voice.category === 'cloned' && (
                    <span className="mt-0.5 whitespace-nowrap rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium capitalize text-muted-foreground ring-1 ring-border ring-inset">
                      Cloned
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs/5 text-muted-foreground">
                  {voice.accent && (
                    <span className="whitespace-nowrap capitalize">
                      {voice.accent.toLowerCase()}
                    </span>
                  )}
                  {voice.age && (
                    <>
                      <svg viewBox="0 0 2 2" className="size-0.5 fill-current">
                        <circle r={1} cx={1} cy={1} />
                      </svg>
                      <span className="whitespace-nowrap capitalize">
                        {voice.age.toLowerCase()}
                      </span>
                    </>
                  )}
                  {voice.use_case && (
                    <>
                      <svg viewBox="0 0 2 2" className="size-0.5 fill-current">
                        <circle r={1} cx={1} cy={1} />
                      </svg>
                      <span className="whitespace-nowrap capitalize">
                        {voice.use_case.toLowerCase()}
                      </span>
                    </>
                  )}
                </div>
                {voice.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {voice.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-none items-center gap-x-4">
              {selectedVoiceId !== voice.id ? (
                <Button type="button" variant="outline" onClick={() => onSelectVoice(voice)}>
                  Use
                </Button>
              ) : (
                <div className="shrink-0 px-3 py-2 text-sm font-semibold text-primary">
                  Selected
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
