'use client';

import { useEffect, useState } from 'react';

import { PlayIcon } from '@heroicons/react/24/outline';

import { useAccountContext } from '@/components/context/account-provider';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownOption } from '@/components/ui/dropdown';
import { useToast } from '@/hooks/use-toast';
import { Voice } from '@/services/speech';
import { SpeechProvider, useSpeechContext } from '@/services/speech/context';

interface TalkSettingsFormData {
  speech_provider: string;
  speech_voice_id: string;
  model_id: string;
  speed: string;
  stability: string;
  similarity: string;
  style: string;
  speaker_boost: string;
}

function ProviderSection({
  formData,
  handleInputChange,
}: {
  formData: TalkSettingsFormData;
  handleInputChange: (field: string, value: string) => void;
}) {
  const { getProviders, setProvider } = useSpeechContext();

  const providers = getProviders();

  // Convert providers to dropdown options
  const providerOptions: DropdownOption[] = providers.map(provider => ({
    id: provider.id,
    name: provider.name,
  }));

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Provider</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Select the provider you want to use for generating speech.
        </p>
      </div>

      <div className="md:col-span-2 px-4">
        <div className="max-w-2xl space-y-4">
          <div className="rounded-md bg-gray-50 p-4">
            <div className="space-y-4">
              <Dropdown
                options={providerOptions}
                selectedValue={formData.speech_provider}
                onSelect={providerId => {
                  const provider = providers.find(p => p.id === providerId);
                  handleInputChange('speech_provider', provider?.name || providerId);
                  setProvider(providerId);
                }}
                placeholder="Select a provider"
                label="Speech Provider"
              />

              {formData.speech_provider && (
                <div className="text-sm text-gray-700">
                  <p>
                    Selected provider:{' '}
                    <span className="font-medium">{formData.speech_provider}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceSection({
  formData,
  handleInputChange,
}: {
  formData: TalkSettingsFormData;
  handleInputChange: (field: string, value: string) => void;
}) {
  const { engine } = useSpeechContext();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVoices = async () => {
      try {
        const voicesList = await engine.getVoices();
        setVoices(voicesList);
      } catch (error) {
        console.error('Error loading voices:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVoices();
  }, [engine]);

  const onSelectVoice = (voiceId: string) => {
    handleInputChange('speech_voice_id', voiceId);
  };

  const onPlayPreview = async (voiceId: string) => {
    try {
      // Get the current speech provider and generate a sample audio
      const sampleText = 'Hello, this is a preview of my voice.';
      const response = await engine.generateSpeech({
        text: sampleText,
        voiceId,
      });

      // Create and play audio from the blob
      const audioBlob = await fetch(response.blob).then(r => r.blob());
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();

      // Clean up the URL after playing
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error('Error playing voice preview:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Voice</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Select the voice you want to use for generating speech.
        </p>
      </div>

      <div className="md:col-span-2 px-4">
        <div className="max-w-2xl space-y-4">
          <div className="rounded-md bg-gray-50 p-4 h-64 overflow-y-auto">
            {loading ? (
              <div className="text-sm text-gray-700">
                <p>Loading voices...</p>
              </div>
            ) : voices.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {voices.map((voice, index) => (
                  <li key={index} className="flex items-center justify-between gap-x-6 py-4">
                    <div className="min-w-0">
                      <div className="flex items-start gap-x-3">
                        <p className="text-sm/6 font-semibold text-gray-900">{voice.name}</p>
                        <span className="mt-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-600/20">
                          {voice.language}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-x-2 text-xs/5 text-gray-500">
                        <span className="whitespace-nowrap">Voice ID: {voice.id}</span>
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-x-4">
                      <button
                        type="button"
                        onClick={() => onPlayPreview(voice.id)}
                        className="rounded-md bg-white p-2 text-gray-400 shadow-sm ring-1 ring-inset ring-gray-300 hover:text-gray-500 hover:bg-gray-50"
                        title="Play preview"
                      >
                        <PlayIcon className="h-5 w-5" />
                      </button>
                      {formData.speech_voice_id !== voice.id ? (
                        <button
                          type="button"
                          onClick={() => onSelectVoice(voice.id)}
                          className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                          Use
                        </button>
                      ) : (
                        <div className="p-2 text-green-600 text-sm font-medium">Selected</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-700">
                <p>No voices available for the selected provider.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Add the MODELS constant at the top of the file after imports
const MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2' },
  { id: 'eleven_flash_v2_5', name: 'Eleven Flash v2.5' },
  { id: 'eleven_flash_v2', name: 'Eleven Flash v2 (English Only)' },
];

function SpeechSettingsSection({
  formData,
  handleInputChange,
}: {
  formData: TalkSettingsFormData;
  handleInputChange: (field: string, value: string) => void;
}) {
  const [speechSettings, setSpeechSettings] = useState({
    model_id: formData.model_id || 'eleven_multilingual_v2',
    speed: parseFloat(formData.speed) || 1.0,
    stability: parseFloat(formData.stability) || 0.5,
    similarity: parseFloat(formData.similarity) || 0.5,
    style: parseFloat(formData.style) || 0.0,
    speaker_boost: formData.speaker_boost === 'true',
  });

  // Update local speech settings when formData changes
  useEffect(() => {
    setSpeechSettings({
      model_id: formData.model_id || 'eleven_multilingual_v2',
      speed: parseFloat(formData.speed) || 1.0,
      stability: parseFloat(formData.stability) || 0.5,
      similarity: parseFloat(formData.similarity) || 0.5,
      style: parseFloat(formData.style) || 0.0,
      speaker_boost: formData.speaker_boost === 'true',
    });
  }, [formData]);

  const handleSliderChange = (key: string, value: number) => {
    setSpeechSettings(prev => ({ ...prev, [key]: value }));
    handleInputChange(key, value.toString());
  };

  const handleToggleChange = (key: string, value: boolean) => {
    setSpeechSettings(prev => ({ ...prev, [key]: value }));
    handleInputChange(key, value.toString());
  };

  const handleModelChange = (modelId: string) => {
    setSpeechSettings(prev => ({ ...prev, model_id: modelId }));
    handleInputChange('model_id', modelId);
  };

  // Find the current model name from the model_id
  const currentModel = MODELS.find(model => model.id === speechSettings.model_id) || MODELS[0];

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Speech Settings</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Configure the settings for the speech engine.
        </p>
      </div>

      <div className="md:col-span-2 px-4">
        <div className="max-w-2xl space-y-6">
          <div className="rounded-md bg-gray-50 p-4">
            <div className="space-y-6">
              {/* Model Selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Model</h3>
                <Dropdown
                  options={MODELS.map(model => ({ id: model.id, name: model.name }))}
                  selectedValue={speechSettings.model_id}
                  onSelect={handleModelChange}
                  placeholder="Select a model"
                  label="Speech Model"
                />
              </div>

              {/* Speed Control */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Speed</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Slower</span>
                    <span>Faster</span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="1.2"
                    step="0.1"
                    value={speechSettings.speed}
                    onChange={e => handleSliderChange('speed', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-center text-sm text-gray-600">{speechSettings.speed}x</div>
                </div>
              </div>

              {/* Stability Control */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Stability</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>More variable</span>
                    <span>More stable</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={speechSettings.stability}
                    onChange={e => handleSliderChange('stability', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-center text-sm text-gray-600">
                    {Math.round(speechSettings.stability * 100)}%
                  </div>
                </div>
              </div>

              {/* Similarity Control */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Similarity</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={speechSettings.similarity}
                    onChange={e => handleSliderChange('similarity', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-center text-sm text-gray-600">
                    {Math.round(speechSettings.similarity * 100)}%
                  </div>
                </div>
              </div>

              {/* Style Exaggeration Control */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Style Exaggeration</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>None</span>
                    <span>Exaggerated</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={speechSettings.style}
                    onChange={e => handleSliderChange('style', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-center text-sm text-gray-600">
                    {Math.round(speechSettings.style * 100)}%
                  </div>
                </div>
              </div>

              {/* Speaker Boost Toggle */}
              <div className="flex items-center justify-between pt-2">
                <label htmlFor="speakerBoost" className="text-sm font-medium text-gray-900">
                  Speaker boost
                </label>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                  <input
                    type="checkbox"
                    id="speakerBoost"
                    checked={speechSettings.speaker_boost}
                    onChange={e => handleToggleChange('speaker_boost', e.target.checked)}
                    className="peer sr-only"
                  />
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                      speechSettings.speaker_boost ? 'translate-x-5 bg-indigo-600' : ''
                    }`}
                  ></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TalkSettingsForm() {
  const { account, patchAccount } = useAccountContext();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { show, showError } = useToast();

  const initialFormData = {
    speech_provider: account.speech_provider || 'browser',
    speech_voice_id: account.speech_voice_id || '',
    // Speech settings defaults
    model_id: account.speech_settings?.model_id || 'eleven_multilingual_v2',
    speed: account.speech_settings?.speed?.toString() || '1.0',
    stability: account.speech_settings?.stability?.toString() || '0.5',
    similarity: account.speech_settings?.similarity?.toString() || '0.5',
    style: account.speech_settings?.style?.toString() || '0.0',
    speaker_boost: account.speech_settings?.speaker_boost?.toString() || 'false',
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Update account with talk settings
      await patchAccount({
        speech_provider: formData.speech_provider,
        speech_voice_id: formData.speech_voice_id,
        speech_settings: {
          model_id: formData.model_id,
          speed: parseFloat(formData.speed),
          stability: parseFloat(formData.stability),
          similarity: parseFloat(formData.similarity),
          style: parseFloat(formData.style),
          speaker_boost: formData.speaker_boost === 'true',
        },
      });
      show({
        title: 'Talk settings',
        message: 'Your talk settings have been updated successfully.',
      });
    } catch (err) {
      console.error('Error saving talk settings:', err);
      showError('Failed to update talk settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <SpeechProvider>
      <div className="divide-y divide-gray-400">
        <form onSubmit={handleSubmit}>
          <ProviderSection formData={formData} handleInputChange={handleInputChange} />

          <VoiceSection formData={formData} handleInputChange={handleInputChange} />

          <SpeechSettingsSection formData={formData} handleInputChange={handleInputChange} />

          {/* Floating save button */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
            <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </SpeechProvider>
  );
}
