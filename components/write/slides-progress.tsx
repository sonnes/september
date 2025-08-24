'use client';

import React from 'react';

interface SlidesProgressProps {
  currentSlide: number;
  totalSlides: number;
  className?: string;
}

export default function SlidesProgress({
  currentSlide,
  totalSlides,
  className = '',
}: SlidesProgressProps) {
  const progressPercentage = totalSlides > 0 ? (currentSlide / totalSlides) * 100 : 0;

  return (
    <div className={`w-full ${className}`}>
      {/* Progress Bar */}
      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden shadow-inner">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Progress Text (optional, can be shown on hover or always) */}
      <div className="mt-2 text-center">
        <span className="text-xs text-gray-500 font-medium">
          {Math.round(progressPercentage)}% Complete
        </span>
      </div>
    </div>
  );
}