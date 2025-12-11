import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { TextInput } from '@/components/uix/text-input';

type ChatSearchBarProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
};

export function ChatSearchBar({
  value,
  onChange,
  placeholder = 'Search your chats...',
}: ChatSearchBarProps) {
  return (
    <div className="relative mb-4">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" />
      </div>
      <TextInput
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
