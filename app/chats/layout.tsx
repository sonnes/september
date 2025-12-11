import type { Metadata } from 'next';

import SidebarLayout from '@/components-v4/sidebar/layout';

export const metadata: Metadata = {
  title: 'Chats',
  description: 'Your conversations',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarLayout>
      <SidebarLayout.Content>{children}</SidebarLayout.Content>
    </SidebarLayout>
  );
}
