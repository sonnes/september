import { PropsWithChildren } from 'react';

type ChatListContainerProps = PropsWithChildren & {
  className?: string;
};

export function ChatListContainer({ children, className = '' }: ChatListContainerProps) {
  return (
    <div className={`overflow-y-auto ${className}`} style={{ maxHeight: 'calc(100vh - 300px)' }}>
      {children}
    </div>
  );
}
