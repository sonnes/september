'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SlidesNavigationProps = {
  currentSlide: number;
  totalSlides: number;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
};

export default function SlidesNavigation({
  currentSlide,
  totalSlides,
  onPrevious,
  onNext,
  className,
}: SlidesNavigationProps) {
  const isFirstSlide = currentSlide === 1;
  const isLastSlide = currentSlide === totalSlides;

  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={isFirstSlide}
        className="min-w-[110px]"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      <div className="flex items-center gap-2 rounded-md border bg-muted/70 px-4 py-2 text-sm text-muted-foreground shadow-sm">
        <span className="font-semibold text-foreground">{currentSlide}</span>
        <span className="text-muted-foreground">/</span>
        <span>{totalSlides}</span>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={isLastSlide}
        className="min-w-[110px]"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

