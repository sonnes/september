# Typing Suggestions Library

A TypeScript library for AI-powered typing suggestions, providing intelligent word completions and next word predictions using n-gram language models. The library now provides both a simple Autocomplete-style API and an advanced API with rich features.

## Features

- **Word Completions**: Complete partial words based on prefix matching
- **Next Word Predictions**: Predict the next word using bigram and trigram models
- **Next Phrase Predictions**: Predict common phrases and word combinations
- **Trie Data Structure**: Efficient prefix matching for word completions
- **N-gram Models**: Bigram and trigram language models for context-aware predictions
- **Frequency-based Ranking**: Suggestions ranked by word frequency and confidence
- **Customizable Options**: Configurable parameters for filtering and sorting
- **Utility Functions**: Text processing, similarity matching, and corpus management
- **Sample Data**: Pre-built corpora for testing and demonstration
- **Dual API**: Simple Autocomplete-style API and advanced feature-rich API

## Installation

The library is part of the September project and can be imported directly:

```typescript
import { TypingSuggestions } from '@/lib/suggestions';
```

## Quick Start

### Simple API (Autocomplete-style)

```typescript
import { TypingSuggestions } from '@/lib/suggestions';

// Create a new suggestions engine
const engine = new TypingSuggestions();

// Train with a corpus (simple API)
engine.train('Your training text here...');

// Get word completions (returns simple string array)
const completions = engine.getCompletions('tech');
console.log(completions);
// Output: ['technology', 'technical', ...]

// Get next word predictions (returns simple string array)
const predictions = engine.getNextWord('machine learning');
console.log(predictions);
// Output: ['and', 'is', 'can', ...]

// Get next phrase predictions (returns simple string array)
const phrases = engine.getNextPhrase('Coffee is good for');
console.log(phrases);
// Output: ['the heart', 'the brain', 'the body', ...]

// Check if service is ready
console.log(engine.isReady()); // true

// Get statistics
const stats = engine.getStats();
console.log(stats);
// Output: { totalWords: 100, totalPhrases: 0, totalNGrams: 50, averageWordFrequency: 2.5 }
```

### Advanced API (Feature-rich)

```typescript
import { TypingSuggestions } from '@/lib/suggestions';
import { SAMPLE_CORPUS } from '@/lib/suggestions/sample-data';

// Create a new suggestions engine
const engine = new TypingSuggestions();

// Process a corpus of text (advanced API)
engine.processCorpus(SAMPLE_CORPUS);

// Get word completions with rich data
const completions = engine.getCompletionsAdvanced('tech');
console.log(completions);
// Output: [{ word: 'technology', frequency: 3, confidence: 0.15 }, ...]

// Get next word predictions with context
const predictions = engine.getNextWordAdvanced('machine learning');
console.log(predictions);
// Output: [{ word: 'and', frequency: 2, confidence: 0.1, context: 'machine learning' }, ...]

// Get comprehensive statistics
const stats = engine.getStatsAdvanced();
console.log(stats);
// Output: { totalWords: 100, uniqueWords: 50, bigramCount: 45, trigramCount: 40, averageWordLength: 4.2 }
```

## API Reference

### TypingSuggestions Class

#### Constructor

```typescript
new TypingSuggestions();
```

#### Simple API Methods (Autocomplete-style)

##### `train(corpus: string)`

Train the service with a corpus of text. This is the main entry point for the simple API.

**Parameters:**

- `corpus`: The corpus text to train with

**Throws:** Error if corpus is invalid or service is not ready

##### `getCompletions(input: string): string[]`

Get completions for words starting with the given input.

**Parameters:**

- `input`: The input prefix to complete

**Returns:** Array of completion strings

**Throws:** Error if service is not trained

##### `getNextWord(sequence: string): string[]`

Get the most likely next words after a given sequence.

**Parameters:**

- `sequence`: The text sequence to predict from

**Returns:** Array of predicted word strings

**Throws:** Error if service is not trained

##### `getNextPhrase(sequence: string): string[]`

Get the most likely next phrases after a given sequence.

**Parameters:**

- `sequence`: The text sequence to predict from

**Returns:** Array of predicted phrase strings

**Throws:** Error if service is not trained

##### `isReady(): boolean`

Check if the service has been trained.

**Returns:** True if service is ready to use

##### `getStats(): object`

Get statistics about the trained data.

**Returns:** Statistics object with totalWords, totalPhrases, totalNGrams, averageWordFrequency

**Throws:** Error if service is not trained

#### Advanced API Methods

##### `processCorpus(text: string, options?: object)`

Process corpus text and build language models.

**Parameters:**

- `text`: The corpus text to process
- `options`: Processing options
  - `caseSensitive`: Whether to preserve case (default: false)
  - `minWordLength`: Minimum word length to include (default: 1)
  - `maxWordLength`: Maximum word length to include (default: 50)

##### `getCompletionsAdvanced(prefix: string, options?: SuggestionOptions)`

Get word completions starting with the given prefix with rich data.

**Parameters:**

- `prefix`: The prefix to complete
- `options`: Suggestion options
  - `maxResults`: Maximum number of results (default: 10)
  - `minFrequency`: Minimum frequency threshold (default: 0)
  - `includeFrequency`: Whether to include frequency data (default: true)
  - `caseSensitive`: Whether to preserve case (default: false)

**Returns:** `SuggestionResult[]`

##### `getNextWordAdvanced(context: string, options?: PredictionOptions)`

Get next word predictions based on context with rich data.

**Parameters:**

- `context`: The text context to predict from
- `options`: Prediction options
  - `maxResults`: Maximum number of results (default: 5)
  - `minFrequency`: Minimum frequency threshold (default: 0)
  - `includeFrequency`: Whether to include frequency data (default: true)
  - `useTrigrams`: Whether to use trigram model (default: true)
  - `useBigrams`: Whether to use bigram model (default: true)

**Returns:** `PredictionResult[]`

##### `getStatsAdvanced(): CorpusStats`

Get comprehensive statistics about the processed corpus.

**Returns:** `CorpusStats` object with detailed statistics

##### `getMostCommonWords(count?: number): SuggestionResult[]`

Get the most common words in the corpus.

**Parameters:**

- `count`: Number of words to return (default: 10)

**Returns:** Array of most common words with frequencies

##### `getWordFrequency(word: string): number`

Get the frequency of a specific word.

**Parameters:**

- `word`: The word to get frequency for

**Returns:** The frequency count, or 0 if word doesn't exist

##### `hasWord(word: string): boolean`

Check if a word exists in the vocabulary.

**Parameters:**

- `word`: The word to check

**Returns:** True if the word exists

##### `getVocabularySize(): number`

Get vocabulary size.

**Returns:** Number of unique words

##### `clear(): void`

Clear all data and reset the engine.

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
