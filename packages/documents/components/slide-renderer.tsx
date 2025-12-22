'use client';

import { Slide } from '@/lib/slides';

type SlideRendererProps = {
  slide: Slide;
  className?: string;
};

export function SlideRenderer({ slide, className }: SlideRendererProps) {
  return (
    <div
      className={`
        w-full h-full flex flex-col justify-center items-center
        p-8 md:p-12 lg:p-16
        bg-background text-foreground
        overflow-y-auto
        ${className ?? ''}
      `}
    >
      <div
        className="
          prose prose-lg md:prose-xl lg:prose-2xl
          prose-headings:text-foreground prose-headings:font-bold
          prose-h1:text-4xl md:prose-h1:text-5xl lg:prose-h1:text-6xl
          prose-h2:text-3xl md:prose-h2:text-4xl lg:prose-h2:text-5xl
          prose-h3:text-2xl md:prose-h3:text-3xl lg:prose-h3:text-4xl
          prose-p:text-muted-foreground prose-p:leading-relaxed
          prose-strong:text-foreground
          prose-em:text-foreground/90
          prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded
          prose-pre:bg-muted prose-pre:border prose-pre:border-border
          prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4
          prose-ul:list-disc prose-ol:list-decimal
          prose-li:text-muted-foreground
          prose-img:rounded-lg prose-img:shadow-md
          prose-hr:border-border
          prose-table:border-collapse prose-table:border prose-table:border-border
          prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-3
          prose-td:border prose-td:border-border prose-td:p-3
          max-w-none w-full text-center
          [&>*:first-child]:mt-0
          [&>*:last-child]:mb-0
        "
        dangerouslySetInnerHTML={{ __html: slide.html }}
      />
    </div>
  );
}

