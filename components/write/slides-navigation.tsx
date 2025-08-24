'use client';

import React from 'react';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';

interface SlidesNavigationProps {
  currentSlide: number;
  totalSlides: number;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

export default function SlidesNavigation({
  currentSlide,
  totalSlides,
  onPrevious,
  onNext,
  className = '',
}: SlidesNavigationProps) {
  const isFirstSlide = currentSlide === 1;
  const isLastSlide = currentSlide === totalSlides;

  return (
    <div className={`flex items-center justify-center gap-4 ${className}`}>
      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={onPrevious}
        disabled={isFirstSlide}
        icon={<ChevronLeftIcon className="h-5 w-5" />}
        className={`
          bg-white/90 backdrop-blur-sm border-gray-300 hover:bg-gray-50
          disabled:opacity-40 disabled:cursor-not-allowed
          shadow-lg hover:shadow-xl transition-all duration-200
          ${isFirstSlide ? 'invisible' : ''}
        `}
      >
        <span className="hidden sm:inline">Previous</span>
      </Button>

      <div className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-300 shadow-lg">
        <span className="text-sm font-medium text-gray-700">
          {currentSlide}
        </span>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm text-gray-500">{totalSlides}</span>
      </div>

      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={onNext}
        disabled={isLastSlide}
        icon={<ChevronRightIcon className="h-5 w-5" />}
        className={`
          bg-white/90 backdrop-blur-sm border-gray-300 hover:bg-gray-50
          disabled:opacity-40 disabled:cursor-not-allowed
          shadow-lg hover:shadow-xl transition-all duration-200
          ${isLastSlide ? 'invisible' : ''}
        `}
      >
        <span className="hidden sm:inline">Next</span>
      </Button>
    </div>
  );
}