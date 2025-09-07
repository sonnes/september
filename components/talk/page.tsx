import AudioPlayer from '@/components/audio-player';
import Autocomplete from '@/components/editor/autocomplete';
import Editor from '@/components/editor/simple';
import Suggestions from '@/components/editor/suggestions';

import { MessageList } from './message-list';
import Recorder from './recorder';

export default function TalkPageContent() {
  return (
    <div className="flex h-[calc(100vh-100px)] md:h-[calc(100vh-196px)]">
      {/* Left column - Message list */}
      <div className="hidden md:block w-1/3 lg:w-1/4 px-2 overflow-y-auto border-r border-zinc-200">
        <div className="max-w-full">
          <MessageList />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col px-2 md:px-4 min-w-0 overflow-hidden">
        <div className="flex items-center gap-4 border border-zinc-200 rounded-md">
          <div className="flex-1 min-w-0">
            <AudioPlayer />
          </div>
          <div className="flex-shrink-0">
            <Recorder />
          </div>
        </div>
        {/* Top components - Autocomplete and Suggestions */}
        <div className="flex flex-col gap-2">
          <Autocomplete />
          <Suggestions />
        </div>

        {/* Spacer to push editor to bottom */}
        <div className="flex-1"></div>

        {/* Editor at bottom */}
        <div className="flex flex-col py-2">
          <Editor />
        </div>
      </div>
    </div>
  );
}
