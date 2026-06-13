import * as React from 'react';
import type { ComponentProps } from 'react';

import { Link } from '@tanstack/react-router';

import { MagnifyingGlassIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/packages/ui/components/alert-dialog';
import { Button } from '@/packages/ui/components/button';
import { Input } from '@/packages/ui/components/input';

import { cn, timeAgo } from '@/packages/shared';

import { deleteSpace } from '../mutations';
import { Space } from '../types';

type SpaceListEmptyStateProps = ComponentProps<'div'> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

function SpaceListEmptyState({
  className,
  title = 'No spaces yet',
  description = 'Start a new conversation to see your spaces here',
  icon,
  children,
  ...props
}: SpaceListEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex size-full flex-col items-center justify-center gap-3 p-8 text-center',
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          {icon && <div className="text-zinc-400">{icon}</div>}
          <div className="space-y-1">
            <h3 className="font-medium text-sm text-zinc-900">{title}</h3>
            {description && <p className="text-zinc-500 text-sm">{description}</p>}
          </div>
        </>
      )}
    </div>
  );
}

type SpaceListProps = {
  spaces: Space[];
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  count?: number;
  label?: string;
};

export function SpaceList({
  spaces,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search your spaces...',
  count,
  label = 'spaces',
}: SpaceListProps) {
  const displayText = count !== undefined ? `${count} ${label}` : undefined;
  const [spaceToDelete, setSpaceToDelete] = React.useState<Space | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!spaceToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSpace(spaceToDelete.id);
      toast.success('Space deleted');
      setSpaceToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete space');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" />
        </div>
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={e => onSearchChange?.(e.target.value)}
          className="pl-10"
        />
      </div>

      {displayText && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-zinc-600">{displayText}</span>
        </div>
      )}

      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {spaces.length === 0 ? (
          <SpaceListEmptyState
            title={searchValue ? 'No spaces found' : 'No spaces yet'}
            description={
              searchValue
                ? 'Try adjusting your search terms'
                : 'Start a new conversation to see your spaces here'
            }
          />
        ) : (
          spaces.map(space => (
            <div
              key={space.id}
              className="group relative flex items-center justify-between border-b border-zinc-200 hover:bg-zinc-50 transition-colors"
            >
              <Link to="/spaces/$id" params={{ id: space.id }} className="flex-1 py-3 px-1 min-w-0">
                <div className="text-base font-medium text-zinc-900 mb-1 truncate">
                  {space.title || 'Untitled space'}
                </div>
                <div className="text-sm text-zinc-500">
                  Last message {timeAgo(space.updated_at)}
                </div>
              </Link>

              <div className="shrink-0 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSpaceToDelete(space)}
                  className="h-8 w-8 text-red-600 hover:bg-red-50 focus:ring-0"
                >
                  <TrashIcon className="h-5 w-5" />
                  <span className="sr-only">Delete space</span>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!spaceToDelete} onOpenChange={open => !open && setSpaceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the space "{spaceToDelete?.title || 'Untitled space'}" and
              all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete space'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
