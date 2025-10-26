import { useAccount } from '@/services/account';
import { getSpeechConfig, getSuggestionsConfig, getTranscriptionConfig } from '@/services/ai/utils';

import type { AIFeature, AIProvider } from '@/types/ai-config';

/**
 * Hook to check AI feature availability and configuration
 */
export function useAIFeatures() {
  const { account } = useAccount();

  const getFeatureConfig = (feature: AIFeature) => {
    if (!account) return null;

    switch (feature) {
      case 'suggestions':
        return getSuggestionsConfig(account);
      case 'transcription':
        return getTranscriptionConfig(account);
      case 'speech':
        return getSpeechConfig(account);
      default:
        return null;
    }
  };

  const isFeatureEnabled = (feature: AIFeature): boolean => {
    const config = getFeatureConfig(feature);
    // Speech is always enabled (no enabled flag)
    if (feature === 'speech') return true;
    // Type guard to check if config has enabled property
    return config && 'enabled' in config ? config.enabled : false;
  };

  const getFeatureProvider = (feature: AIFeature): AIProvider | null => {
    const config = getFeatureConfig(feature);
    return config?.provider ?? null;
  };

  const hasProviderConfig = (provider: AIProvider): boolean => {
    if (provider === 'browser') return true; // No config needed
    return !!account?.ai_providers?.[provider]?.api_key;
  };

  const can_use_feature = (feature: AIFeature): boolean => {
    const config = getFeatureConfig(feature);
    if (!config) return false;

    // Speech is always enabled (no enabled flag)
    // Other features check the enabled flag
    if (feature !== 'speech' && config && 'enabled' in config && !config.enabled) return false;

    // Browser-based features don't need config
    if (config.provider === 'browser') return true;

    // Check if we have config for the provider
    return hasProviderConfig(config.provider);
  };

  const getProviderApiKey = (provider: AIProvider): string | null => {
    if (provider === 'browser') return null;
    return account?.ai_providers?.[provider]?.api_key ?? null;
  };

  const getProviderBaseUrl = (provider: AIProvider): string | null => {
    if (provider === 'browser') return null;
    return account?.ai_providers?.[provider]?.base_url ?? null;
  };

  return {
    getFeatureConfig,
    isFeatureEnabled,
    getFeatureProvider,
    hasProviderConfig,
    can_use_feature,
    getProviderApiKey,
    getProviderBaseUrl,
  };
}
