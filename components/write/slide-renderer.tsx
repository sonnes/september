'use client';

import React from 'react';

import { Slide } from '@/lib/slides';

interface SlideRendererProps {
  slide: Slide;
  className?: string;
}

export default function SlideRenderer({ slide, className = '' }: SlideRendererProps) {
  return (
    <div
      className={`
        w-full h-full flex flex-col justify-center items-center
        p-8 md:p-12 lg:p-16
        bg-white text-zinc-900
        overflow-y-auto
        ${className}
      `}
    >
      <div
        className="
          prose prose-lg md:prose-xl lg:prose-2xl
          prose-headings:text-zinc-900 prose-headings:font-bold
          prose-h1:text-4xl md:prose-h1:text-5xl lg:prose-h1:text-6xl
          prose-h2:text-3xl md:prose-h2:text-4xl lg:prose-h2:text-5xl
          prose-h3:text-2xl md:prose-h3:text-3xl lg:prose-h3:text-4xl
          prose-p:text-zinc-700 prose-p:leading-relaxed
          prose-strong:text-zinc-900
          prose-em:text-zinc-800
          prose-code:bg-zinc-100 prose-code:px-2 prose-code:py-1 prose-code:rounded
          prose-pre:bg-zinc-100 prose-pre:border prose-pre:border-zinc-200
          prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:pl-4
          prose-ul:list-disc prose-ol:list-decimal
          prose-li:text-zinc-700
          prose-img:rounded-lg prose-img:shadow-md
          prose-hr:border-zinc-300
          prose-table:border-collapse prose-table:border prose-table:border-zinc-300
          prose-th:border prose-th:border-zinc-300 prose-th:bg-zinc-100 prose-th:p-3
          prose-td:border prose-td:border-zinc-300 prose-td:p-3
          max-w-none w-full text-center
          [&>*:first-child]:mt-0
          [&>*:last-child]:mb-0
        "
        dangerouslySetInnerHTML={{ __html: slide.html }}
      />
    </div>
  );
}