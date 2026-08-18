'use client';

import { Link } from '@tanstack/react-router';

import { BrandMark } from '@/components/brand';

import { cn } from '@/packages/shared';
import { SidebarTrigger } from '@/packages/ui/components/sidebar';

type MobileNavProps = {
  title?: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

export default function MobileNav({ title = 'September', children, className }: MobileNavProps) {
  return (
    <nav
      className={cn(
        'md:hidden flex items-center justify-between py-3 px-4 border-b w-full',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Link to="/" aria-label="September home">
          <BrandMark size={32} loading="lazy" />
        </Link>
        <span className="font-semibold text-base truncate max-w-[180px]">{title}</span>
      </div>

      <div className="flex items-center gap-1">
        {children}
        <SidebarTrigger />
      </div>
    </nav>
  );
}
