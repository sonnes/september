import { useState } from 'react';

import { PlusIcon } from '@heroicons/react/24/outline';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import { pageTitle } from '@/lib/seo';
import { useAccount } from '@/packages/account';
import { entitySlug } from '@/packages/shared';
import {
  SpaceList,
  useCreateDefaultSpaceMutation,
  useCreateSpaceMutation,
  useSpaces,
} from '@/packages/spaces';
import { Button } from '@/packages/ui/components/button';
import { ErrorState } from '@/packages/ui/components/error-state';

import { SpaceListSkeleton } from './-loading-skeleton';

export const Route = createFileRoute('/_app/spaces/')({
  head: () => ({
    meta: [{ title: pageTitle('Spaces') }, { name: 'description', content: 'Your spaces' }],
  }),
  component: SpacesPage,
});

function SpacesPage() {
  const navigate = useNavigate();
  const { user } = useAccount();
  const [searchValue, setSearchValue] = useState('');
  const createDefaultSpace = useCreateDefaultSpaceMutation();
  const createSpace = useCreateSpaceMutation();
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
      const space = isFirstSpace
        ? await createDefaultSpace.mutateAsync(user.id)
        : await createSpace.mutateAsync({ userId: user.id });
      toast.success('Space created');
      navigate({
        to: '/spaces/$spaceSlug/talk',
        params: { spaceSlug: entitySlug(space.title, 'space') },
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
        <PageHeader breadcrumbs={[{ label: 'Spaces' }]} />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell>
          <PageTitle
            title="Spaces"
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
