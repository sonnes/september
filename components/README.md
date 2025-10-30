# Components Directory

This directory contains all React components for September, organized by feature and function.

## Purpose

Feature-based component organization following Next.js App Router best practices. Components are split into Client Components (with `"use client"`) and Server Components.

## Directory Structure

### Core UI Components

**[ui/](ui/)** - Reusable base UI components

- Form components: [form.tsx](ui/form.tsx), [text-input.tsx](ui/text-input.tsx), [textarea-input.tsx](ui/textarea-input.tsx)
- Interactive: [button.tsx](ui/button.tsx), [checkbox.tsx](ui/checkbox.tsx), [dropdown.tsx](ui/dropdown.tsx)
- Feedback: [alert.tsx](ui/alert.tsx), [animated-text.tsx](ui/animated-text.tsx)
- File handling: [file-upload.tsx](ui/file-upload.tsx), [file-uploader.tsx](ui/file-uploader.tsx)

All forms must use components from [ui/form.tsx](ui/form.tsx) with `react-hook-form` and `zod` validation.

### Feature Components

**[talk/](talk/)** - Conversation interface components

- [message-list.tsx](talk/message-list.tsx) - Display conversation messages
- [recorder.tsx](talk/recorder.tsx) - Audio recording with VAD
- [play-button.tsx](talk/play-button.tsx) - Message playback controls
- [mute-button.tsx](talk/mute-button.tsx) - Audio muting
- [talk-actions.tsx](talk/talk-actions.tsx) - Action buttons for conversation

**[write/](write/)** - Document editor and presentation components

- [document.tsx](write/document.tsx) - Document list and management
- [sidebar.tsx](write/sidebar.tsx) - Editor sidebar
- [upload-form.tsx](write/upload-form.tsx) - Document upload interface
- [slide-renderer.tsx](write/slide-renderer.tsx) - Render slides from markdown
- [slides-presentation.tsx](write/slides-presentation.tsx) - Full-screen presentation mode
- [slides-navigation.tsx](write/slides-navigation.tsx) - Slide navigation controls
- [slides-progress.tsx](write/slides-progress.tsx) - Progress indicator

**[editor/](editor/)** - Text editing components

- [simple.tsx](editor/simple.tsx) - Simple textarea editor
- [tiptap-editor.tsx](editor/tiptap-editor.tsx) - Rich text editor with Tiptap
- [autocomplete.tsx](editor/autocomplete.tsx) - Autocomplete UI for editor
- [suggestions.tsx](editor/suggestions.tsx) - Suggestion display and selection

**[voices/](voices/)** - Voice management components

- [voices-list.tsx](voices/voices-list.tsx) - List all available voices
- [voices-page-wrapper.tsx](voices/voices-page-wrapper.tsx) - Page wrapper with context

**[settings/](settings/)** - Settings configuration components

- [ai-settings-section.tsx](settings/ai-settings-section.tsx) - AI configuration UI
- [ai-settings-dialog.tsx](settings/ai-settings-dialog.tsx) - AI settings modal
- [speech-provider-section.tsx](settings/speech-provider-section.tsx) - Speech provider selection
- [speech-provider-dialog.tsx](settings/speech-provider-dialog.tsx) - Provider config modal
- [speech-settings-dialog.tsx](settings/speech-settings-dialog.tsx) - Speech settings modal
- Speech provider forms: [speech/browser.tsx](settings/speech/browser.tsx), [speech/elevenlabs.tsx](settings/speech/elevenlabs.tsx), [speech/gemini.tsx](settings/speech/gemini.tsx)

**[keyboards/](keyboards/)** - Alternative input keyboard systems

- [keyboard-renderer.tsx](keyboards/keyboard-renderer.tsx) - Main keyboard rendering engine
- [keyboard-selector.tsx](keyboards/keyboard-selector.tsx) - Switch between keyboard types
- [circular.tsx](keyboards/circular.tsx) - Circular scanning keyboard
- [qwerty.tsx](keyboards/qwerty.tsx) - QWERTY keyboard layout
- [types.ts](keyboards/types.ts) - Keyboard type definitions
- [keys.ts](keyboards/keys.ts) - Key definitions and helpers

### Layout & Navigation

**[nav/](nav/)** - Navigation components

- [index.tsx](nav/index.tsx) - Main navigation wrapper
- [desktop.tsx](nav/desktop.tsx) - Desktop navigation bar
- [mobile.tsx](nav/mobile.tsx) - Mobile navigation menu
- [settings-tabs.tsx](nav/settings-tabs.tsx) - Settings page tabs

**[layout.tsx](layout.tsx)** - Main app layout wrapper

**[home/](home/)** - Landing page components

- [hero-section.tsx](home/hero-section.tsx) - Hero section with CTA
- [features-section.tsx](home/features-section.tsx) - Features overview
- [how-it-works-section.tsx](home/how-it-works-section.tsx) - Product walkthrough
- [use-cases-section.tsx](home/use-cases-section.tsx) - Use case examples
- [problem-statement-section.tsx](home/problem-statement-section.tsx) - Problem we solve
- [technology-section.tsx](home/technology-section.tsx) - Technology stack
- [faq-section.tsx](home/faq-section.tsx) - Frequently asked questions
- [enhanced-cta-section.tsx](home/enhanced-cta-section.tsx) - Call-to-action section
- [navbar.tsx](home/navbar.tsx) - Landing page navbar
- [footer.tsx](home/footer.tsx) - Landing page footer
- [keyboard-demo.tsx](home/keyboard-demo.tsx) - Interactive keyboard demo
- [highlight-card.tsx](home/highlight-card.tsx) - Feature highlight card

### Context Providers

**[context/](context/)** - React Context providers for global state

- [documents-provider.tsx](context/documents-provider.tsx) - Document state management
- [keyboard-provider.tsx](context/keyboard-provider.tsx) - Keyboard state management
- [text-provider.tsx](context/text-provider.tsx) - Text editing state management

All providers should be imported and used at the app layout level. Access via custom hooks from [../hooks/](../hooks/).

### Shared Components

**[audio-player.tsx](audio-player.tsx)** - Audio playback component for messages

## Component Patterns

### Client vs Server Components

- Server Components (default): Static content, data fetching, SEO-critical pages
- Client Components (`"use client"`): Interactive features, hooks, event handlers

### State Management

- Local state: `useState` for component-specific state
- Global state: Context providers in [context/](context/)
- Server state: Hooks from [../hooks/](../hooks/) with services from [../services/](../services/)

### Form Components

All forms must follow this pattern:

1. Use `react-hook-form` for form management
2. Define Zod schema for validation
3. Use form components from [ui/form.tsx](ui/form.tsx)
4. Handle errors with toast notifications

Example: [../app/settings/form.tsx](../app/settings/form.tsx)

### Styling

- Tailwind CSS utility classes
- Responsive design with mobile-first approach
- Consistent spacing and typography from globals.css

## Related Documentation

- [Hooks Directory](../hooks/README.md)
- [Services Directory](../services/README.md)
- [UI Components](ui/)
- [Context Providers](context/)
