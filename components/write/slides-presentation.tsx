'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

import { useDocumentsContext } from '@/components/context/documents-provider';

import { type Slide, parseAndRenderSlides } from '@/lib/slides';

import SlideRenderer from './slide-renderer';
import SlidesNavigation from './slides-navigation';
import SlidesProgress from './slides-progress';

interface SlidesPresentationProps {
  markdown?: string;
  documentName?: string;
  className?: string;
}

export default function SlidesPresentation({
  markdown,
  documentName,
  className = '',
}: SlidesPresentationProps) {
  const { current } = useDocumentsContext();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHintOnMount, setShowHintOnMount] = useState(false);

  // Use context document if no markdown prop provided
  const effectiveMarkdown = markdown ?? current?.content ?? '';
  const effectiveDocumentName = documentName ?? current?.name;

  // Parse markdown into slides
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
  }, [effectiveMarkdown, effectiveDocumentName]);

  // Show hint briefly on mount after slides are loaded
  useEffect(() => {
    if (slides.length > 0 && !loading) {
      setShowHintOnMount(true);
      const timer = setTimeout(() => {
        setShowHintOnMount(false);
      }, 3000); // Show for 3 seconds

      return () => clearTimeout(timer);
    }
  }, [slides.length, loading]);

  // Navigation functions
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

  // Keyboard navigation
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
        default:
          // Check for number keys (1-9)
          const slideNumber = parseInt(event.key);
          if (
            !isNaN(slideNumber) &&
            slideNumber >= 1 &&
            slideNumber <= Math.min(9, slides.length)
          ) {
            event.preventDefault();
            goToSlide(slideNumber - 1);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [slides.length, goToNextSlide, goToPreviousSlide, goToSlide]);

  // Touch/swipe navigation
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!startX || !startY) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = startX - endX;
      const diffY = startY - endY;

      // Minimum swipe distance
      const minSwipeDistance = 50;

      // Check if horizontal swipe is more significant than vertical
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
        if (diffX > 0) {
          // Swipe left - next slide
          goToNextSlide();
        } else {
          // Swipe right - previous slide
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
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-zinc-600">Processing slides...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center max-w-md">
          <p className="text-indigo-600 mb-4">{error}</p>
          <p className="text-zinc-500 text-sm">
            Make sure your markdown contains slide separators (---) to create multiple slides.
          </p>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center max-w-md">
          <p className="text-zinc-600 mb-4">No slides found</p>
          <p className="text-zinc-500 text-sm">
            Add content to your document and use &quot;---&quot; to separate slides.
          </p>
        </div>
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];

  return (
    <>
      <div className={`h-full flex flex-col ${className}`}>
        {/* Slide Content */}
        <div className="flex-1 min-h-0 relative">
          <SlideRenderer slide={currentSlide} className="h-full" />
        </div>

        {/* Navigation and Progress */}
        <div className="shrink-0 p-4 space-y-4 bg-zinc-50/80 backdrop-blur-sm border-t border-zinc-200">
          {/* Navigation Controls */}
          <SlidesNavigation
            currentSlide={currentSlideIndex + 1}
            totalSlides={slides.length}
            onNext={goToNextSlide}
            onPrevious={goToPreviousSlide}
          />

          {/* Progress Bar */}
          <SlidesProgress currentSlide={currentSlideIndex + 1} totalSlides={slides.length} />
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="fixed top-4 right-4 z-50 group">
        {/* Question mark icon - always visible */}
        <div className="flex items-center justify-center w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full shadow-lg transition-all duration-200 cursor-help">
          <QuestionMarkCircleIcon className="w-5 h-5" />
        </div>

        {/* Keyboard shortcuts tooltip */}
        <div
          className={`
            absolute top-10 right-0 bg-black/90 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-zinc-600 whitespace-nowrap
            transition-all duration-300 transform
            ${
              showHintOnMount
                ? 'opacity-100 scale-100 pointer-events-auto'
                : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'
            }
          `}
        >
          <div className="text-center text-zinc-200 mb-1 font-medium">Keyboard Shortcuts</div>
          <div className="space-y-1">
            <div>← → : Navigate</div>
            <div>Space : Next slide</div>
            <div>1-9 : Go to slide</div>
            <div>Home/End : First/Last</div>
          </div>
          {/* Arrow pointing to icon */}
          <div className="absolute -top-1 right-3 w-2 h-2 bg-black/90 border-l border-t border-zinc-600 rotate-45"></div>
        </div>
      </div>
    </>
  );
}
