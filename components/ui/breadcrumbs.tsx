import React from 'react';

import { ChevronRightIcon, HomeIcon } from '@heroicons/react/20/solid';

export interface BreadcrumbPage {
  name: string;
  href: string;
  current?: boolean;
}

interface BreadcrumbsProps {
  pages: BreadcrumbPage[];
  homeHref?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ pages, homeHref = '/' }) => {
  return (
    <nav aria-label="Breadcrumb" className="flex">
      <ol role="list" className="flex items-center space-x-4">
        <li>
          <div>
            <a href={homeHref} className="text-gray-100 hover:text-gray-300">
              <HomeIcon aria-hidden="true" className="size-5 shrink-0" />
              <span className="sr-only">Home</span>
            </a>
          </div>
        </li>
        {pages.map(page => (
          <li key={page.name}>
            <div className="flex items-center">
              <ChevronRightIcon aria-hidden="true" className="size-5 shrink-0 text-gray-100" />
              <a
                href={page.href}
                aria-current={page.current ? 'page' : undefined}
                className={
                  'ml-4 text-sm font-semibold ' +
                  (page.current ? 'text-gray-200' : 'text-gray-100 hover:text-gray-300')
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
