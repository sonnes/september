# Typing Suggestions Library

A TypeScript library for AI-powered typing suggestions, providing intelligent word completions and next word predictions using n-gram language models.

## Features

- **Word Completions**: Complete partial words based on prefix matching
- **Next Word Predictions**: Predict the next word using bigram and trigram models
- **Trie Data Structure**: Efficient prefix matching for word completions
- **N-gram Models**: Bigram and trigram language models for context-aware predictions
- **Frequency-based Ranking**: Suggestions ranked by word frequency and confidence
- **Customizable Options**: Configurable parameters for filtering and sorting
- **Utility Functions**: Text processing, similarity matching, and corpus management
- **Sample Data**: Pre-built corpora for testing and demonstration

## Installation

The library is part of the September project and can be imported directly:

```typescript
import { TypingSuggestions } from '@/lib/suggestions';
```

## Quick Start

```typescript
import { TypingSuggestions } from '@/lib/suggestions';
import { SAMPLE_CORPUS } from '@/lib/suggestions/sample-data';

// Create a new suggestions engine
const engine = new TypingSuggestions();

// Process a corpus of text
engine.processCorpus(SAMPLE_CORPUS);

// Get word completions
const completions = engine.getCompletions('tech');
console.log(completions);
// Output: [{ word: 'technology', frequency: 3, confidence: 0.15 }, ...]

// Get next word predictions
const predictions = engine.getNextWord('machine learning');
console.log(predictions);
// Output: [{ word: 'and', frequency: 2, confidence: 0.1, context: 'machine learning' }, ...]
```

## API Reference

### TypingSuggestions Class

#### Constructor

```typescript
new TypingSuggestions();
```

#### Methods

##### `processCorpus(text: string, options?: object)`

Process corpus text and build language models.

**Parameters:**

- `text`: The corpus text to process
- `options`: Processing options
  - `caseSensitive`: Whether to preserve case (default: false)
  - `minWordLength`: Minimum word length to include (default: 1)
  - `maxWordLength`: Maximum word length to include (default: 50)

##### `getCompletions(prefix: string, options?: SuggestionOptions)`

Get word completions starting with the given prefix.

**Parameters:**

- `prefix`: The prefix to complete
- `options`: Suggestion options
  - `maxResults`: Maximum number of results (default: 10)
  - `minFrequency`: Minimum frequency threshold (default: 0)
  - `includeFrequency`: Whether to include frequency data (default: true)
  - `caseSensitive`: Whether to preserve case (default: false)

**Returns:** `SuggestionResult[]`

##### `getNextWord(context: string, options?: PredictionOptions)`

Get next word predictions based on context.

**Parameters:**

- `context`: The text context to predict from
- `options`: Prediction options
  - `maxResults`: Maximum number of results (default: 5)
  - `minFrequency`: Minimum frequency threshold (default: 0)
  - `includeFrequency`: Whether to include frequency data (default: true)
  - `useTrigrams`: Whether to use trigram model (default: true)
  - `useBigrams`: Whether to use bigram model (default: true)

**Returns:** `PredictionResult[]`

##### `getStats()`

Get comprehensive statistics about the processed corpus.

**Returns:** `CorpusStats`

##### `hasWord(word: string)`

Check if a word exists in the vocabulary.

**Returns:** `boolean`

##### `getWordFrequency(word: string)`

Get the frequency of a specific word.

**Returns:** `number`

##### `clear()`

Clear all data and reset the engine.

##### `getMostCommonWords(count?: number)`

Get the most common words in the corpus.

**Returns:** `SuggestionResult[]`

##### `getVocabularySize()`

Get vocabulary size.

**Returns:** `number`

### TrieNode Class

Efficient prefix matching data structure for word completions.

#### Methods

##### `insert(word: string, frequency?: number)`

Insert a word into the trie.

##### `findWordsWithPrefix(prefix: string)`

Find all words that start with the given prefix.

**Returns:** `Array<{ word: string; frequency: number }>`

##### `contains(word: string)`

Check if a word exists in the trie.

**Returns:** `boolean`

##### `getFrequency(word: string)`

Get the frequency of a word.

**Returns:** `number`

### Utility Functions

#### `cleanText(text: string, options?: object)`

Clean and normalize text for processing.

#### `tokenize(text: string, options?: object)`

Tokenize text into words.

#### `createFromFile(filePath: string)`

Create a suggestions engine from a text file.

**Returns:** `Promise<TypingSuggestions>`

#### `createFromMultipleSources(sources: string[])`

Create a suggestions engine from multiple text sources.

**Returns:** `TypingSuggestions`

#### `mergeSuggestions(results: SuggestionResult[][], options?: object)`

Merge multiple suggestion results.

**Returns:** `SuggestionResult[]`

#### `filterSuggestions(suggestions: SuggestionResult[], filterFn: Function)`

Filter suggestions based on custom criteria.

**Returns:** `SuggestionResult[]`

#### `sortSuggestions(suggestions: SuggestionResult[], sortBy: string)`

Sort suggestions by different criteria.

**Returns:** `SuggestionResult[]`

#### `calculateWordSimilarity(word1: string, word2: string)`

Calculate similarity between two words using Levenshtein distance.

**Returns:** `number` (0-1, where 1 is identical)

#### `findSimilarWords(targetWord: string, suggestions: SuggestionResult[], threshold?: number)`

Find similar words in a list of suggestions.

**Returns:** `Array<SuggestionResult & { similarity: number }>`

## Types

### SuggestionResult

```typescript
interface SuggestionResult {
  word: string;
  frequency: number;
  confidence?: number;
}
```

### PredictionResult

```typescript
interface PredictionResult {
  word: string;
  frequency: number;
  confidence?: number;
  context?: string;
}
```

### CorpusStats

```typescript
interface CorpusStats {
  totalWords: number;
  uniqueWords: number;
  bigramCount: number;
  trigramCount: number;
  averageWordLength: number;
}
```

### SuggestionOptions

```typescript
interface SuggestionOptions {
  maxResults?: number;
  minFrequency?: number;
  includeFrequency?: boolean;
  caseSensitive?: boolean;
}
```

### PredictionOptions

```typescript
interface PredictionOptions {
  maxResults?: number;
  minFrequency?: number;
  includeFrequency?: boolean;
  useTrigrams?: boolean;
  useBigrams?: boolean;
}
```

## Sample Data

The library includes pre-built corpora for testing and demonstration:

```typescript
import {
  CONVERSATIONAL_CORPUS,
  CORPUS_COLLECTIONS,
  CORPUS_METADATA,
  EDUCATIONAL_CORPUS,
  MEDICAL_CORPUS,
  SAMPLE_CORPUS,
  TECHNICAL_CORPUS,
} from '@/lib/suggestions/sample-data';
```

Available corpora:

- **General Technology**: Technology and software development focused
- **Technical Programming**: Programming and web development focused
- **Conversational English**: Everyday conversation and social interaction
- **Medical Terminology**: Healthcare and medical terminology
- **Educational Content**: Education and learning focused

## Examples

### Basic Usage

```typescript
import { TypingSuggestions } from '@/lib/suggestions';
import { SAMPLE_CORPUS } from '@/lib/suggestions/sample-data';

const engine = new TypingSuggestions();
engine.processCorpus(SAMPLE_CORPUS);

// Get completions for "art"
const completions = engine.getCompletions('art');
console.log(completions.map(c => c.word));
// Output: ['artificial', 'art']

// Get predictions for "machine learning"
const predictions = engine.getNextWord('machine learning');
console.log(predictions.map(p => p.word));
// Output: ['and', 'algorithms', 'models']
```

### Advanced Usage

```typescript
import { TypingSuggestions, mergeSuggestions } from '@/lib/suggestions';
import { CONVERSATIONAL_CORPUS, TECHNICAL_CORPUS } from '@/lib/suggestions/sample-data';

// Create engines for different domains
const technicalEngine = new TypingSuggestions();
const conversationalEngine = new TypingSuggestions();

technicalEngine.processCorpus(TECHNICAL_CORPUS);
conversationalEngine.processCorpus(CONVERSATIONAL_CORPUS);

// Get suggestions from both engines
const techCompletions = technicalEngine.getCompletions('api');
const convCompletions = conversationalEngine.getCompletions('api');

// Merge and rank results
const merged = mergeSuggestions([techCompletions, convCompletions], {
  maxResults: 5,
  weightBySource: true,
});

console.log(merged.map(s => s.word));
```

### Custom Filtering

```typescript
import { TypingSuggestions, filterSuggestions, sortSuggestions } from '@/lib/suggestions';

const engine = new TypingSuggestions();
engine.processCorpus(SAMPLE_CORPUS);

let completions = engine.getCompletions('tech');

// Filter by minimum frequency
completions = filterSuggestions(completions, s => s.frequency >= 2);

// Sort by word length
completions = sortSuggestions(completions, 'length');

console.log(completions.map(c => c.word));
```

### Similarity Matching

```typescript
import { TypingSuggestions, findSimilarWords } from '@/lib/suggestions';

const engine = new TypingSuggestions();
engine.processCorpus(SAMPLE_CORPUS);

const completions = engine.getCompletions('tech');
const similar = findSimilarWords('technology', completions, 0.8);

console.log(similar.map(s => ({ word: s.word, similarity: s.similarity })));
```

## Performance Considerations

- **Memory Usage**: Large corpora can consume significant memory. Consider processing corpora in chunks for very large datasets.
- **Processing Time**: Initial corpus processing time scales with corpus size. For large corpora, consider pre-processing and caching.
- **Suggestion Speed**: Trie-based completions are very fast (O(k) where k is prefix length).
- **Prediction Speed**: N-gram lookups are fast but depend on model size.

## Best Practices

1. **Corpus Quality**: Use high-quality, domain-relevant text for better suggestions
2. **Regular Updates**: Periodically update corpora to reflect current language usage
3. **Domain Specialization**: Use specialized corpora for specific use cases
4. **Frequency Thresholds**: Set appropriate minimum frequency thresholds to filter out rare words
5. **Confidence Scoring**: Use confidence scores to rank and filter suggestions
6. **Error Handling**: Implement proper error handling for file loading and processing

## Comparison with Existing Autocomplete Library

This library is an evolution of the existing `lib/autocomplete` library. For a detailed comparison, see [COMPARISON.md](./COMPARISON.md).

### Quick Comparison:

- **Autocomplete Library**: Simple, lightweight autocomplete with phrase predictions
- **Suggestions Library**: Advanced typing suggestions with confidence scores, customizable options, and better performance

### Migration:

```typescript
// Old (Autocomplete)
const service = new Autocomplete();
service.train(corpus);
const completions = service.getCompletions('tech'); // string[]

// New (Suggestions)
const engine = new TypingSuggestions();
engine.processCorpus(corpus);
const completions = engine.getCompletions('tech'); // SuggestionResult[]
```

## Contributing

When contributing to the suggestions library:

1. Follow the existing code style and patterns
2. Add comprehensive TypeScript types
3. Include JSDoc comments for all public methods
4. Add unit tests for new functionality
5. Update documentation for new features
6. Consider performance implications of changes

## License

This library is part of the September project and follows the same licensing terms.
