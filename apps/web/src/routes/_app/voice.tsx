'use client';

import { useEffect, useMemo, useState } from 'react';

import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Mic, Play, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import { featureProviderOptions, poweredByNote } from '@/components/settings/feature-providers';
import {
  LabeledSlider,
  MoreOptions,
  OptionField,
  PoweredByLine,
  SavedIndicator,
} from '@/components/settings/feature-section';
import { useAutosave } from '@/components/settings/use-autosave';
import SidebarLayout from '@/components/sidebar/layout';

import { pageTitle } from '@/lib/seo';
import { useAccount } from '@/packages/account';
import { useAISettings } from '@/packages/ai';
import { type Audio, useAudioPlayer } from '@/packages/audio';
import { VoiceCloneForm } from '@/packages/cloning';
import { inferSetupMode } from '@/packages/onboarding';
import type { AIProvider, SpeechConfig, Voice } from '@/packages/shared';
import {
  KokoroModelCard,
  SpeechProvider,
  VoicesList,
  paginateVoices,
  sortClonedFirst,
  useSpeech,
  useVoiceFetching,
} from '@/packages/speech';
import { Button } from '@/packages/ui/components/button';
import { Checkbox } from '@/packages/ui/components/checkbox';
import { Input } from '@/packages/ui/components/input';
import { Label } from '@/packages/ui/components/label';
import { LoadingState } from '@/packages/ui/components/loading-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/packages/ui/components/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/packages/ui/components/sheet';
import { Spinner } from '@/packages/ui/components/spinner';

type SpeechEngineId = 'browser' | 'gemini' | 'elevenlabs' | 'kokoro';

const SPEED_RANGE: Partial<Record<SpeechEngineId, { min: number; max: number; step: number }>> = {
  browser: { min: 0.5, max: 2, step: 0.1 },
  kokoro: { min: 0.5, max: 2, step: 0.1 },
  elevenlabs: { min: 0.7, max: 1.2, step: 0.05 },
};

const GEMINI_TTS_MODELS = [
  { id: 'gemini-2.5-flash-preview-tts', name: 'Flash TTS (fast)' },
  { id: 'gemini-2.5-pro-preview-tts', name: 'Pro TTS (highest quality)' },
];

const VOICES_PER_PAGE = 5;

export const Route = createFileRoute('/_app/voice')({
  head: () => ({
    meta: [
      { title: pageTitle('Voice') },
      { name: 'description', content: 'Choose the voice that speaks for you, or clone your own.' },
    ],
  }),
  component: VoicePage,
});

function VoicePage() {
  return (
    <>
      <SidebarLayout.Header>
        <PageHeader breadcrumbs={[{ label: 'Voice' }]} />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell width="form">
          <PageTitle
            title="Voice"
            description="Choose the voice that speaks for you — or clone your own."
          />
          <SpeechProvider>
            <VoicePicker />
          </SpeechProvider>
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}

function VoicePicker() {
  const { account } = useAccount();
  const { speechConfig: speech, updateSpeechConfig } = useAISettings();
  const { generateSpeech } = useSpeech();
  const { enqueue } = useAudioPlayer();
  const { status, save } = useAutosave<Partial<SpeechConfig>>(updateSpeechConfig);

  const [searchTerm, setSearchTerm] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [page, setPage] = useState(1);
  const [cloneOpen, setCloneOpen] = useState(false);

  const provider = (speech?.provider ?? 'browser') as SpeechEngineId;
  const apiKey = account?.ai_providers?.[provider as keyof typeof account.ai_providers]?.api_key;
  const { voices, isLoading: isLoadingVoices, refetch } = useVoiceFetching(provider, apiKey);

  const filteredVoices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const matched = term
      ? voices.filter(voice =>
          [voice.name, voice.gender, voice.accent, voice.description]
            .filter(Boolean)
            .some(value => String(value).toLowerCase().includes(term))
        )
      : voices;
    return sortClonedFirst(matched);
  }, [voices, searchTerm]);

  // A new search or provider resets to the first page.
  useEffect(() => {
    setPage(1);
  }, [searchTerm, provider]);

  const pageData = paginateVoices(filteredVoices, page, VOICES_PER_PAGE);

  if (!account) {
    return <LoadingState variant="inline" label="Loading voice settings..." />;
  }

  const options = featureProviderOptions('voice', account);
  const speedRange = SPEED_RANGE[provider];

  const changeProvider = (next: AIProvider) => {
    setSearchTerm('');
    const update: Partial<SpeechConfig> = {
      provider: next as SpeechConfig['provider'],
      voice_id: '',
      voice_name: '',
      model_id: '',
    };
    // Kokoro ships a good default voice — start there instead of an empty pick.
    if (next === 'kokoro') {
      update.voice_id = 'af_heart';
      update.voice_name = 'Heart';
    }
    save(update);
  };

  const selectVoice = (voice: Voice) => {
    save({ voice_id: voice.id, voice_name: voice.name });
  };

  const preview = async () => {
    if (isPreviewing) return;
    setIsPreviewing(true);

    try {
      const track = await generateSpeech(
        `Hi! This is ${speech?.voice_name || 'your September voice'}.`
      );
      if (track) enqueue(track as Audio);
    } catch (error) {
      console.error('Error previewing voice:', error);
      toast.error('Could not play a preview.');
    } finally {
      setIsPreviewing(false);
    }
  };

  // Clones live on ElevenLabs — switch to it, select the new voice, and surface it.
  const handleCloned = async (voice: { voice_id: string; name: string }) => {
    setCloneOpen(false);
    setSearchTerm('');
    setPage(1);
    await save({
      provider: 'elevenlabs',
      voice_id: voice.voice_id,
      voice_name: voice.name,
      model_id: '',
    });
    await refetch('elevenlabs', '');
    toast.success(`"${voice.name}" is ready and now speaking for you.`);
  };

  return (
    <div className="flex flex-col gap-6">
      <PoweredByLine
        options={options}
        value={provider}
        note={poweredByNote(inferSetupMode(account))}
        onChange={changeProvider}
        status={<SavedIndicator status={status} />}
      />

      {provider === 'kokoro' && <KokoroModelCard />}

      <div className="flex items-center justify-between gap-3 rounded-surface border bg-accent/40 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {speech?.voice_name ? (
            <>
              Speaking as <span className="font-medium text-foreground">{speech.voice_name}</span>.
            </>
          ) : (
            'No voice picked yet.'
          )}
        </p>
        <Button type="button" variant="outline" onClick={preview} disabled={isPreviewing}>
          {isPreviewing ? <Spinner className="size-4" /> : <Play className="size-4" />}
          Preview
        </Button>
      </div>

      <section className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search voices by name, gender, or accent..."
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            className="pl-9"
            aria-label="Search voices"
          />
        </div>

        <Sheet open={cloneOpen} onOpenChange={setCloneOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-3 rounded-surface border border-dashed border-primary/50 bg-accent/40 px-4 py-3 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-control border bg-background text-primary">
                <Mic className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">Clone your voice</span>
                <span className="block text-xs text-muted-foreground">
                  Record or upload a few samples — we'll build a voice that sounds like you.
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary">
                <Plus className="size-4" />
                Clone
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
            <SheetHeader>
              <SheetTitle>Clone your voice</SheetTitle>
              <SheetDescription>
                Record or upload samples to create a personal voice. It appears here once it's
                ready.
              </SheetDescription>
            </SheetHeader>
            <div className="px-4">
              <VoiceCloneForm onCreated={handleCloned} />
            </div>
          </SheetContent>
        </Sheet>

        {isLoadingVoices ? (
          <LoadingState variant="inline" label="Loading voices..." />
        ) : pageData.total > 0 ? (
          <>
            <VoicesList
              voices={pageData.items}
              selectedVoiceId={speech?.voice_id}
              onSelectVoice={selectVoice}
            />
            {pageData.pageCount > 1 && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pageData.page <= 1}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
                  Page {pageData.page} of {pageData.pageCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(pageData.pageCount, p + 1))}
                  disabled={pageData.page >= pageData.pageCount}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">
            No voices found. Try a different search.
          </p>
        )}
      </section>

      {speedRange && (
        <LabeledSlider
          key={provider}
          label="Speed"
          description="How fast the voice speaks."
          defaultValue={speech?.settings?.speed ?? 1}
          min={speedRange.min}
          max={speedRange.max}
          step={speedRange.step}
          format={value => `${value.toFixed(speedRange.step < 0.1 ? 2 : 1)}x`}
          leftLabel="Slower"
          rightLabel="Faster"
          onCommit={value => save({ settings: { speed: value } })}
        />
      )}

      <MoreOptions label="More voice options" defaultOpen>
        {provider === 'browser' && (
          <>
            <LabeledSlider
              label="Pitch"
              description="Lower or raise the voice."
              defaultValue={speech?.settings?.pitch ?? 1}
              min={-20}
              max={20}
              step={1}
              format={value => String(value)}
              leftLabel="Lower"
              rightLabel="Higher"
              onCommit={value => save({ settings: { pitch: value } })}
            />
            <LabeledSlider
              label="Volume"
              defaultValue={speech?.settings?.volume ?? 1}
              min={0}
              max={1}
              step={0.1}
              format={value => `${Math.round(value * 100)}%`}
              leftLabel="Quieter"
              rightLabel="Louder"
              onCommit={value => save({ settings: { volume: value } })}
            />
          </>
        )}

        {provider === 'elevenlabs' && (
          <>
            <LabeledSlider
              label="Stability"
              description="Higher is steadier; lower is more expressive."
              defaultValue={speech?.settings?.stability ?? 0.5}
              min={0}
              max={1}
              step={0.05}
              format={value => `${Math.round(value * 100)}%`}
              onCommit={value => save({ settings: { stability: value } })}
            />
            <LabeledSlider
              label="Similarity"
              description="How closely to match the original voice."
              defaultValue={speech?.settings?.similarity ?? 0.75}
              min={0}
              max={1}
              step={0.05}
              format={value => `${Math.round(value * 100)}%`}
              onCommit={value => save({ settings: { similarity: value } })}
            />
            <LabeledSlider
              label="Style"
              description="How much the speaking style is exaggerated."
              defaultValue={speech?.settings?.style ?? 0}
              min={0}
              max={1}
              step={0.05}
              format={value => `${Math.round(value * 100)}%`}
              onCommit={value => save({ settings: { style: value } })}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="speaker-boost"
                checked={speech?.settings?.speaker_boost ?? true}
                onCheckedChange={checked => save({ settings: { speaker_boost: checked === true } })}
              />
              <Label htmlFor="speaker-boost" className="text-sm font-normal">
                Speaker boost — clearer voice, less background noise
              </Label>
            </div>
          </>
        )}

        {provider === 'gemini' && (
          <OptionField label="Speech model">
            <Select
              value={speech?.model_id || GEMINI_TTS_MODELS[0].id}
              onValueChange={value => save({ model_id: value })}
            >
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GEMINI_TTS_MODELS.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </OptionField>
        )}

        {provider === 'kokoro' && (
          <OptionField label="Pronunciation" description="English variant used to speak.">
            <Select
              value={speech?.settings?.language ?? 'en-us'}
              onValueChange={value => save({ settings: { language: value } })}
            >
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-us">English (US)</SelectItem>
                <SelectItem value="en-gb">English (UK)</SelectItem>
              </SelectContent>
            </Select>
          </OptionField>
        )}
      </MoreOptions>
    </div>
  );
}
