'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type SlidesProgressProps = {
  currentSlide: number;
  totalSlides: number;
  className?: string;
};

export function SlidesProgress({ currentSlide, totalSlides, className }: SlidesProgressProps) {
  const progress = totalSlides > 0 ? (currentSlide / totalSlides) * 100 : 0;

  return (
    <div className={cn('w-full', className)}>
      <Progress value={progress} className="h-2" />
      <div className="mt-2 text-center text-xs text-muted-foreground">
        {Math.round(progress)}% complete
      </div>
    </div>
  );
}

