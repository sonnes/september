import { useState } from 'react';

import { PlusIcon } from '@heroicons/react/24/outline';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import { pageTitle } from '@/lib/seo';
import { useAccount } from '@/packages/account';
import { entitySlug } from '@/packages/shared';
import { SpaceList, createDefaultSpace, createSpace, useSpaces } from '@/packages/spaces';
import { Button } from '@/packages/ui/components/button';
import { ErrorState } from '@/packages/ui/components/error-state';

import { SpaceListSkeleton } from './-loading-skeleton';

export const Route = createFileRoute('/_app/talk/')({
  head: () => ({
    meta: [{ title: pageTitle('Talk') }, { name: 'description', content: 'Your talks' }],
  }),
  component: SpacesPage,
});

function SpacesPage() {
  const navigate = useNavigate();
  const { user } = useAccount();
  const [searchValue, setSearchValue] = useState('');
  const {
    spaces,
    isLoading: fetching,
    error,
  } = useSpaces({
    userId: user?.id,
    searchQuery: searchValue,
  });
  const { spaces: allSpaces } = useSpaces({ userId: user?.id });

  const handleNewSpace = async () => {
    if (!user?.id) {
      toast.error('Account not ready yet');
      return;
    }
    try {
      const isFirstSpace = allSpaces.length === 0;
      const space = isFirstSpace ? await createDefaultSpace(user.id) : await createSpace(user.id);
      toast.success('Space created');
      navigate({
        to: '/talk/$spaceSlug',
        params: { spaceSlug: entitySlug(space.title, space.id, 'space') },
      });
    } catch (err) {
      toast.error('Error', {
        description: err instanceof Error ? err.message : 'Failed to create space',
      });
    }
  };

  return (
    <>
      <SidebarLayout.Header>
        <PageHeader breadcrumbs={[{ label: 'Talk' }]} />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell>
          <PageTitle
            title="Talk"
            actions={
              <Button onClick={handleNewSpace} disabled={fetching}>
                <PlusIcon className="size-4" />
                New space
              </Button>
            }
          />

          {fetching && <SpaceListSkeleton />}

          {!fetching && error && (
            <ErrorState
              title="Failed to load spaces"
              description={
                error.message || 'An unexpected error occurred while loading your spaces.'
              }
              onRetry={() => window.location.reload()}
            />
          )}

          {!fetching && !error && (
            <SpaceList spaces={spaces} searchValue={searchValue} onSearchChange={setSearchValue} />
          )}
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}
