// Components
export { SpaceList } from './components/space-list';
export { MessageList } from './components/message-list';
export { EditableSpaceTitle } from './components/editable-space-title';
export { SpaceSwitch } from './components/space-switch';

// Live-query hooks
export { useSpaces } from './hooks/use-spaces';
export { useMessages, useFirstMessage } from './hooks/use-messages';

// Stateful flow hook
export { useCreateAudioMessage } from './hooks/use-create-audio-message';
export { useGenerateSpaceContext } from './hooks/use-generate-space-context';

// Plain async mutations (throw on failure; toasts live at call sites)
export { createSpace, updateSpace, deleteSpace, createMessage } from './mutations';

// Types
export type { Space, Message, CreateMessageData } from './types';
