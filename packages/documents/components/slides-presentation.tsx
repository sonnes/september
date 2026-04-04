'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ArrowsPointingOutIcon,
  PauseIcon,
  PlayIcon,
  QuestionMarkCircleIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from '@heroicons/react/24/outline';

import { ReelTextViewer } from '@september/audio';
import { Button } from '@september/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@september/ui/components/tooltip';

import { slideToPlainText, type Slide, parseAndRenderSlides } from '@september/shared/lib/slides';
import { SlidesNavigation } from '@september/documents/components/slides-navigation';
import { SlidesProgress } from '@september/documents/components/slides-progress';
import { useSlideVoiceOver } from '@september/documents/hooks/use-slide-voice-over';
import { useDocuments } from '@september/documents/hooks/use-documents';

type SlidesPresentationProps = {
  markdown?: string;
  documentName?: string;
  className?: string;
  documentId?: string;
  defaultVoiceOver?: boolean;
  defaultAutoPlay?: boolean;
  showFullscreenButton?: boolean;
};

export function SlidesPresentation({
  markdown,
  documentName,
  className,
  documentId,
  defaultVoiceOver = false,
  defaultAutoPlay = false,
  showFullscreenButton = true,
}: SlidesPresentationProps) {
  const { documents } = useDocuments();
  const current = documentId ? documents.find(doc => doc.id === documentId) || null : null;

  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHintOnMount, setShowHintOnMount] = useState(false);
  const [isVoiceOver, setIsVoiceOver] = useState(defaultVoiceOver);
  const [isAutoPlay, setIsAutoPlay] = useState(defaultAutoPlay);

  // Ref so the speak onEnd callback always reads the latest autoplay value
  const isAutoPlayRef = useRef(isAutoPlay);
  useEffect(() => {
    isAutoPlayRef.current = isAutoPlay;
  }, [isAutoPlay]);

  const containerRef = useRef<HTMLDivElement>(null);
  const { speak, stop, isGenerating, alignment, currentTime, duration } = useSlideVoiceOver();

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

  // Speak the current slide whenever the index changes (or voice-over is toggled on)
  useEffect(() => {
    if (!isVoiceOver || slides.length === 0 || loading) {
      stop();
      return;
    }

    const text = slideToPlainText(slides[currentSlideIndex]?.content ?? '');

    speak(text, () => {
      if (isAutoPlayRef.current) {
        setCurrentSlideIndex(prev => Math.min(prev + 1, slides.length - 1));
      }
    });

    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlideIndex, isVoiceOver, slides, loading]);

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

  const handleVoiceToggle = useCallback(() => {
    setIsVoiceOver(prev => {
      if (prev) stop();
      return !prev;
    });
  }, [stop]);

  const handleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

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
      <div ref={containerRef} className={`h-full flex flex-col ${className ?? ''}`}>
        {/* Slide area */}
        <div className="relative flex-1 min-h-0 rounded-lg border bg-background shadow-sm overflow-hidden">
          <ReelTextViewer
            text={slideToPlainText(currentSlide.content)}
            alignment={isVoiceOver ? alignment : undefined}
            currentTime={currentTime}
            duration={duration}
            className="h-full text-foreground"
          />
        </div>

        {/* Controls bar */}
        <div className="shrink-0 border-t bg-muted/50 p-4 backdrop-blur-sm">
          <div className="space-y-3">
            {/* Voice-over + autoplay + fullscreen row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={isVoiceOver ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleVoiceToggle}
                  title={isVoiceOver ? 'Turn off voice-over' : 'Turn on voice-over'}
                >
                  {isVoiceOver ? (
                    <SpeakerWaveIcon className="h-4 w-4" />
                  ) : (
                    <SpeakerXMarkIcon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isGenerating ? 'Generating…' : 'Voice'}
                  </span>
                </Button>

                <Button
                  type="button"
                  variant={isAutoPlay ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsAutoPlay(p => !p)}
                  disabled={!isVoiceOver}
                  title={isAutoPlay ? 'Disable autoplay' : 'Enable autoplay'}
                >
                  {isAutoPlay ? (
                    <PauseIcon className="h-4 w-4" />
                  ) : (
                    <PlayIcon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Auto</span>
                </Button>
              </div>

              {showFullscreenButton && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFullscreen}
                  title="Toggle fullscreen"
                >
                  <ArrowsPointingOutIcon className="h-4 w-4" />
                </Button>
              )}
            </div>

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
