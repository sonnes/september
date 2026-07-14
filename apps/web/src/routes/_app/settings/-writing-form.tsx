'use client';

import { useRef } from 'react';

import { useAccount } from '@/packages/account';
import { getModelsForProvider, useAISettings } from '@/packages/ai';
import { TiptapEditor } from '@/packages/editor';
import { inferSetupMode } from '@/packages/onboarding';
import type { AIProvider, SuggestionsConfig } from '@/packages/shared';
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
  LabeledSlider,
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

export default function WritingForm() {
  const { account, updateAccount } = useAccount();
  const { updateSuggestionsConfig } = useAISettings();
  const { status, save } = useAutosave<Partial<SuggestionsConfig>>(updateSuggestionsConfig);
  const contextDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!account) {
    return <LoadingState variant="inline" label="Loading writing settings..." />;
  }

  const config = account.ai_suggestions;
  const provider = (config?.provider ?? 'gemini') as AIProvider;
  const options = featureProviderOptions('writing', account);
  const providerConnected = options.find(option => option.id === provider)?.connected ?? false;
  const models = getModelsForProvider(provider);

  const changeProvider = (next: AIProvider) => {
    save({
      provider: next as SuggestionsConfig['provider'],
      model: defaultModelFor(next),
    });
  };

  const saveContext = (markdown: string) => {
    if (contextDebounceRef.current) clearTimeout(contextDebounceRef.current);
    contextDebounceRef.current = setTimeout(() => {
      void updateAccount({ context: markdown });
    }, 500);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="border-y">
        <FeatureToggleRow
          titleOn="Writing help is on"
          titleOff="Writing help is off"
          description={
            providerConnected
              ? 'Suggestions appear under the text box as you type.'
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

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">About you</h2>
          <p className="text-sm text-muted-foreground">
            How you talk, names, and daily topics — suggestions are written in your voice. Saved
            automatically.
          </p>
        </div>
        <TiptapEditor
          content={account.context ?? ''}
          placeholder="- I need some water&#10;- Can you help me"
          onUpdate={(_html, markdown) => saveContext(markdown)}
          className="min-h-48"
        />
      </section>

      <MoreOptions label="More writing options">
        <OptionField label="Model" description="Smaller models are faster.">
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

        <LabeledSlider
          label="Creativity"
          description="Lower sticks to what you usually say; higher tries new phrasings."
          defaultValue={config?.settings?.temperature ?? 0.7}
          min={0}
          max={1}
          step={0.05}
          format={value => `${Math.round(value * 100)}%`}
          leftLabel="Predictable"
          rightLabel="Creative"
          onCommit={value => save({ settings: { temperature: value } })}
        />

        <OptionField label="Suggestions shown" description="How many options appear at once.">
          <Select
            value={String(config?.settings?.max_suggestions ?? 3)}
            onValueChange={value => save({ settings: { max_suggestions: Number(value) } })}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map(count => (
                <SelectItem key={count} value={String(count)}>
                  {count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OptionField>
      </MoreOptions>
    </div>
  );
}
