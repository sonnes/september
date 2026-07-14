'use client';

import { useMemo, useState } from 'react';

import { Play, Search } from 'lucide-react';
import { toast } from 'sonner';

import { useAccount } from '@/packages/account';
import { useAISettings } from '@/packages/ai';
import { useAudioPlayer, type Audio } from '@/packages/audio';
import { inferSetupMode } from '@/packages/onboarding';
import type { AIProvider, SpeechConfig, Voice } from '@/packages/shared';
import {
  KokoroModelCard,
  VoicesList,
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
import { Spinner } from '@/packages/ui/components/spinner';

import {
  LabeledSlider,
  MoreOptions,
  OptionField,
  PoweredByLine,
  SavedIndicator,
} from '@/components/settings/feature-section';
import { featureProviderOptions, poweredByNote } from '@/components/settings/feature-providers';
import { useAutosave } from '@/components/settings/use-autosave';

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

export default function VoiceForm() {
  const { account } = useAccount();
  const { updateSpeechConfig } = useAISettings();
  const { generateSpeech } = useSpeech();
  const { enqueue } = useAudioPlayer();
  const { status, save } = useAutosave<Partial<SpeechConfig>>(updateSpeechConfig);

  const [searchTerm, setSearchTerm] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);

  const speech = account?.ai_speech;
  const provider = (speech?.provider ?? 'browser') as SpeechEngineId;
  const apiKey = account?.ai_providers?.[provider as keyof typeof account.ai_providers]?.api_key;
  const { voices, isLoading: isLoadingVoices } = useVoiceFetching(provider, apiKey);

  const filteredVoices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return voices;
    return voices.filter(voice =>
      [voice.name, voice.gender, voice.accent, voice.description]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term))
    );
  }, [voices, searchTerm]);

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

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
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

        {isLoadingVoices ? (
          <LoadingState variant="inline" label="Loading voices..." />
        ) : filteredVoices.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            <VoicesList
              voices={filteredVoices}
              selectedVoiceId={speech?.voice_id}
              onSelectVoice={selectVoice}
            />
          </div>
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

      <MoreOptions label="More voice options">
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
                onCheckedChange={checked =>
                  save({ settings: { speaker_boost: checked === true } })
                }
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
