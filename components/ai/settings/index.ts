/**
 * AI Settings Forms and Modals
 *
 * Feature-specific configuration forms for AI capabilities.
 * Forms handle form fields only, modals handle account loading/saving.
 */

// Suggestions
export { SuggestionsForm, SuggestionsFormSchema } from './suggestions-form';
export type { SuggestionsFormData } from './suggestions-form';
export { SuggestionsModal } from './suggestions-modal';

// Speech
export { SpeechForm, SpeechFormSchema } from './speech-form';
export type { SpeechFormData } from './speech-form';
export { SpeechModal } from './speech-modal';

// Transcription
export { TranscriptionForm, TranscriptionFormSchema } from './transcription-form';
export type { TranscriptionFormData } from './transcription-form';
export { TranscriptionModal } from './transcription-modal';
