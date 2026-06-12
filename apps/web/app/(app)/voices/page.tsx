'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { useAccount } from '@september/account';
import { CloningProvider, useVoiceStorageContext } from '@september/cloning';
import { ElevenLabsVoiceClone, SimilarVoice } from '@september/cloning/lib/elevenlabs-clone';
import { Button } from '@september/ui/components/button';
import { Callout } from '@september/ui/components/callout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@september/ui/components/card';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

function SimilarVoicesContent() {
  const searchParams = useSearchParams();
  const isSimilarSearch = searchParams.get('search') === 'similar';

  const { account } = useAccount();
  const { getVoiceSamples, downloadVoiceSample } = useVoiceStorageContext();

  const [results, setResults] = useState<SimilarVoice[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSamples, setHasSamples] = useState<boolean | null>(null);

  const elevenlabsApiKey = useMemo(
    () => account?.ai_providers?.elevenlabs?.api_key,
    [account]
  );

  useEffect(() => {
    if (!isSimilarSearch) return;
    getVoiceSamples().then(samples => setHasSamples(samples.length > 0));
  }, [isSimilarSearch, getVoiceSamples]);

  const handleSearch = useCallback(async () => {
    if (!elevenlabsApiKey) return;

    setIsSearching(true);
    setError(null);

    try {
      const samples = await getVoiceSamples();

      if (samples.length === 0) {
        setError('No voice samples found. Record or upload samples on the Clone page first.');
        return;
      }

      const files = await Promise.all(
        samples.map(async sample => {
          const blob = await downloadVoiceSample(sample.id);
          const parts = sample.id.split('/');
          const filename = parts[parts.length - 1] || `sample-${sample.id}.webm`;
          return new File([blob], filename, { type: blob.type || 'audio/webm' });
        })
      );

      const cloneService = new ElevenLabsVoiceClone(elevenlabsApiKey);
      const voices = await cloneService.findSimilarVoices(files);
      setResults(voices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find similar voices');
    } finally {
      setIsSearching(false);
    }
  }, [elevenlabsApiKey, getVoiceSamples, downloadVoiceSample]);

  const didAutoSearch = useRef(false);
  useEffect(() => {
    if (isSimilarSearch && elevenlabsApiKey && hasSamples && !didAutoSearch.current) {
      didAutoSearch.current = true;
      handleSearch();
    }
  }, [isSimilarSearch, elevenlabsApiKey, hasSamples, handleSearch]);

  if (!isSimilarSearch) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Find similar voices</CardTitle>
          <CardDescription>
            Find ElevenLabs library voices that sound closest to yours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/voices?search=similar">Find similar voices</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!elevenlabsApiKey && (
        <Callout tone="warning" title="API key required">
          Configure your ElevenLabs API key in{' '}
          <a href="/settings/providers">AI Providers</a> to search for similar voices.
        </Callout>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Find similar voices</CardTitle>
          <CardDescription>
            ElevenLabs library voices that sound closest to your recorded samples.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasSamples === false && (
            <p className="text-sm text-muted-foreground">
              No voice samples found.{' '}
              <a href="/clone" className="underline">
                Record or upload samples
              </a>{' '}
              on the Clone page first.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleSearch}
            disabled={isSearching || !elevenlabsApiKey || hasSamples === false}
          >
            {isSearching ? 'Searching...' : 'Search again'}
          </Button>

          {results.length > 0 && (
            <ul className="mt-4 divide-y">
              {results.map(voice => (
                <li key={voice.voice_id} className="space-y-1 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{voice.name}</p>
                      {voice.description && (
                        <p className="text-xs text-muted-foreground">{voice.description}</p>
                      )}
                      {voice.similarity_score !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Similarity: {Math.round(voice.similarity_score * 100)}%
                        </p>
                      )}
                    </div>
                    {voice.preview_url && (
                      <audio
                        controls
                        src={voice.preview_url}
                        className="h-8 w-48 shrink-0"
                        aria-label={`Preview ${voice.name}`}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!isSearching && results.length === 0 && hasSamples && !error && (
            <p className="text-sm text-muted-foreground">
              No similar voices found. Try adding more samples for a better match.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VoicesPage() {
  return (
    <>
      <SidebarLayout.Header>
        <PageHeader breadcrumbs={[{ label: 'Voices' }]} />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell width="form">
          <PageTitle
            title="Voices"
            description="Browse and match ElevenLabs library voices to your recorded samples."
          />
          <CloningProvider>
            <SimilarVoicesContent />
          </CloningProvider>
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}
