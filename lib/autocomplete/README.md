# Autocomplete Library

A TypeScript library for providing intelligent typing suggestions based on corpus frequency analysis.

## Installation & Import

The library is now organized in the `lib/autocomplete/` folder. You can import it in several ways:

### From the main lib index:

```typescript
import { Autocomplete, BrowserAutocomplete } from '@/lib';
```

### From the autocomplete folder directly:

```typescript
import { Autocomplete, BrowserAutocomplete } from '@/lib/autocomplete';
```

### From individual files:

```typescript
import { Autocomplete } from '@/lib/autocomplete/autocomplete';
import { BrowserAutocomplete } from '@/lib/autocomplete/autocomplete.browser';
```

## Features

- **Word Completions**: Get word suggestions that start with a given input
- **Next Word Prediction**: Predict the most likely next word after a sequence
- **Next Phrase Prediction**: Predict the most likely next phrases after a sequence
- **Frequency-based Ranking**: All suggestions are ranked by their frequency in the training corpus
- **Browser Compatible**: Works in any modern browser environment

## Usage

### Basic Setup

```typescript
import { Autocomplete } from '@/lib/autocomplete';

const service = new Autocomplete();
```

### Training

```typescript
const corpus = `
I want to eat a sandwich.
I want to eat a burger.
I want to eat a pizza.
Coffee is good for health.
Coffee is good for the heart.
`;

service.train(corpus);
```

### Getting Completions

```typescript
// Get words starting with 'p'
const completions = service.getCompletions('p');
// Returns: ["pizza", "pasta"] (ranked by frequency)
```

### Getting Next Word Predictions

```typescript
// Get next word after "I want to eat a"
const nextWord = service.getNextWord('I want to eat a');
// Returns: ["pizza", "sandwich", "burger"] (ranked by frequency)
```

### Getting Next Phrase Predictions

```typescript
// Get next phrase after "Coffee is good for"
const nextPhrase = service.getNextPhrase('Coffee is good for');
// Returns: ["health", "the heart", "the brain"] (ranked by frequency)
```

## API Reference

### `Autocomplete` Class

#### Constructor

```typescript
new Autocomplete();
```

#### Methods

##### `train(corpus: string): void`

Trains the service with a corpus of text. Must be called before using other methods.

**Parameters:**

- `corpus`: A string containing the training text

**Throws:** Error if corpus is empty or invalid

##### `getCompletions(input: string): string[]`

Returns a list of words that start with the given input, ranked by frequency.

**Parameters:**

- `input`: The prefix to search for

**Returns:** Array of matching words, sorted by frequency (descending) then length (ascending)

**Throws:** Error if service hasn't been trained

##### `getNextWord(sequence: string): string[]`

Returns the most likely next words after a given sequence, ranked by frequency.

**Parameters:**

- `sequence`: The text sequence to find next words for

**Returns:** Array of next words, sorted by frequency (descending)

**Throws:** Error if service hasn't been trained

##### `getNextPhrase(sequence: string): string[]`

Returns the most likely next phrases after a given sequence, ranked by frequency.

**Parameters:**

- `sequence`: The text sequence to find next phrases for

**Returns:** Array of next phrases, sorted by frequency (descending)

**Throws:** Error if service hasn't been trained

##### `isReady(): boolean`

Checks if the service has been trained and is ready to use.

**Returns:** `true` if trained, `false` otherwise

##### `getStats(): object`

Returns statistics about the trained data.

**Returns:** Object with:

- `totalWords`: Number of unique words
- `totalPhrases`: Number of unique phrases
- `totalNGrams`: Number of n-gram sequences
- `averageWordFrequency`: Average frequency of words

**Throws:** Error if service hasn't been trained

## Browser Version

The `BrowserAutocomplete` class provides additional browser-specific features:

- Configurable options (max suggestions, case sensitivity, etc.)
- Enhanced phrase support
- Better memory management
- Additional utility methods

```typescript
import { BrowserAutocomplete } from '@/lib/autocomplete';

const service = new BrowserAutocomplete({
  maxSuggestions: 15,
  minWordLength: 3,
  caseSensitive: false,
  enablePhrases: true,
});
```

## How It Works

1. **Training**: The service processes the corpus by:
   - Splitting text into sentences
   - Building word frequency counts
   - Creating n-gram sequences (up to 4 words)
   - Tracking next word and phrase probabilities

2. **Completions**: Searches for words starting with the input and ranks by frequency

3. **Predictions**: Uses n-gram analysis to find the most likely continuations based on frequency patterns

4. **Ranking**: All results are sorted by frequency, with ties broken by length (shorter preferred)

## Example

```typescript
import { Autocomplete } from '@/lib/autocomplete';

const service = new Autocomplete();

const corpus = `
I want to eat a sandwich.
I want to eat a burger.
I want to eat a pizza.
I want to eat a sandwich for lunch.
I want to eat a pizza for lunch.
I want to drink a coffee.
Coffee is good for health.
Coffee is good for the heart.
Coffee is good for the brain.
Coffee is good for the body.
Coffee is good for the soul.
Coffee is good for the spirit.
Coffee is good for the mind.
Sometimes coffee is hot.
Sometimes coffee is cold.
Sometimes coffee is sweet.
Sometimes coffee is bitter.
Sometimes coffee is acidic.
Peanuts, pasta, peanut butter
`;

service.train(corpus);

const completions = service.getCompletions('p');
console.log(completions);
// ["pizza", "peanut", "pasta"]

const nextWord = service.getNextWord('I want to eat a');
console.log(nextWord);
// ["pizza", "sandwich", "burger"]

const nextPhrase = service.getNextPhrase('Coffee is good for');
console.log(nextPhrase);
// ["health", "the heart", "the brain", "the body", "the soul", "the spirit", "the mind"]
```

## Demo

- **Interactive HTML Demo**: Open `demo.html` in your browser
- **Node.js Demo**: Run `demo.ts` with `bun run demo.ts`
- **Test Suite**: Run `autocomplete.test.ts` for comprehensive testing

## Browser Compatibility

This library is designed to work in modern browsers and includes:

- ES6+ features
- TypeScript support
- No external dependencies
- Memory-efficient n-gram storage

## Performance

- Training time scales linearly with corpus size
- Lookup time is O(1) for most operations
- Memory usage scales with vocabulary size and n-gram complexity
- Optimized for real-time typing suggestions
