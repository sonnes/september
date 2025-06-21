import { MarkdownOptions } from 'tiptap-markdown';

/**
 * Configuration for tiptap-markdown extension optimized for Obsidian-style editing
 */
export const markdownConfig: Partial<MarkdownOptions> = {
  // Enable HTML support for more flexibility
  html: true,

  // Enable tight lists for better markdown output formatting
  tightLists: true,

  // Transform pasted text to markdown format automatically
  transformPastedText: true,

  // Transform copied text to markdown format
  transformCopiedText: true,

  // Link options for better link handling
  linkify: true,
};

/**
 * Default markdown content for new documents
 */
export const defaultMarkdownContent = `# Welcome to your markdown editor

Start writing your thoughts here. You can use:

- **Bold text** with double asterisks
- *Italic text* with single asterisks
- [Links](https://example.com) with bracket notation
- Lists like this one

## Headers work too

Just start a line with # for headers. The more #'s, the smaller the header.

---

Happy writing! 🚀`;
