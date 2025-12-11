type ChatListItemProps = {
  title: string;
  lastMessageTime: string;
  onClick?: () => void;
};

export function ChatListItem({ title, lastMessageTime, onClick }: ChatListItemProps) {
  return (
    <div
      onClick={onClick}
      className={`py-3 border-b border-zinc-200 cursor-pointer hover:bg-zinc-50 transition-colors ${
        onClick ? '' : 'cursor-default'
      }`}
    >
      <div className="text-base font-medium text-zinc-900 mb-1">{title}</div>
      <div className="text-sm text-zinc-500">Last message {lastMessageTime}</div>
    </div>
  );
}
