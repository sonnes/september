import { Fragment } from 'react';

import Link from 'next/link';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@september/ui/components/breadcrumb';
import { Separator } from '@september/ui/components/separator';
import { SidebarTrigger } from '@september/ui/components/sidebar';

export type Breadcrumb = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  breadcrumbs?: Breadcrumb[];
  children?: React.ReactNode;
};

export function PageHeader({ breadcrumbs, children }: PageHeaderProps) {
  return (
    <>
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <Fragment key={`${crumb.label}-${i}`}>
                  <BreadcrumbItem>
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      {children ? <div className="ml-auto flex items-center gap-2">{children}</div> : null}
    </>
  );
}
