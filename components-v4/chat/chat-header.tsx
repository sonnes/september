import { PlusIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';

type ChatHeaderProps = {
  onNewChat?: () => void;
};

export function ChatHeader({ onNewChat }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold tracking-tight">Chats</h1>
      {onNewChat && (
        <Button onClick={onNewChat} variant="default" size="default">
          <PlusIcon className="h-4 w-4" />
          New chat
        </Button>
      )}
    </div>
  );
}
