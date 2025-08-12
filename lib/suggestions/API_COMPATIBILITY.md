# API Compatibility with Autocomplete Module

The `@suggestions/` module now implements the same public API as the `@autocomplete/` module, ensuring compatibility and interchangeability.

## Public API

Both modules export an `Autocomplete` class with the following interface:

```typescript
interface Autocomplete {
  // Train the service with corpus text
  train(corpus: string): void;

  // Get word completions for a given prefix
  getCompletions(input: string): string[];

  // Get next word predictions for a given sequence
  getNextWord(sequence: string): string[];

  // Get next phrase predictions for a given sequence
  getNextPhrase(sequence: string): string[];

  // Check if the service has been trained
  isReady(): boolean;

  // Get statistics about the trained data
  getStats(): {
    totalWords: number;
    totalPhrases: number;
    totalNGrams: number;
    averageWordFrequency: number;
  };
}
```

## Usage Examples

### Basic Usage (Both Modules)

```typescript
import { Autocomplete } from '@lib/autocomplete';
// or
import { Autocomplete } from '@lib/suggestions';

const autocomplete = new Autocomplete();

// Train with corpus
autocomplete.train('hello world hello there world hello');

// Check if ready
console.log(autocomplete.isReady()); // true

// Get completions
console.log(autocomplete.getCompletions('he')); // ['hello']

// Get next word predictions
console.log(autocomplete.getNextWord('hello')); // ['world', 'there']

// Get statistics
console.log(autocomplete.getStats());
```

## Key Differences

While both modules implement the same public API, they have different internal implementations:

### Autocomplete Module

- Uses n-gram models with phrase prediction
- Tracks phrase frequencies
- More sophisticated text normalization
- Built-in phrase prediction in `getNextPhrase()`

### Suggestions Module

- Uses trie-based word completion
- Bigram and trigram models for next word prediction
- More advanced confidence scoring
- Additional features like `getMostCommonWords()`, `hasWord()`, etc.

## Migration

You can seamlessly switch between the two modules by changing the import:

```typescript
// Before
import { Autocomplete } from '@lib/autocomplete';

// After
import { Autocomplete } from '@lib/suggestions';
```

The API calls remain exactly the same.

## Testing

Run the compatibility test to verify both modules work identically:

```bash
bun run lib/suggestions/api-compatibility-test.ts
```

## Additional Features

The suggestions module also provides additional functionality through the `TypingSuggestions` class:

```typescript
import { TypingSuggestions } from '@lib/suggestions';

const suggestions = new TypingSuggestions();
suggestions.processCorpus(corpus);

// Advanced features
suggestions.getCompletions('he', { maxResults: 5, minFrequency: 2 });
suggestions.getNextWord('hello world', { useTrigrams: true });
suggestions.getMostCommonWords(10);
suggestions.hasWord('hello');
suggestions.getWordFrequency('world');
```

## Type Exports

Both modules export the same types for compatibility:

```typescript
export interface WordFrequency {
  [word: string]: number;
}

export interface PhraseFrequency {
  [phrase: string]: number;
}

export interface NGramData {
  [sequence: string]: {
    nextWords: WordFrequency;
    nextPhrases: PhraseFrequency;
  };
}
```
