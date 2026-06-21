import { useMemo, useState } from 'react';

import { Link, createFileRoute } from '@tanstack/react-router';
import { FileText, Search } from 'lucide-react';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import { pageTitle } from '@/lib/seo';
import { useAccount } from '@/packages/account';
import { useNotes } from '@/packages/notes';
import { cn, entitySlug, timeAgo } from '@/packages/shared';
import { useSpaces } from '@/packages/spaces';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/packages/ui/components/card';
import { EmptyState } from '@/packages/ui/components/empty-state';
import { ErrorState } from '@/packages/ui/components/error-state';
import { Input } from '@/packages/ui/components/input';
import { LoadingState } from '@/packages/ui/components/loading-state';

export const Route = createFileRoute('/_app/notes/')({
  head: () => ({
    meta: [{ title: pageTitle('Notes') }, { name: 'description', content: 'Your notes' }],
  }),
  component: NotesIndexPage,
});

function NotesIndexPage() {
  const { user } = useAccount();
  const [searchValue, setSearchValue] = useState('');
  const {
    notes: allNotes,
    isLoading: notesLoading,
    error,
  } = useNotes({
    scope: 'space-notes',
    searchQuery: searchValue,
  });
  const { spaces, isLoading: spacesLoading } = useSpaces({ userId: user?.id });

  const spaceById = useMemo(() => new Map(spaces.map(space => [space.id, space])), [spaces]);
  const notes = useMemo(
    () => allNotes.filter(note => note.space_id && spaceById.has(note.space_id)),
    [allNotes, spaceById]
  );
  const isLoading = notesLoading || spacesLoading;

  return (
    <>
      <SidebarLayout.Header>
        <PageHeader breadcrumbs={[{ label: 'Notes' }]} />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell width="wide">
          <PageTitle title="Notes" description="All long-form notes across your spaces." />

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={searchValue}
              onChange={event => setSearchValue(event.target.value)}
              placeholder="Search notes..."
              className="pl-10"
            />
          </div>

          {isLoading && <LoadingState variant="page" label="Loading notes..." />}

          {!isLoading && error && (
            <ErrorState
              title="Failed to load notes"
              description={
                error.message || 'An unexpected error occurred while loading your notes.'
              }
              onRetry={() => window.location.reload()}
            />
          )}

          {!isLoading && !error && notes.length === 0 && (
            <EmptyState
              icon={FileText}
              title={searchValue ? 'No notes found' : 'No notes yet'}
              description={
                searchValue
                  ? 'Try a different note title.'
                  : 'Notes you write inside Talk spaces will appear here.'
              }
            />
          )}

          {!isLoading && !error && notes.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {notes.map(note => {
                const space = note.space_id ? spaceById.get(note.space_id) : undefined;
                const preview = note.content.replace(/\s+/g, ' ').trim();

                return (
                  <Link
                    key={note.id}
                    to="/notes/$spaceSlug/$noteSlug"
                    params={{
                      spaceSlug: entitySlug(space?.title, note.space_id, 'space'),
                      noteSlug: entitySlug(note.name, note.id, 'note'),
                    }}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Card className="h-full gap-3 py-4 transition-colors hover:bg-muted/40">
                      <CardHeader className="gap-1 px-4">
                        <CardTitle className="truncate text-base">
                          {note.name || 'Untitled note'}
                        </CardTitle>
                        <CardDescription className="truncate">
                          {space?.title || 'Unknown space'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4">
                        <p
                          className={cn(
                            'line-clamp-2 min-h-10 text-sm',
                            preview ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {preview || 'Empty note'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Updated {timeAgo(note.updated_at)}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}
