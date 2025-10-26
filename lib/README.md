# Lib Directory

This directory contains utility functions, helper libraries, and shared code used throughout the application.

## Purpose

Shared utilities and libraries that don't fit into components, hooks, or services. This includes:

- Text processing utilities
- Autocomplete and suggestion engines
- Shared helper functions
- Configuration utilities

## Directory Structure

### Autocomplete System

**[autocomplete/](autocomplete/)** - Intelligent typing suggestions and word completion

The autocomplete system provides AI-powered typing suggestions using Trie data structures and n-gram language models.

**Key Files**:

- [autocomplete.ts](autocomplete/autocomplete.ts) - Main Autocomplete class
- [trie-node.ts](autocomplete/trie-node.ts) - Trie data structure for efficient prefix matching
- [types.ts](autocomplete/types.ts) - TypeScript type definitions
- [utils.ts](autocomplete/utils.ts) - Text processing and tokenization utilities
- [sample-data.ts](autocomplete/sample-data.ts) - Pre-built training corpora

**Features**:

- Word completion from partial input
- Next-word prediction using bigrams/trigrams
- Next-phrase prediction
- Frequency-based ranking
- Domain-specific training corpora

**Detailed Documentation**: [autocomplete/README.md](autocomplete/README.md)

**Usage**:

```typescript
import { Autocomplete } from '@/lib/autocomplete';

const engine = new Autocomplete();
engine.train('Your training text here...');

const completions = engine.getSpellings('tech');
// ['technology', 'technical', 'techniques']

const predictions = engine.getNextWords('machine learning');
// ['and', 'is', 'algorithms']
```

### AI Utilities

**[ai/](ai/)** - AI-related utilities and configurations

- [defaults.ts](ai/defaults.ts) - Default AI settings and constants

### Slide Processing

**[slides/](slides/)** - Markdown to slide conversion

- [index.ts](slides/index.ts) - Convert markdown documents to presentation slides

**Usage**:

```typescript
import { parseMarkdownToSlides } from '@/lib/slides';

const slides = parseMarkdownToSlides(markdownContent);
// Returns array of slide objects for presentation
```

### Core Utilities

**[utils.ts](utils.ts)** - General-purpose utility functions

**Key Functions**:

- `cn(...inputs)` - Merge Tailwind CSS classes using clsx and tailwind-merge
- `MATCH_PUNCTUATION` - Regular expression for matching punctuation

**Usage**:

```typescript
import { cn } from '@/lib/utils';

const className = cn('base-class', isActive && 'active-class', 'another-class');
```

**[demo-loader.ts](demo-loader.ts)** - Demo data loading utilities

- Load and manage demo/sample data for development and testing

## Design Patterns

### Pure Functions

All utilities should be pure functions:

- No side effects
- Deterministic output
- Easy to test
- Composable

### Type Safety

All utilities must:

- Include TypeScript types
- Export type definitions
- Document parameter types
- Handle edge cases

### Performance

Utilities should be optimized for:

- Memory efficiency
- Fast execution
- Lazy loading when appropriate
- Caching where beneficial

## Usage Guidelines

### When to Add Code to Lib

Add code to `lib/` when:

- Logic is reused across multiple features
- Code is pure and stateless
- Functionality is general-purpose
- No React hooks or components needed

### When NOT to Use Lib

Don't add to `lib/` if:

- Code uses React hooks → Use [hooks/](../hooks/)
- Code is a UI component → Use [components/](../components/)
- Code integrates with external APIs → Use [services/](../services/)
- Code is specific to one feature → Keep in feature directory

### Import Conventions

Use absolute imports with the `@/` alias:

```typescript
import { Autocomplete } from '@/lib/autocomplete';
import { parseMarkdownToSlides } from '@/lib/slides';
import { cn } from '@/lib/utils';
```

## Text Processing

Text utilities handle:

- Tokenization - Split text into words
- Normalization - Convert to lowercase, remove punctuation
- Cleaning - Remove special characters, trim whitespace
- Matching - Fuzzy matching, similarity scoring

See [autocomplete/utils.ts](autocomplete/utils.ts) for text processing functions.

## Autocomplete Training Data

The autocomplete system can be trained with:

1. **Static Data**: Pre-built corpora from [autocomplete/sample-data.ts](autocomplete/sample-data.ts)
2. **User Data**: User's message history
3. **AI Corpus**: User's personalized AI-generated corpus

Training happens in [hooks/use-autocomplete.ts](../hooks/use-autocomplete.ts).

## Testing

Utilities should be thoroughly tested:

- Unit tests for all exported functions
- Edge case handling
- Performance benchmarks for critical paths
- Test files alongside implementation

Example: [autocomplete/test.ts](autocomplete/test.ts)

## Related Documentation

- [Autocomplete System](autocomplete/README.md) - Detailed autocomplete documentation
- [Hooks Directory](../hooks/README.md) - React hooks that use utilities
- [Components Directory](../components/README.md) - UI components that use utilities
