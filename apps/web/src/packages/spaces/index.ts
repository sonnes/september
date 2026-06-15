// Components
export { SpaceList } from './components/space-list';
export { MessageList } from './components/message-list';
export { EditableSpaceTitle } from './components/editable-space-title';
export { SpaceSwitch } from './components/space-switch';

// Live-query hooks
export { useSpaces } from './hooks/use-spaces';
export { useMessages, useFirstMessage } from './hooks/use-messages';
export { useSavedPhrases } from './hooks/use-saved-phrases';
export type { UseSavedPhrasesReturn } from './hooks/use-saved-phrases';

// Stateful flow hooks
export { useCreateAudioMessage } from './hooks/use-create-audio-message';
export { usePlayMessage } from './hooks/use-play-message';
export type { UsePlayMessageResult } from './hooks/use-play-message';
export { useGenerateSpaceContext } from './hooks/use-generate-space-context';
export { useGenerateSpacePhrases } from './hooks/use-generate-space-phrases';
export { useSyncSpacePhrases } from './hooks/use-sync-space-phrases';

// Plain async mutations (throw on failure; toasts live at call sites)
export { DEFAULT_SPACE_TITLE, createSpace, updateSpace, deleteSpace, createMessage } from './mutations';
export { addManualPhrase, removePhrase, setPhrasePinned, replaceAiPhrases } from './mutations';

// Pure helpers
export { topPhrases, dedupeAgainstPinned, isStale, PHRASES_STALE_AFTER } from './lib/phrases';

// Types
export type { Space, Message, CreateMessageData, SavedPhrase } from './types';
