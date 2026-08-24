/**
 * Test file demonstrating the suggestions library functionality
 * This can be run with: bun run lib/suggestions/test.ts
 */
import { Autocomplete } from './autocomplete.ts';
import { SAMPLE_CORPUS, TECHNICAL_CORPUS } from './sample-data.ts';
import {
  ENGLISH_STOP_WORDS,
  cleanText,
  findSimilarWords,
  mergeSuggestions,
  tokenize,
} from './utils.ts';

console.log('🧪 Testing Typing Suggestions Library\n');

// Test 1: Basic functionality
console.log('1. Basic Functionality Test');
const engine = new Autocomplete();
engine.processCorpus(SAMPLE_CORPUS);

const stats = engine.getStatsAdvanced();
console.log(`📊 Corpus Stats:`, stats);

const completions = engine.getCompletionsAdvanced('tech');
console.log(
  `🔤 Completions for "tech":`,
  completions.map(c => c.word)
);

const predictions = engine.getNextWordAdvanced('machine learning');
console.log(
  `🔮 Predictions for "machine learning":`,
  predictions.map(p => p.word)
);

// Test 2: Technical corpus
console.log('\n2. Technical Corpus Test');
const techEngine = new Autocomplete();
techEngine.processCorpus(TECHNICAL_CORPUS);

const techCompletions = techEngine.getCompletionsAdvanced('api');
console.log(
  `🔤 Technical completions for "api":`,
  techCompletions.map(c => c.word)
);

const techPredictions = techEngine.getNextWordAdvanced('javascript is');
console.log(
  `🔮 Technical predictions for "javascript is":`,
  techPredictions.map(p => p.word)
);

// Test 3: Utility functions
console.log('\n3. Utility Functions Test');

const dirtyText = '  Hello, World!  This is a test...  ';
const cleaned = cleanText(dirtyText);
console.log(`🧹 Cleaned text: "${cleaned}"`);

const tokens = tokenize(cleaned, {
  minLength: 3,
  removeStopWords: true,
  stopWords: ENGLISH_STOP_WORDS,
});
console.log(`🔤 Tokens (no stop words):`, tokens);

// Test 4: Merging suggestions
console.log('\n4. Merging Suggestions Test');
const engine1 = new Autocomplete();
const engine2 = new Autocomplete();

engine1.processCorpus(SAMPLE_CORPUS);
engine2.processCorpus(TECHNICAL_CORPUS);

const suggestions1 = engine1.getCompletionsAdvanced('dev');
const suggestions2 = engine2.getCompletionsAdvanced('dev');

const merged = mergeSuggestions([suggestions1, suggestions2], { maxResults: 5 });
console.log(
  `🔀 Merged suggestions for "dev":`,
  merged.map(s => s.word)
);

// Test 5: Similarity matching
console.log('\n5. Similarity Matching Test');
const allCompletions = engine.getCompletionsAdvanced('tech');
const similar = findSimilarWords('technology', allCompletions, 0.7);
console.log(
  `🔍 Similar words to "technology":`,
  similar.map(s => ({ word: s.word, similarity: s.similarity.toFixed(2) }))
);

// Test 6: Advanced options
console.log('\n6. Advanced Options Test');

const filteredCompletions = engine.getCompletionsAdvanced('tech', {
  maxResults: 3,
  minFrequency: 2,
  caseSensitive: false,
});
console.log(
  `🎯 Filtered completions (min freq 2):`,
  filteredCompletions.map(c => ({ word: c.word, freq: c.frequency }))
);

const contextPredictions = engine.getNextWordAdvanced('artificial intelligence', {
  maxResults: 3,
  useTrigrams: true,
  useBigrams: true,
});
console.log(
  `🎯 Context predictions:`,
  contextPredictions.map(p => ({ word: p.word, context: p.context }))
);

// Test 7: Performance test
console.log('\n7. Performance Test');
const startTime = performance.now();
for (let i = 0; i < 1000; i++) {
  engine.getCompletionsAdvanced('tech');
}
const endTime = performance.now();
console.log(`⚡ 1000 completion lookups took: ${(endTime - startTime).toFixed(2)}ms`);

// Test 8: Most common words
console.log('\n8. Most Common Words Test');
const commonWords = engine.getMostCommonWords(5);
console.log(
  `📈 Most common words:`,
  commonWords.map(w => ({ word: w.word, frequency: w.frequency }))
);

// Test 9: Simple API compatibility (requires training)
console.log('\n9. Simple API Compatibility Test');
const simpleEngine = new Autocomplete();
simpleEngine.train(SAMPLE_CORPUS);

const simpleCompletions = simpleEngine.getCompletions('tech');
console.log(`🔤 Simple API completions for "tech":`, simpleCompletions);

const simplePredictions = simpleEngine.getNextWord('machine learning');
console.log(`🔮 Simple API predictions for "machine learning":`, simplePredictions);

const simpleStats = simpleEngine.getStats();
console.log(`📊 Simple API stats:`, simpleStats);

console.log('\n✅ All tests completed successfully!');
console.log('\n📚 Library Features Demonstrated:');
console.log('   • Word completions with prefix matching');
console.log('   • Next word predictions using n-gram models');
console.log('   • Text cleaning and tokenization');
console.log('   • Suggestion merging and filtering');
console.log('   • Word similarity matching');
console.log('   • Performance optimization');
console.log('   • Multiple corpus support');
console.log('   • Simple API compatibility (Autocomplete-style)');
