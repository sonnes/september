'use client';

import { useCallback, useEffect, useState } from 'react';

import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { type Slide, parseAndRenderSlides } from '@/lib/slides';

import { useDocumentsContext } from '@/packages/documents/components/documents-provider';
import { SlideRenderer } from '@/packages/documents/components/slide-renderer';
import { SlidesNavigation } from '@/packages/documents/components/slides-navigation';
import { SlidesProgress } from '@/packages/documents/components/slides-progress';

type SlidesPresentationProps = {
  markdown?: string;
  documentName?: string;
  className?: string;
};

export function SlidesPresentation({
  markdown,
  documentName,
  className,
}: SlidesPresentationProps) {
  const { current } = useDocumentsContext();

  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHintOnMount, setShowHintOnMount] = useState(false);

  const effectiveMarkdown = markdown ?? current?.content ?? '';
  const effectiveDocumentName = documentName ?? current?.name;

  useEffect(() => {
    const processSlides = async () => {
      try {
        setLoading(true);
        setError(null);
        const parsedSlides = await parseAndRenderSlides(effectiveMarkdown, effectiveDocumentName);
        setSlides(parsedSlides);
        setCurrentSlideIndex(0);
      } catch (err) {
        console.error('Error processing slides:', err);
        setError('Failed to process slides. Please check your markdown format.');
      } finally {
        setLoading(false);
      }
    };

    if (effectiveMarkdown?.trim()) {
      processSlides();
    } else {
      setSlides([]);
      setLoading(false);
    }
  }, [effectiveDocumentName, effectiveMarkdown]);

  useEffect(() => {
    if (slides.length > 0 && !loading) {
      setShowHintOnMount(true);
      const timer = setTimeout(() => setShowHintOnMount(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowHintOnMount(false);
    }
  }, [loading, slides.length]);

  const goToNextSlide = useCallback(() => {
    setCurrentSlideIndex(prev => Math.min(prev + 1, slides.length - 1));
  }, [slides.length]);

  const goToPreviousSlide = useCallback(() => {
    setCurrentSlideIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      setCurrentSlideIndex(Math.max(0, Math.min(index, slides.length - 1)));
    },
    [slides.length]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (slides.length === 0) return;

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          goToPreviousSlide();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          event.preventDefault();
          goToNextSlide();
          break;
        case 'Home':
          event.preventDefault();
          goToSlide(0);
          break;
        case 'End':
          event.preventDefault();
          goToSlide(slides.length - 1);
          break;
        default: {
          const slideNumber = parseInt(event.key, 10);
          if (
            !Number.isNaN(slideNumber) &&
            slideNumber >= 1 &&
            slideNumber <= Math.min(9, slides.length)
          ) {
            event.preventDefault();
            goToSlide(slideNumber - 1);
          }
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goToNextSlide, goToPreviousSlide, goToSlide, slides.length]);

  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (event: TouchEvent) => {
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!startX || !startY) return;

      const endX = event.changedTouches[0].clientX;
      const endY = event.changedTouches[0].clientY;
      const diffX = startX - endX;
      const diffY = startY - endY;
      const minSwipeDistance = 50;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
        if (diffX > 0) {
          goToNextSlide();
        } else {
          goToPreviousSlide();
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [goToNextSlide, goToPreviousSlide]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className ?? ''}`}>
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-8 shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Processing slides...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${className ?? ''}`}>
        <div className="max-w-md rounded-lg border border-destructive/40 bg-destructive/10 px-6 py-5 text-center shadow-sm">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <p className="mt-2 text-xs text-destructive/80">
            Make sure your markdown contains slide separators (---) to create multiple slides.
          </p>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className ?? ''}`}>
        <div className="max-w-md rounded-lg border bg-card px-6 py-8 text-center shadow-sm">
          <p className="text-base font-medium text-foreground">No slides found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add content to your document and use &quot;---&quot; to separate slides.
          </p>
        </div>
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];

  return (
    <>
      <div className={`h-full flex flex-col ${className ?? ''}`}>
        <div className="flex-1 min-h-0 rounded-lg border bg-background shadow-sm">
          <SlideRenderer slide={currentSlide} className="h-full" />
        </div>

        <div className="shrink-0 border-t bg-muted/50 p-4 backdrop-blur-sm">
          <div className="space-y-3">
            <SlidesNavigation
              currentSlide={currentSlideIndex + 1}
              totalSlides={slides.length}
              onNext={goToNextSlide}
              onPrevious={goToPreviousSlide}
            />
            <SlidesProgress currentSlide={currentSlideIndex + 1} totalSlides={slides.length} />
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-50">
        <Tooltip defaultOpen={showHintOnMount} delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition-all duration-200 hover:bg-black/85 cursor-pointer">
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="w-48 p-3">
            <div className="mb-1 text-center text-muted-foreground">Keyboard shortcuts</div>
            <div className="space-y-1">
              <div>← → : Navigate</div>
              <div>Space : Next slide</div>
              <div>1-9 : Go to slide</div>
              <div>Home/End : First/Last</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}

