import { ClientProviders } from '@/components/context/client-providers';
import SidebarLayout from '@/components/sidebar/layout';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      <SidebarLayout>{children}</SidebarLayout>
    </ClientProviders>
  );
}
