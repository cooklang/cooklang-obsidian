// Simple test to verify the WASM parser works
import { Recipe } from './src/parser-adapter.ts';

const testRecipe = `>> servings: 4
>> time: 30 minutes
>> tags: breakfast, easy

Mix @flour{2%cups} with @salt{1%tsp} in a #bowl.

Add @milk{1%cup} and @eggs{2} to the mixture.

Heat a #pan over medium heat and cook for ~{10%minutes}.

Serve with @butter and enjoy!
`;

console.log('Testing WASM parser...\n');

try {
    const recipe = new Recipe(testRecipe);

    console.log('✓ Parser initialized successfully!\n');

    console.log('Metadata:');
    Object.entries(recipe.metadata).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
    });

    console.log('\nIngredients:');
    recipe.ingredients.forEach(ing => {
        const parts = [ing.name];
        if (ing.quantity) parts.push(ing.quantity);
        if (ing.units) parts.push(ing.units);
        console.log(`  - ${parts.join(' ')}`);
    });

    console.log('\nCookware:');
    recipe.cookwares.forEach(cw => {
        console.log(`  - ${cw.name}${cw.quantity ? ` (${cw.quantity})` : ''}`);
    });

    console.log(`\nSteps: ${recipe.steps.length} total`);
    recipe.steps.forEach((step, i) => {
        const text = step.map(part => part.type === 'text' ? part.value : `[${part.type}]`).join('');
        console.log(`  ${i + 1}. ${text.substring(0, 60)}...`);
    });

    console.log('\n✓ All parser tests passed!');
} catch (error) {
    console.error('✗ Parser test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
}
