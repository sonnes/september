import { Autocomplete } from './autocomplete';

// Example usage of the Autocomplete library
function demonstrateAutocomplete() {
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

  console.log('Training autocomplete service...');
  service.train(corpus);
  console.log('Training completed!');

  // Test getCompletions
  console.log('\n=== Testing getCompletions ===');
  const completions = service.getCompletions('p');
  console.log('Completions for "p":', completions);
  // Expected: ["pizza", "peanut", "pasta"] (or similar, ranked by frequency)

  // Test getNextWord
  console.log('\n=== Testing getNextWord ===');
  const nextWord = service.getNextWord('I want to eat a');
  console.log('Next word after "I want to eat a":', nextWord);
  // Expected: ["pizza", "sandwich", "burger"] (ranked by frequency)

  // Test getNextPhrase
  console.log('\n=== Testing getNextPhrase ===');
  const nextPhrase = service.getNextPhrase('Coffee is good for');
  console.log('Next phrase after "Coffee is good for":', nextPhrase);
  // Expected: ["health", "the heart", "the brain", "the body", "the soul", "the spirit", "the mind"]

  // Show statistics
  console.log('\n=== Statistics ===');
  const stats = service.getStats();
  console.log('Total unique words:', stats.totalWords);
  console.log('Total n-grams:', stats.totalNGrams);
  console.log('Average word frequency:', stats.averageWordFrequency.toFixed(2));

  // Additional tests
  console.log('\n=== Additional Tests ===');

  const coffeeCompletions = service.getCompletions('co');
  console.log('Completions for "co":', coffeeCompletions);

  const wantCompletions = service.getCompletions('w');
  console.log('Completions for "w":', wantCompletions);

  const nextAfterCoffee = service.getNextWord('Coffee is');
  console.log('Next word after "Coffee is":', nextAfterCoffee);

  const nextAfterSometimes = service.getNextWord('Sometimes coffee is');
  console.log('Next word after "Sometimes coffee is":', nextAfterSometimes);
}

// Run the demonstration
if (require.main === module) {
  demonstrateAutocomplete();
}

export { demonstrateAutocomplete };
