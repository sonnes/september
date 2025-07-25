// Adapted from https://github.com/bennyschmidt/next-token-prediction/tree/master
import { merge } from 'lodash';
import TrieSearch from 'trie-search';

import { alphabet, getPartsOfSpeech, partsOfSpeech, suffixes, tokenize } from './text';
import Vector from './vector';

// Environment variables with defaults
const {
  PARAMETER_CHUNK_SIZE = '50000',
  RANKING_BATCH_SIZE = '50',
  MAX_RESPONSE_LENGTH = '240',
  VARIANCE = '0',
} = process.env;

const PARAMETER_CHUNK_SIZE_NUM = parseInt(PARAMETER_CHUNK_SIZE, 10);
const RANKING_BATCH_SIZE_NUM = parseInt(RANKING_BATCH_SIZE, 10);
const MAX_RESPONSE_LENGTH_NUM = parseInt(MAX_RESPONSE_LENGTH, 10);
const VARIANCE_NUM = parseInt(VARIANCE, 10);

// Interfaces and Types
interface Dataset {
  name: string;
  text: string;
}

interface TrieItem {
  sequence: string;
  nextTokens: { [key: string]: number };
}

interface Embeddings {
  [token: string]: {
    [nextToken: string]: Vector;
  };
}

interface TokenPredictionResult {
  token: string;
  rankedTokenList: string[];
  error?: {
    message: string;
  };
}

interface TokenSequencePredictionResult {
  completion: string;
  sequenceLength: number;
  token: string;
  rankedTokenList: string[];
}

interface CompletionsResult {
  completion: string;
  token: string;
  rankedTokenList: string[];
  completions: string[];
}

interface SimilarTokenResult {
  token: string;
  rankedTokenList: string[];
}

interface RankedToken {
  token: string;
  embedding: Vector;
  similarity: number;
}

// Tokenizer utils. Designed for words and phrases.
const MATCH_PUNCTUATION = /[.,\/#!$%?""\^&\*;:{}=\_`~()]/g;
const MATCH_LOWER_UPPER = /([a-z])([A-Z])/g;
const MATCH_NEW_LINES = /\n/g;

const FORMAT_PLAIN_TEXT = [
  /\.\s+|\n|\r|\0/gm,
  /\s-+\s/gm,
  /[©|]\s?/gm,
  /[!(–?$""…]/gm,
  /\s{2,}|^\s/gm,
];

const MATCH_TERMINATORS = /([.?!])\s*(?=[A-Z])/g;
const MATCH_NON_ALPHANUMERIC = /[^a-zA-Z0-9]/;
const MISSING_NGRAM_ERROR = 'Failed to look up n-gram.';
const NOTIF_TRAINING = 'Training...';
const NOTIF_CREATING_CONTEXT = 'Creating context...';
const DONE = 'Done.';

// Generator function to chunk arrays
// Use with `PARAMETER_CHUNK_SIZE` for models
// with many parameters to avoid memory errors
function* chunkArray<T>(array: T[], chunkSize: number): Generator<T[], void, unknown> {
  for (let i = 0; i < array.length; i += chunkSize) {
    yield array.slice(i, i + chunkSize);
  }
}

class Transformer {
  private trie: TrieSearch<TrieItem>;
  private embeddings: Embeddings = {};

  constructor() {
    this.trie = new TrieSearch('sequence', {
      min: 1,
      ignoreCase: true,
      cache: true,
    });
  }

  /**
   * ngramSearch
   * Look up n-gram by token sequence.
   */
  #ngramSearch(input: string): { [key: string]: number } {
    const results = this.trie.search(input) as TrieItem[];
    if (results.length > 0) {
      return results[0].nextTokens;
    }
    return {};
  }

  /**
   * embeddingSearch
   * Look up embedding by token.
   */
  #embeddingSearch(prevToken: string, token: string): Vector {
    const [second, first] = tokenize(`${prevToken} ${token}`).reverse();

    if (!first || !this.embeddings[first]) {
      return Vector.fromNull();
    }

    return this.embeddings[first][second] || Vector.fromNull();
  }

  /**
   * dotProduct
   * Dot product of two vectors.
   */
  #dotProduct(vectorA: Vector = Vector.fromNull(), vectorB: Vector = Vector.fromNull()): number {
    return vectorA.map((_, i) => vectorA[i] * vectorB[i]).reduce((m, n) => m + n);
  }

  /**
   * getSimilarToken
   * Get a similar token.
   */
  getSimilarToken(prevToken: string, token: string): SimilarTokenResult {
    const tokenEmbedding = this.#embeddingSearch(prevToken, token);

    const entries = Object.keys(this.embeddings);
    const result: RankedToken[] = [];

    for (const entry of entries) {
      const tokens = Object.keys(this.embeddings[entry]);

      for (const token of tokens) {
        const embedding = this.embeddings[entry][token];

        if (embedding) {
          result.push({
            token,
            embedding,
            similarity: this.#dotProduct(tokenEmbedding, embedding),
          });
        }
      }
    }

    const rankedTokenList = result
      .sort((a, b) => b.similarity - a.similarity)
      .slice(-RANKING_BATCH_SIZE_NUM)
      .filter(Boolean)
      .map(rankedResult => rankedResult.token);

    return {
      token: rankedTokenList[rankedTokenList.length - 1],
      rankedTokenList,
    };
  }

  /**
   * toPlainText
   * Transform text to a plain format. Capitalizes
   * the first token of sequences, removing certain
   * special characters, new lines, etc.
   */
  #toPlainText(text: string): string {
    return text
      .replace(text.charAt(0), text.charAt(0).toUpperCase())
      .replace(MATCH_LOWER_UPPER, '$1 $2')
      .replace(MATCH_NEW_LINES, ' ')
      .replace(FORMAT_PLAIN_TEXT[0], ' ')
      .replace(FORMAT_PLAIN_TEXT[1], ' ')
      .replace(FORMAT_PLAIN_TEXT[2], ' ')
      .replace(FORMAT_PLAIN_TEXT[3], ' ')
      .replace(FORMAT_PLAIN_TEXT[4], ' ');
  }

  getAutocompleteSuggestions(query: string): string[] {
    const cleanQuery = query.trim().toLowerCase();

    try {
      // Search trie for matches
      const matches = this.trie.search(cleanQuery) as TrieItem[];

      // Sort by frequency and length
      matches.sort((a, b) => {
        // Primary sort by frequency
        if (b.nextTokens[a.sequence] !== a.nextTokens[b.sequence]) {
          return b.nextTokens[a.sequence] - a.nextTokens[b.sequence];
        }
        // Secondary sort by length (prefer shorter matches)
        return a.sequence.length - b.sequence.length;
      });

      // Return top suggestions
      return matches.slice(0, 5).map(item => item.sequence);
    } catch (error) {
      console.error('Error getting autocomplete suggestions:', error);
      return [];
    }
  }

  /**
   * getTokenPrediction
   * Predict the next token or token sequence
   * (agnostic).
   */
  getTokenPrediction(token: string): TokenPredictionResult {
    if (!token) {
      return {
        token: '',
        rankedTokenList: [],
      };
    }

    // ngram search
    const nextTokens = this.#ngramSearch(
      token.replace(token.charAt(0), token.charAt(0).toUpperCase())
    );
    const rankedTokens = Object.keys(nextTokens).sort((a, b) => nextTokens[b] - nextTokens[a]);

    const highestRankedToken = rankedTokens[rankedTokens.length - 1];

    if (highestRankedToken) {
      if (VARIANCE_NUM > 0) {
        const { token: similarToken, rankedTokenList } = this.getSimilarToken(
          token,
          highestRankedToken
        );

        if (similarToken) {
          return {
            token: similarToken,
            rankedTokenList,
          };
        }
      }

      return {
        token: highestRankedToken,
        rankedTokenList: rankedTokens.slice(-RANKING_BATCH_SIZE_NUM),
      };
    }

    const message = MISSING_NGRAM_ERROR;

    return {
      error: {
        message,
      },
      token: '',
      rankedTokenList: [],
    };
  }

  /**
   * getTokenSequencePrediction
   * Predict the next sequence of tokens.
   * Designed for words and phrases.
   */
  getTokenSequencePrediction(
    input: string,
    sequenceLength: number = 2
  ): TokenSequencePredictionResult {
    const sequence: string[] = [];
    let result = input;

    // get top k sample from getTokenPrediction
    const { rankedTokenList: keyPredictions } = this.getTokenPrediction(input);

    // iterate over each token prediction, deriving a
    // new sequence prediction for each token
    for (let i = 0; i < sequenceLength; i++) {
      const { token: prediction } = this.getTokenPrediction(result);

      if (prediction) {
        const sanitizedPrediction = prediction.replace(/\\n/g, ' ').trim();
        result += ` ${sanitizedPrediction}`;
        sequence.push(sanitizedPrediction);
      }
    }

    // remove duplicates and extra whitespace
    result = [...new Set(sequence)].join(' ').trim();

    // return highest ranked completion and highest
    // ranked next token, along with a top k sample
    return {
      completion: result,
      sequenceLength,
      token: sequence[0],
      rankedTokenList: keyPredictions,
    };
  }

  /**
   * getCompletions
   * Complete an input and provide a ranked list
   * of alternatives. Designed for words and phrases.
   */
  getCompletions(input: string): CompletionsResult {
    // get top k sample from getTokenSequencePrediction
    const { completion, token, rankedTokenList } = this.getTokenSequencePrediction(
      input,
      MAX_RESPONSE_LENGTH_NUM
    );

    const completions = [completion];

    // build a top k sample of completion predictions
    for (const predictedToken of rankedTokenList) {
      const { completion: prediction } = this.getTokenSequencePrediction(
        `${input} ${predictedToken}`,
        MAX_RESPONSE_LENGTH_NUM
      );

      completions.push(`${predictedToken} ${prediction}`);
    }

    // return highest ranked completion and highest
    // ranked next token, along with a top k sample of
    // completions
    return {
      completion,
      token,
      rankedTokenList,
      completions,
    };
  }

  /**
   * createContext
   * Create model components in memory.
   */
  createContext(trainingText: string, embeddings: Embeddings): void {
    this.embeddings = embeddings;

    // Store current context in memory as a trie
    console.log(NOTIF_CREATING_CONTEXT);

    // split sequences
    const sequences = trainingText
      .replace(/\n/g, ' ')
      .replace(MATCH_TERMINATORS, '$1|')
      .split('|')
      .map(text => this.#toPlainText(text));

    // create n-grams of all sequences
    const ngramItems: TrieItem[] = [];

    sequences.forEach(sequence => {
      const words = sequence.split(' ');

      // Create n-grams for each sequence
      for (let i = 0; i < words.length - 1; i++) {
        const ngram = words.slice(0, i + 1).join(' ');
        const nextToken = words[i + 1];

        // Find existing item or create new one
        const existingItem = ngramItems.find(item => item.sequence === ngram);
        if (existingItem) {
          existingItem.nextTokens[nextToken] = (existingItem.nextTokens[nextToken] || 0) + 1;
        } else {
          ngramItems.push({
            sequence: ngram,
            nextTokens: { [nextToken]: 1 },
          });
        }
      }
    });

    // Add all items to trie in chunks
    const ngramChunks = chunkArray(ngramItems, PARAMETER_CHUNK_SIZE_NUM);

    for (const chunk of ngramChunks) {
      chunk.forEach(item => {
        this.trie.add(item);
      });
    }

    console.log(DONE);
  }

  /**
   * train
   * Rank tokens then create embeddings.
   * Designed for words and phrases.
   */
  async train(dataset: Dataset): Promise<void> {
    const { name, text } = dataset;
    const startTime = Date.now();

    console.log(NOTIF_TRAINING);

    // 1. Tokenize
    const tokens = tokenize(text);
    const embeddings: Embeddings = {};

    let maxNextWordFrequency = 0;
    let nextWordFrequencyIndexStart = 0;

    // 2. Analyze
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index];

      if (!token) continue;

      // End statement on punctuation
      if (token.match(MATCH_PUNCTUATION)) {
        continue;
      }

      // Skip unparsable tokens
      if (MATCH_NON_ALPHANUMERIC.test(token)) {
        continue;
      }

      const nextToken = tokens[index + 1];

      // Ensure next token exists
      if (!nextToken) {
        continue;
      }

      if (!embeddings[token]) {
        embeddings[token] = {};
      }

      if (!embeddings[token][nextToken]) {
        embeddings[token][nextToken] = Vector.fromNull();
      }

      /**
       * Training metrics
       * I. Composition
       *
       * Distribution of 66 alpha-numeric (and other)
       * symbols.
       */
      const letters = alphabet.split('');

      for (const letter of letters) {
        if (nextToken.includes(letter)) {
          const letterIndex = letters.indexOf(letter);

          embeddings[token][nextToken][letterIndex] = parseFloat(
            (
              nextToken.split('').filter(char => char === letter).length / nextToken.length
            ).toString()
          );
        }
      }

      /**
       * Training metrics
       * II. Parts-of-speech
       *
       * Distribution of 36 parts-of-speech types.
       */
      const posIndexStart = alphabet.length;
      const [tag] = getPartsOfSpeech(nextToken.toLowerCase());

      if (tag?.pos) {
        const tagIndex = partsOfSpeech.indexOf(tag.pos);
        if (tagIndex !== -1) {
          embeddings[token][nextToken][posIndexStart + tagIndex] = 1;
        }
      }

      /**
       * Training metrics
       * III. Prevalence
       *
       * Token prevalence (in the dataset).
       */
      const prevalenceIndexStart = posIndexStart + partsOfSpeech.length;

      // Prevalence
      embeddings[token][nextToken][prevalenceIndexStart] = parseFloat(
        (tokens.filter(_token => _token === nextToken).length / tokens.length).toString()
      );

      /**
       * Training metrics
       * IV. Word suffixes
       *
       * Distribution of 37 common rhyme suffixes.
       */
      const suffixesIndexStart = prevalenceIndexStart + 1;

      for (const suffix of suffixes) {
        const suffixIndex = suffixes.indexOf(suffix);

        embeddings[token][nextToken][suffixesIndexStart + suffixIndex] = new RegExp(suffix).test(
          nextToken.slice(-suffix.length)
        )
          ? 1
          : 0;
      }

      /**
       * Training metrics
       * V. Next-word frequency
       *
       * Token occurrence count (as next token).
       */
      nextWordFrequencyIndexStart = suffixesIndexStart + suffixes.length;

      const nextWordFrequency = ++embeddings[token][nextToken][nextWordFrequencyIndexStart];

      // TODO: Expand vocabulary
      const isStopWord =
        /i|me|my|myself|we|our|ours|ourselves|you|your|yours|yourself|yourselves|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|what|which|who|whom|this|that|these|those|am|is|are|was|were|be|been|being|have|has|had|having|do|does|did|doing|a|an|the|and|but|if|or|because|as|until|while|of|at|by|for|with|about|against|between|into|through|during|before|after|above|below|to|from|up|down|in|out|on|off|over|under|again|further|then|once|here|there|when|where|why|how|all|any|both|each|few|more|most|other|some|such|no|nor|not|only|own|same|so|than|too|very|s|t|can|will|just|don|should|now/
          .toString()
          .match(new RegExp(nextToken));

      if (!isStopWord && nextWordFrequency > maxNextWordFrequency) {
        maxNextWordFrequency = nextWordFrequency;
      }

      /**
       * Training metrics
       * VI. Vulgar
       *
       * Slang, slurs, profanity, etc.
       */
      const vulgarIndexStart = nextWordFrequencyIndexStart + 1;

      // TODO: Vulgarity
      embeddings[token][nextToken][vulgarIndexStart] = 0;

      /**
       * Training metrics
       * VII. Style
       *
       * Extend embeddings with stylistic
       * features.
       */

      // Pirate
      // TODO: Expand vocabulary
      const isPirate =
        /ahoy|arrr|matey|blimey|scallywag/.test(`${token}|${nextToken}`) ||
        (token === 'me' && tag?.pos?.match('NN'));

      embeddings[token][nextToken][vulgarIndexStart + 1] = isPirate ? 1 : 0;

      // Victorian
      // TODO: Expand vocabulary
      const isVictorian =
        /abeyance|ado|blunderbuss|carriage|chambre|corset|dandy|dote|doth|esquire|futile|grand|hath|hence|lively|nonesuch|thee|thou|thy|vestibule|wonderful/.test(
          `${token}|${nextToken}`
        );

      embeddings[token][nextToken][vulgarIndexStart + 2] = isVictorian ? 1 : 0;
    }

    // 3. Normalize
    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
      const computedToken = tokens[tokenIndex];
      const nextComputedToken = tokens[tokenIndex + 1];
      const value = embeddings[computedToken]?.[nextComputedToken]?.[nextWordFrequencyIndexStart];

      if (value) {
        const normalizedValue = Math.min(1, parseFloat((value / maxNextWordFrequency).toString()));

        embeddings[computedToken][nextComputedToken][nextWordFrequencyIndexStart] = parseFloat(
          normalizedValue.toString()
        );
      }
    }

    console.log(`Training completed in ${(Date.now() - startTime) / 1000} seconds.`);

    // create in-memory context
    this.createContext(text, embeddings);
  }
}

export default Transformer;
