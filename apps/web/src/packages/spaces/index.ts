// Components
export { SpaceList } from './components/space-list';
export { MessageList } from './components/message-list';
export { EditableSpaceTitle } from './components/editable-space-title';

// Live-query hooks
export { useSpaces } from './hooks/use-spaces';
export {
  useCreateDefaultSpaceMutation,
  useCreateMessageMutation,
  useCreateSpaceMutation,
  useDeleteSpaceMutation,
  useUpdateSpaceMutation,
} from './hooks/use-space-mutations';
export {
  useSpaceIdFromSlug,
  spaceIdFromSlug,
  type UseSpaceIdFromSlugReturn,
} from './hooks/use-space-id-from-slug';
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
export {
  DEFAULT_SPACE_SEED,
  DEFAULT_SPACE_TITLE,
  createDefaultSpace,
  createSpace,
  updateSpace,
  deleteSpace,
  createMessage,
} from './mutations';
export {
  addManualPhrase,
  removePhrase,
  setPhrasePinned,
  setPhraseCode,
  replaceAiPhrases,
} from './mutations';

// Pure helpers
export {
  topPhrases,
  topRows,
  rowKind,
  sanitizeStarters,
  dedupeAgainstPinned,
  isStale,
  PHRASES_STALE_AFTER,
} from './lib/phrases';
export type { PhraseKind } from './lib/phrases';
export {
  isCommonWord,
  normalizeCode,
  validateCode,
  generateCode,
  matchCode,
  trailingWord,
} from './lib/codes';
export type { CodeValidation } from './lib/codes';
export { mineShortcuts, normalizeMinedText } from './lib/mine';
export type { MinedShortcut } from './lib/mine';
export { historyPage, HISTORY_PAGE_SIZE } from './lib/history';
export type { HistoryPage } from './lib/history';

// Types
export type { Space, Message, CreateMessageData, SavedPhrase } from './types';
