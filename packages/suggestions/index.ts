export { Suggestions } from './components/suggestions';
export { SuggestionStripes } from './components/suggestion-stripes';
export { SuggestionsForm } from './components/suggestions-form';
export { useStripes } from './hooks/use-stripes';
export type { UseStripesReturn, Stripe } from './hooks/use-stripes';
export type { SuggestionsFormData, Suggestion } from './types';
export {
  tokenize,
  joinTokens,
  hiddenTokenCount,
  historyMatches,
  boardWords,
  boardPhrases,
  composeSuggestions,
  stripeForText,
  appendTokens,
  MAX_COMPOSED,
} from './lib/stripes';
