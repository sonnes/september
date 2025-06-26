# Markdown Editor Autocomplete Feature - FIP

## Introduction/Overview

This feature implements an intelligent autocomplete system for the markdown editor that enhances user productivity by providing contextual suggestions as they write. The autocomplete will offer inline ghost text suggestions that appear after a pause in typing, helping users speed up their writing while providing smart contextual content suggestions based on the entire document context.

The feature will integrate seamlessly with the existing TipTap-based markdown editor, using server actions to generate high-quality suggestions within 500ms response time.

## Goals

1. **Enhance Writing Speed**: Reduce typing effort by 20-30% through intelligent word/phrase completion
2. **Improve Writing Quality**: Provide contextually relevant suggestions that enhance content flow
3. **Seamless User Experience**: Deliver suggestions with <500ms latency using debounced input
4. **Comprehensive Suggestion Types**: Support word completions, markdown syntax, smart content, and templates
5. **Non-Intrusive Interface**: Use inline ghost text that doesn't disrupt the writing flow
6. **Document-Aware Intelligence**: Generate suggestions based on full document context for better relevance

## User Stories

### Story 1: Speed Writing

**As a** content writer  
**I want** to see intelligent word and phrase suggestions as I type  
**So that** I can write faster and maintain my flow of thought without stopping to think of the right words

### Story 2: Markdown Assistance

**As a** user writing markdown content  
**I want** to get suggestions for markdown syntax and formatting  
**So that** I can focus on content rather than remembering markdown syntax

### Story 3: Contextual Intelligence

**As a** user writing a long document  
**I want** suggestions that are aware of what I've already written  
**So that** the suggestions are relevant and maintain consistency with my existing content

### Story 4: Template Efficiency

**As a** user writing structured content  
**I want** to get template and snippet suggestions  
**So that** I can quickly insert common patterns and structures

### Story 5: Quick Acceptance

**As a** user receiving a good suggestion  
**I want** to accept it with a simple Tab key press  
**So that** I can maintain my typing rhythm without breaking focus

## Tasks

### Server Action Development

- Create server action for generating autocomplete suggestions
- Implement context analysis using the entire document content
- Build suggestion algorithms for different types (words, syntax, content, templates)
- Optimize for <500ms response time requirements

### TipTap Extension Creation

- Develop AutocompleteExtension following the provided example pattern
- Implement debounced suggestion fetching (1500ms default)
- Create inline ghost text rendering system
- Handle Tab key acceptance mechanism

### Editor Integration

- Integrate AutocompleteExtension into the existing MarkdownEditor component
- Ensure compatibility with existing extensions (StarterKit, Typography, etc.)
- Add proper styling for suggestion ghost text
- Test integration with current editor features

### Performance Optimization

- Implement efficient text extraction and context building
- Add request deduplication and caching where appropriate
- Optimize suggestion rendering performance
- Monitor and ensure <500ms suggestion delivery

### User Experience Polish

- Add visual feedback for suggestion states (loading, available, accepted)
- Ensure suggestions don't interfere with existing editor functionality
- Handle edge cases (empty documents, special characters, etc.)
- Test across different content types and document lengths

## Open Questions

1. **Suggestion Prioritization**: Should we implement a ranking system for different types of suggestions, or treat them equally?

2. **Offline Fallback**: Do we need a fallback mechanism when the server action fails or is slow?

3. **User Customization**: Should users be able to adjust the debounce timing or disable certain types of suggestions?

4. **Analytics**: Do we want to track suggestion acceptance rates to improve the algorithm over time?

5. **Multi-language Support**: Should the initial implementation consider non-English content, or focus on English first?

6. **Memory Management**: For very long documents, should we implement a sliding window approach to limit context size sent to the server?

---

## Relevant Files

- `app/app/write/markdown/editor.tsx` - Main markdown editor component that needs the autocomplete extension integration
- `app/actions/suggestions.ts` - New server action file for generating autocomplete suggestions
- `app/app/write/markdown/autocomplete-extension.ts` - Complete TipTap extension implementing the autocomplete functionality with robust error handling
- `app/api/suggestions/route.ts` - Existing API route that may need modification or can be used as reference
- `lib/tiptap/markdown-config.ts` - Configuration file that may need updates for autocomplete compatibility
- `types/editor.ts` - Type definitions that may need extension for autocomplete props
- `app/globals.css` - Styling for autocomplete ghost text and visual states

## Tasks

- [ ] 1.0 Create Server Action for Autocomplete Suggestions

  - [x] 1.1 Create `app/actions/suggestions.ts` with server action function
  - [x] 1.2 Implement Gemini AI integration for suggestion generation
  - [x] 1.3 Build word/phrase completion algorithm using Gemini AI
  - [ ] 1.4 Add markdown syntax suggestion logic (headers, links, lists, etc.)
  - [ ] 1.5 Implement smart content suggestions based on document themes/topics
  - [ ] 1.6 Create template/snippet suggestion system for common patterns
  - [ ] 1.7 Optimize suggestion generation for <500ms response time
  - [ ] 1.8 Add error handling and fallback responses

- [x] 2.0 Develop TipTap Autocomplete Extension

  - [x] 2.1 Create `app/app/write/markdown/autocomplete-extension.ts` based on provided example
  - [x] 2.2 Implement debounced suggestion fetching with 1500ms default delay
  - [x] 2.3 Create inline ghost text decoration system using ProseMirror decorations
  - [x] 2.4 Add Tab key handler for suggestion acceptance
  - [x] 2.5 Implement cursor position detection and suggestion placement logic
  - [x] 2.6 Add suggestion clearing logic when cursor moves or content changes
  - [x] 2.7 Handle edge cases (empty suggestions, network errors, etc.)

- [ ] 3.0 Integrate Extension into Markdown Editor

  - [x] 3.1 Add AutocompleteExtension to the extensions array in `editor.tsx`
  - [x] 3.2 Pass necessary props and configuration options to the extension
  - [x] 3.3 Replace dummy suggestion function with real server action integration
  - [ ] 3.4 Ensure compatibility with existing extensions (StarterKit, Typography, etc.)
  - [ ] 3.5 Test extension loading and initialization
  - [ ] 3.6 Verify no conflicts with current editor functionality

- [ ] 4.0 Styling and Visual Implementation

  - [ ] 4.1 Add CSS classes for autocomplete ghost text in `app/globals.css`
  - [ ] 4.2 Style suggestion text with appropriate opacity and color
  - [ ] 4.3 Ensure ghost text is visually distinct but not distracting
  - [ ] 4.4 Add loading states and visual feedback
  - [ ] 4.5 Test styling in both light and dark themes
  - [ ] 4.6 Ensure accessibility compliance for suggestion visibility

- [ ] 5.0 Performance Optimization and Testing
  - [ ] 5.1 Implement request deduplication to avoid redundant API calls
  - [ ] 5.2 Add client-side caching for recently generated suggestions
  - [ ] 5.3 Optimize text extraction and context building algorithms
  - [ ] 5.4 Test performance with documents of varying lengths
  - [ ] 5.5 Verify <500ms suggestion delivery requirement is met
  - [ ] 5.6 Add monitoring and logging for performance metrics
  - [ ] 5.7 Test memory usage and cleanup on long editing sessions
