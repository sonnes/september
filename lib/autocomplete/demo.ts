import { Autocomplete } from './autocomplete';

// Demo script to test the autocomplete library
async function runDemo() {
  console.log('🚀 Starting Autocomplete Library Demo\n');

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

  console.log('📚 Training with corpus...');
  service.train(corpus);
  console.log('✅ Training completed!\n');

  // Test 1: Word completions
  console.log('🔍 Test 1: Word Completions');
  console.log('Input: "p"');
  const completions = service.getCompletions('p');
  console.log('Result:', completions);
  console.log('Expected: ["pizza", "peanut", "pasta"] (or similar)\n');

  // Test 2: Next word prediction
  console.log('🔍 Test 2: Next Word Prediction');
  console.log('Input: "I want to eat a"');
  const nextWord = service.getNextWord('I want to eat a');
  console.log('Result:', nextWord);
  console.log('Expected: ["pizza", "sandwich", "burger"] (ranked by frequency)\n');

  // Test 3: Next phrase prediction
  console.log('🔍 Test 3: Next Phrase Prediction');
  console.log('Input: "Coffee is good for"');
  const nextPhrase = service.getNextPhrase('Coffee is good for');
  console.log('Result:', nextPhrase);
  console.log(
    'Expected: ["health", "the heart", "the brain", "the body", "the soul", "the spirit", "the mind"]\n'
  );

  // Test 4: Additional completions
  console.log('🔍 Test 4: Additional Completions');
  console.log('Input: "co"');
  const coffeeCompletions = service.getCompletions('co');
  console.log('Result:', coffeeCompletions);
  console.log('Expected: ["coffee", "cold"] (or similar)\n');

  // Test 5: Next word after "Coffee is"
  console.log('🔍 Test 5: Next Word After "Coffee is"');
  console.log('Input: "Coffee is"');
  const nextAfterCoffee = service.getNextWord('Coffee is');
  console.log('Result:', nextAfterCoffee);
  console.log('Expected: ["good"] (most frequent)\n');

  // Test 6: Statistics
  console.log('📊 Statistics');
  const stats = service.getStats();
  console.log('Total unique words:', stats.totalWords);
  console.log('Total n-grams:', stats.totalNGrams);
  console.log('Average word frequency:', stats.averageWordFrequency.toFixed(2));
  console.log('');

  // Test 7: Edge cases
  console.log('🔍 Test 7: Edge Cases');
  console.log('Empty input:', service.getCompletions(''));
  console.log('Non-existent sequence:', service.getNextWord('xyz abc def'));
  console.log('Service ready:', service.isReady());

  console.log('\n🎉 Demo completed successfully!');
}

// Run the demo
runDemo().catch(console.error);
