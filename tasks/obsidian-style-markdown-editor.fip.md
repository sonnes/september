# Feature Implementation Plan: Obsidian-Style Markdown Editor

## Introduction/Overview

This feature enhances the existing markdown editor in `components/markdown/editor.tsx` to provide an Obsidian-style experience using Tiptap with the [`tiptap-markdown`](https://github.com/aguingand/tiptap-markdown) extension. The editor will provide real-time WYSIWYG editing with subtle syntax highlighting, where markdown characters are dimmed but visible. It will be integrated into `/app/write/editor.tsx` and maintain the current auto-save functionality while supporting basic markdown formatting including headers, bold, italic, links, and lists.

The editor will be designed with a minimal, clean aesthetic that matches the existing app design, with full accessibility support and mobile responsiveness.

## Goals

1. **Enhance Existing Editor**: Build upon the current `components/markdown/editor.tsx` with Obsidian-style features
2. **Real-time WYSIWYG**: Provide immediate visual feedback as users type markdown syntax
3. **Subtle Syntax Highlighting**: Implement Obsidian-style dimmed markdown characters for clean visual hierarchy
4. **Basic Markdown Support**: Support headers (H1-H6), bold, italic, links, ordered/unordered lists
5. **Markdown Serialization**: Use tiptap-markdown for seamless conversion between markdown and editor content
6. **Performance**: Handle large documents efficiently with smooth typing experience
7. **Accessibility**: Full keyboard navigation and screen reader compatibility
8. **Mobile Responsive**: Ensure excellent mobile editing experience
9. **Auto-save Integration**: Maintain existing automatic save functionality with markdown format

## User Stories

### Primary User Story

**As a writer using the app**, I want to write and edit content using familiar markdown syntax with real-time visual formatting, so that I can focus on content creation without switching between raw markdown and preview modes.

### Supporting User Stories

1. **As a user typing headers**, I want to see `# Header` immediately styled as a large header with the `#` symbol dimmed, so I understand the hierarchy while maintaining clean visuals.

2. **As a user formatting text**, I want to type `**bold**` and see it immediately become bold with the asterisks dimmed, so I can quickly format without breaking my writing flow.

3. **As a user creating lists**, I want to type `- item` or `1. item` and have it automatically format as proper lists, so I can organize my thoughts efficiently.

4. **As a user pasting markdown content**, I want to paste markdown text and have it automatically render with proper formatting, so I can import content from other markdown sources.

5. **As a mobile user**, I want the editor to work smoothly on my phone with proper touch interactions, so I can write on-the-go.

6. **As a user with accessibility needs**, I want to navigate the editor entirely with keyboard shortcuts and have proper screen reader support, so I can use the app effectively.

7. **As a user working with long documents**, I want the editor to remain responsive even with thousands of words, so I can work on substantial pieces without performance issues.

## Relevant Files

- `components/markdown/editor.tsx` - Enhanced Tiptap editor component with Obsidian-style features and markdown support
- `types/editor.ts` - Updated interface definitions for enhanced editor functionality including new props and hook types
- `lib/tiptap/markdown-config.ts` - Configuration for tiptap-markdown extension with optimal settings for Obsidian-style editing
- `hooks/useMarkdownEditor.ts` - Custom hook for managing enhanced markdown editor functionality with debouncing and auto-save
- `package.json` - Updated dependencies with tiptap-markdown and @tiptap/extension-typography packages
- `app/write/editor.tsx` - Page component that will integrate the enhanced markdown editor (to be updated)
- `components/markdown/context.tsx` - Context for markdown editor (to be updated)
- `lib/tiptap/syntax-highlighting.css` - CSS styles for Obsidian-style syntax highlighting with dimmed syntax characters
- `lib/tiptap/syntax-decorations.ts` - Custom Tiptap extension for applying syntax highlighting decorations
- `app/globals.css` - Updated global styles to include syntax highlighting CSS import

## Tasks

- [x] 1.0 Set up Enhanced Tiptap Dependencies

  - [x] 1.1 Install tiptap-markdown extension for markdown support
  - [x] 1.2 Install additional Tiptap extensions (@tiptap/extension-typography for enhanced typography)
  - [x] 1.3 Create tiptap-markdown configuration file with optimal settings
  - [x] 1.4 Update TypeScript types for enhanced editor functionality

- [x] 2.0 Enhance Existing Markdown Editor Component

  - [x] 2.1 Update `components/markdown/editor.tsx` to include tiptap-markdown extension
  - [x] 2.2 Configure tiptap-markdown extension with options (html: true, tightLists: true, transformPastedText: true)
  - [x] 2.3 Enhance existing StarterKit configuration for optimal markdown support
  - [x] 2.4 Update onContentChange to use `editor.storage.markdown.getMarkdown()` for markdown serialization
  - [x] 2.5 Modify content prop handling to support markdown input via `editor.commands.setContent()`
  - [x] 2.6 Create custom hook `useMarkdownEditor.ts` for enhanced editor state management

- [x] 3.0 Add Obsidian-Style Syntax Highlighting and Styling

  - [x] 3.1 Create custom CSS classes for dimmed markdown syntax characters (#, \*\*, \_\_, [], etc.)
  - [x] 3.2 Implement custom Tiptap node views or decorations for syntax character styling
  - [x] 3.3 Enhance header styling with appropriate font sizes while keeping # visible but dimmed
  - [x] 3.4 Style bold and italic text with proper visual hierarchy while dimming markup characters
  - [x] 3.5 Style links with appropriate colors and hover states while dimming bracket notation
  - [x] 3.6 Style lists with proper indentation and bullet/number styling while dimming list markers
  - [x] 3.7 Update prose classes to work with Obsidian-style syntax highlighting
  - [x] 3.8 Ensure all styling matches current app design system and maintains readability

- [ ] 4.0 Integrate Enhanced Editor with App Architecture

  - [ ] 4.1 Update `app/write/editor.tsx` to use enhanced markdown editor component
  - [ ] 4.2 Update `types/editor.ts` MarkdownEditorProps interface for new functionality
  - [ ] 4.3 Integrate auto-save functionality using markdown serialization from enhanced editor
  - [ ] 4.4 Update content loading/saving to use markdown format throughout the app
  - [ ] 4.5 Update `components/markdown/context.tsx` to work with enhanced Tiptap editor instance
  - [ ] 4.6 Preserve existing editor state management and routing integration
  - [ ] 4.7 Handle content migration from existing HTML format to markdown format

- [ ] 5.0 Implement Accessibility and Mobile Support

  - [x] 5.1 Enhance existing editor props for full keyboard navigation support
  - [x] 5.2 Add proper ARIA labels and roles for screen reader compatibility
  - [x] 5.3 Implement keyboard shortcuts for common markdown formatting (Ctrl+B, Ctrl+I, etc.)
  - [x] 5.4 Optimize existing touch interactions for mobile devices with markdown support
  - [x] 5.5 Ensure responsive design enhancements work across different screen sizes
  - [ ] 5.6 Test and fix any mobile-specific text input issues with markdown parsing

- [ ] 6.0 Performance Optimization
  - [ ] 6.1 Implement debouncing for auto-save functionality with markdown serialization
  - [ ] 6.2 Optimize tiptap-markdown configuration for large document handling
  - [ ] 6.3 Configure tightLists and other performance-related options in tiptap-markdown
  - [ ] 6.4 Enhance existing editor cleanup for proper memory management
  - [ ] 6.5 Optimize CSS for smooth rendering performance with syntax highlighting

## Open Questions

1. **MarkdownEditorProps Interface**: Should we extend the existing `MarkdownEditorProps` interface or create a new interface for the enhanced functionality?

2. **Content Format Migration**: How should we handle the transition from HTML content (currently returned by `editor.getHTML()`) to markdown content for existing users?

3. **tiptap-markdown Configuration**: Should we enable `transformCopiedText: true` to allow copying formatted text as markdown, or keep it false for simpler behavior?

4. **HTML Support**: Should we enable `html: true` in tiptap-markdown to allow HTML mixed with markdown, or keep it false for pure markdown experience?

5. **Prose Classes**: Should we modify the existing `prose dark:prose-invert` classes or create new classes specifically for the Obsidian-style syntax highlighting?

6. **Backward Compatibility**: Do we need to maintain backward compatibility with the current HTML-based content format, or can we migrate all content to markdown?
