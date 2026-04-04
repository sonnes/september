import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';

export interface Slide {
  id: number;
  content: string;
  html: string;
}

export function parseMarkdownToSlides(markdown: string, documentName?: string): Slide[] {
  if (!markdown?.trim()) {
    return [];
  }

  // Split by horizontal rules (--- or ***)
  const slideContents = markdown
    .split(/^---+\s*$|^\*\*\*+\s*$/m)
    .map(content => content.trim())
    .filter(content => content.length > 0);

  // If no separators found, treat entire content as one slide
  if (slideContents.length === 1 && !markdown.includes('---') && !markdown.includes('***')) {
    slideContents[0] = markdown.trim();
  }

  // Add document name as first slide if provided
  const allSlides = [];
  if (documentName?.trim()) {
    allSlides.push(`# ${documentName}`);
  }
  allSlides.push(...slideContents);

  return allSlides.map((content, index) => ({
    id: index + 1,
    content,
    html: '', // Will be populated by renderSlideToHtml
  }));
}

export async function renderSlideToHtml(slideContent: string): Promise<string> {
  const processor = remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false });

  try {
    const result = await processor.process(slideContent);
    return String(result);
  } catch (error) {
    console.error('Error rendering slide:', error);
    return `<div class="error">Error rendering slide content</div>`;
  }
}

export async function parseAndRenderSlides(markdown: string, documentName?: string): Promise<Slide[]> {
  const slides = parseMarkdownToSlides(markdown, documentName);

  const renderedSlides = await Promise.all(
    slides.map(async (slide) => ({
      ...slide,
      html: await renderSlideToHtml(slide.content),
    }))
  );

  return renderedSlides;
}

/**
 * Strips markdown syntax from slide content to produce plain readable text for TTS.
 */
export function slideToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/!\[([^\]]*)\]\([^\)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^\)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_\n]+)_{1,3}/g, '$1')
    .replace(/^>\s*/gm, '')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    .replace(/^---+\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}