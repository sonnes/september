import type { ComponentProps, ReactNode } from 'react';

import Link from 'next/link';

import { DocumentIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import moment from 'moment';

import { Input } from '@/components/ui/input';

import { cn } from '@/lib/utils';
import { Document } from '@/types/document';

type DocumentListEmptyStateProps = ComponentProps<'div'> & {
  title?: string;
  description?: string;
  icon?: ReactNode;
};

function DocumentListEmptyState({
  className,
  title = 'No documents yet',
  description = 'Create your first document to get started',
  icon,
  children,
  ...props
}: DocumentListEmptyStateProps) {
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

type DocumentListProps = {
  documents: Document[];
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  count?: number;
  label?: string;
};

export function DocumentList({
  documents,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search your documents...',
  count,
  label = 'documents',
}: DocumentListProps) {
  const displayText = count !== undefined ? `${count} ${label}` : undefined;

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
        {documents.length === 0 ? (
          <DocumentListEmptyState
            title={searchValue ? 'No documents found' : 'No documents yet'}
            description={
              searchValue
                ? 'Try adjusting your search terms'
                : 'Create your first document to get started'
            }
            icon={<DocumentIcon className="h-12 w-12" />}
          />
        ) : (
          documents.map(document => (
            <Link key={document.id} href={`/write/${document.id}`}>
              <div className="py-3 border-b border-zinc-200 hover:bg-zinc-50 transition-colors">
                <div className="text-base font-medium text-zinc-900 mb-1">
                  {document.name || 'Untitled document'}
                </div>
                <div className="text-sm text-zinc-500">
                  Updated {moment(document.updated_at).fromNow()}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
