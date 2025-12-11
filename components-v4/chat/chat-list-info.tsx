type ChatListInfoProps = {
  count: number;
  label?: string;
};

export function ChatListInfo({ count, label }: ChatListInfoProps) {
  const displayLabel = label || 'chats';
  const displayText = `${count} ${displayLabel}`;

  return (
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm text-zinc-600">{displayText}</span>
    </div>
  );
}
