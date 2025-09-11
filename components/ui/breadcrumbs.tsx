import React from 'react';

import { ChevronRightIcon, HomeIcon } from '@heroicons/react/20/solid';

import { cn } from '@/lib/utils';

export interface BreadcrumbPage {
  name: string;
  href: string;
  current?: boolean;
}

interface BreadcrumbsProps {
  pages: BreadcrumbPage[];
  homeHref?: string;
  className?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ pages, homeHref = '/', className }) => {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex', className)}>
      <ol role="list" className="flex items-center space-x-4">
        <li>
          <div>
            <a href={homeHref} className="text-zinc-100 hover:text-zinc-300">
              <HomeIcon aria-hidden="true" className="size-5 shrink-0" />
              <span className="sr-only">Home</span>
            </a>
          </div>
        </li>
        {pages.map(page => (
          <li key={page.name}>
            <div className="flex items-center">
              <ChevronRightIcon aria-hidden="true" className="size-5 shrink-0 text-zinc-100" />
              <a
                href={page.href}
                aria-current={page.current ? 'page' : undefined}
                className={
                  'ml-4 text-sm font-semibold ' +
                  (page.current ? 'text-zinc-200' : 'text-zinc-100 hover:text-zinc-300')
                }
              >
                {page.name}
              </a>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
