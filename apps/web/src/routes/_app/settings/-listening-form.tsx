'use client';

import { useAccount } from '@/packages/account';
import { getModelsForProvider, useAISettings } from '@/packages/ai';
import { inferSetupMode } from '@/packages/onboarding';
import type { AIProvider, TranscriptionConfig } from '@/packages/shared';
import { Checkbox } from '@/packages/ui/components/checkbox';
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
  FeatureToggleRow,
  MoreOptions,
  OptionField,
  PoweredByLine,
  SavedIndicator,
} from '@/components/settings/feature-section';
import {
  defaultModelFor,
  featureProviderOptions,
  poweredByNote,
} from '@/components/settings/feature-providers';
import { useAutosave } from '@/components/settings/use-autosave';

const LANGUAGES = [
  { id: 'en-US', name: 'English (US)' },
  { id: 'en-GB', name: 'English (UK)' },
  { id: 'es-ES', name: 'Spanish' },
  { id: 'fr-FR', name: 'French' },
  { id: 'de-DE', name: 'German' },
];

export default function ListeningForm() {
  const { account } = useAccount();
  const { updateTranscriptionConfig } = useAISettings();
  const { status, save } = useAutosave<Partial<TranscriptionConfig>>(updateTranscriptionConfig);

  if (!account) {
    return <LoadingState variant="inline" label="Loading listening settings..." />;
  }

  const config = account.ai_transcription;
  const provider = (config?.provider ?? 'gemini') as AIProvider;
  const options = featureProviderOptions('listening', account);
  const providerConnected = options.find(option => option.id === provider)?.connected ?? false;
  const models = getModelsForProvider(provider);

  const changeProvider = (next: AIProvider) => {
    save({
      provider: next as TranscriptionConfig['provider'],
      model: defaultModelFor(next),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="border-y">
        <FeatureToggleRow
          titleOn="Listening is on"
          titleOff="Listening is off"
          description={
            providerConnected
              ? 'Turn on to write down conversation around you.'
              : 'Needs a connected service first — pick one below or finish in Setup.'
          }
          checked={config?.enabled ?? false}
          disabled={!providerConnected}
          onChange={enabled => save({ enabled })}
        />
      </div>

      <PoweredByLine
        options={options}
        value={provider}
        note={poweredByNote(inferSetupMode(account))}
        onChange={changeProvider}
        status={<SavedIndicator status={status} />}
      />

      <OptionField label="Language" description="The main language spoken around you.">
        <Select
          value={config?.settings?.language ?? 'en-US'}
          onValueChange={value => save({ settings: { language: value } })}
        >
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map(language => (
              <SelectItem key={language.id} value={language.id}>
                {language.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </OptionField>

      <MoreOptions label="More listening options">
        {models.length > 0 && (
          <OptionField label="Model">
            <Select value={config?.model ?? ''} onValueChange={value => save({ model: value })}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="Choose a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </OptionField>
        )}

        <div className="flex items-center gap-2">
          <Checkbox
            id="detect-language"
            checked={config?.settings?.detect_language ?? true}
            onCheckedChange={checked => save({ settings: { detect_language: checked === true } })}
          />
          <Label htmlFor="detect-language" className="text-sm font-normal">
            Detect the language automatically
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="include-timestamps"
            checked={config?.settings?.include_timestamps ?? false}
            onCheckedChange={checked =>
              save({ settings: { include_timestamps: checked === true } })
            }
          />
          <Label htmlFor="include-timestamps" className="text-sm font-normal">
            Add timestamps to what is written down
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="filter-profanity"
            checked={config?.settings?.filter_profanity ?? false}
            onCheckedChange={checked => save({ settings: { filter_profanity: checked === true } })}
          />
          <Label htmlFor="filter-profanity" className="text-sm font-normal">
            Mask swear words
          </Label>
        </div>
      </MoreOptions>
    </div>
  );
}
