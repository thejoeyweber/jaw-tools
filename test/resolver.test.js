const assert = require('assert');
const { resolveSingleVariable } = require('../lib/compile-prompt');

// Mock Inquirer
let inquirerAnswers = {};
const mockInquirer = {
    prompt: async (questions) => {
        // console.log('Mock Inquirer prompt called with:', questions);
        const firstQuestionName = questions[0].name;
        if (inquirerAnswers[firstQuestionName]) {
            const answer = inquirerAnswers[firstQuestionName];
            // If the answer is a function, it means we want to simulate a dynamic choice based on options
            if (typeof answer === 'function') {
                return { [firstQuestionName]: answer(questions[0].choices) };
            }
            return { [firstQuestionName]: answer };
        }
        // Default behavior or throw error if unexpected prompt
        // For resolver, it's usually 'chosenItem' or similar for variable selection
        if (questions[0].name === 'chosenItem' && questions[0].choices && questions[0].choices.length > 0) {
            return { chosenItem: questions[0].choices[0].value }; // Default to first choice if not specified
        }
        console.warn(`Mock Inquirer: No answer specified for question: ${firstQuestionName}. Defaulting or erroring.`);
        return {};
    }
};

// Mock process.env
const originalEnv = { ...process.env };
function setMockEnv(newEnv) {
    for (const key in process.env) {
        delete process.env[key];
    }
    for (const key in newEnv) {
        process.env[key] = newEnv[key];
    }
}
function restoreOriginalEnv() {
    for (const key in process.env) {
        delete process.env[key];
    }
    for (const key in originalEnv) {
        process.env[key] = originalEnv[key];
    }
}

// Mock Registry
const mockRegistry = {
    mockType: {
        name: 'mockType',
        discover: async (key, config) => {
            if (key === 'no_candidates') return [];
            if (key === 'one_candidate') return [{ id: 'item1', name: 'Item 1' }];
            if (key === 'multi_candidates') return [{ id: 'itemA', name: 'Item A' }, { id: 'itemB', name: 'Item B' }];
            if (key === 'default_found') return [{ id: 'defaultItem', name: 'Default Item' }]; // For default testing
            return [];
        },
        render: (item) => item.name, // Simple render
        validate: async (item, key, config) => {
            if (item.name === 'Invalid Item') return 'This item is invalid.';
            return true;
        },
        filters: {
            toUpperCase: (items) => items.map(item => ({ ...item, name: item.name.toUpperCase() })),
        }
    },
    envType: { // For testing environment variable resolution
        name: 'envType',
        discover: async (key, config) => {
             // This type specifically checks process.env for its 'discovery'
            if (process.env[key]) return [{ key: key, value: process.env[key], name: process.env[key] }];
            return [];
        },
        render: (item) => item.value,
    },
    file: { // Simplified mock for file, actual file type is tested in variables.test.js
        name: 'file',
        discover: async (key, config) => {
            if (key === '/path/exists.txt') return [{ path: '/path/exists.txt', name: '/path/exists.txt' }];
            return [];
        },
        render: (item) => item.path,
        validate: async (item, key, config) => true, // Assume valid for these tests
    }
};


console.log('Running resolver.test.js...');

async function testResolveSingleVariable() {
    console.log('  Running testResolveSingleVariable tests...');
    let result;
    const baseConfig = { __projectRoot: '/test_project', promptCompiler: {} }; // Added promptCompiler
    const varDetailsBase = { raw: '{{$mockType:key}}', type: 'mockType', key: 'key', filters: [] };

    // --- Interactive Mode Tests (isInteractive implicitly true by not setting CI) ---
    // To simulate interactive mode, ensure options.ci is not true, or config.promptCompiler.interactive is not false
    const interactiveConfig = { ...baseConfig, promptCompiler: { ...baseConfig.promptCompiler, interactive: true } };

    console.log('    Testing Interactive Mode...');
    // Test 1: No candidates
    result = await resolveSingleVariable({ ...varDetailsBase, key: 'no_candidates' }, interactiveConfig, mockRegistry, mockInquirer);
    assert.strictEqual(result, '<!-- Error: No items discovered for {{$mockType:key}}, no default value, and not found as ENV variable. -->', 'Test 1 (Interactive, No Candidates) Failed');
    
    // Test 2: One candidate
    result = await resolveSingleVariable({ ...varDetailsBase, key: 'one_candidate' }, interactiveConfig, mockRegistry, mockInquirer);
    assert.strictEqual(result, 'Item 1', 'Test 2 (Interactive, One Candidate) Failed');

    // Test 3: Multiple candidates, user chooses 'Item B'
    inquirerAnswers['chosenItem'] = 'itemB';
    result = await resolveSingleVariable({ ...varDetailsBase, key: 'multi_candidates' }, interactiveConfig, mockRegistry, mockInquirer);
    assert.strictEqual(result, 'Item B', 'Test 3 (Interactive, Multi Candidates, User Choice) Failed');
    delete inquirerAnswers.chosenItem;

    // Test 4: Default value specified and item for default is "found" by discover
    // For this, resolveSingleVariable's logic checks if defaultValue is among discovered items
    // If not, it would normally prompt. Let's adjust discover for 'default_key'
    mockRegistry.mockType.discover = async (key) => { // Modify discover for this test
        if (key === 'default_key') return [{ id: 'val', name: 'Actual Default Value' }];
        return [];
    };
    result = await resolveSingleVariable(
        { ...varDetailsBase, key: 'default_key', default: 'Actual Default Value' }, // Default matches a "discoverable" item name
        interactiveConfig, mockRegistry, mockInquirer
    );
    // The current resolveSingleVariable logic for defaults: if default is provided, it's used directly if discover yields no results.
    // If discover yields results, it prompts. Let's test the direct use of default.
    mockRegistry.mockType.discover = async (key) => { if (key === 'key_for_direct_default') return []; return []; }; // Ensure discover returns nothing
    result = await resolveSingleVariable(
        { ...varDetailsBase, type:'mockType', key: 'key_for_direct_default', default: "MyDirectDefault" },
        interactiveConfig, mockRegistry, mockInquirer
    );
    assert.strictEqual(result, "MyDirectDefault", "Test 4 (Interactive, Default Value specified, no discover results) Failed");


    // --- CI Mode Tests (isInteractive = false) ---
    console.log('    Testing CI Mode...');
    const ciConfig = { ...baseConfig, promptCompiler: { ...baseConfig.promptCompiler, interactive: false } };
    setMockEnv({ KEY_ENV_VAR: 'EnvValueForItemA' });

    // Test CI 1: Env var set, matches a conceptual candidate (envType will use process.env[key])
    result = await resolveSingleVariable({ raw: '{{$envType:KEY_ENV_VAR}}', type: 'envType', key: 'KEY_ENV_VAR', filters: [] }, ciConfig, mockRegistry, mockInquirer);
    assert.strictEqual(result, 'EnvValueForItemA', 'Test CI 1 (Env Var Set and Found) Failed');
    
    // Test CI 2: Env var set but "discover" for the type yields no match (e.g. env var exists but discover says no)
    // This depends on the type's discover logic. For 'envType', discover finds it if process.env has it.
    // Let's test a case where the key itself is not an ENV var.
    result = await resolveSingleVariable({ raw: '{{$envType:NON_EXISTENT_ENV_VAR}}', type: 'envType', key: 'NON_EXISTENT_ENV_VAR', filters: [] }, ciConfig, mockRegistry, mockInquirer);
    assert.ok(result.includes('Error: Could not resolve {{$envType:NON_EXISTENT_ENV_VAR}}'), 'Test CI 2 (Env Var Set, but type does not discover it) Failed - Message Check');

    // Test CI 3: No env var for key, default specified, type's discover finds nothing for key.
    mockRegistry.mockType.discover = async (key) => []; // Ensure discover returns nothing for this key
    result = await resolveSingleVariable({ ...varDetailsBase, key: 'ci_default_key', default: 'CI_DefaultValue' }, ciConfig, mockRegistry, mockInquirer);
    assert.strictEqual(result, 'CI_DefaultValue', 'Test CI 3 (No Env Var, Default Found) Failed');

    // Test CI 4: No env var, no default, type's discover finds nothing.
    result = await resolveSingleVariable({ ...varDetailsBase, key: 'ci_no_default_key' }, ciConfig, mockRegistry, mockInquirer);
    assert.ok(result.includes('Error: Could not resolve {{$mockType:ci_no_default_key}}'), 'Test CI 4 (No Env Var, No Default) Failed - Message Check');
    
    restoreOriginalEnv(); // Clean up env mocks

    // --- Filter Test ---
    console.log('    Testing Filters...');
    mockRegistry.mockType.discover = async (key) => [{ id: 'item1', name: 'item 1' }]; // Reset discover
    result = await resolveSingleVariable(
        { ...varDetailsBase, key: 'filter_test_key', filters: [{ name: 'toUpperCase', arg: null }] },
        interactiveConfig, // Use interactive for simplicity, filter is main test here
        mockRegistry,
        mockInquirer
    );
    assert.strictEqual(result, 'ITEM 1', 'Test Filter (toUpperCase) Failed');

    // --- Validation Test ---
    console.log('    Testing Validation...');
    // Validation Passes
    mockRegistry.mockType.discover = async (key) => [{ id: 'validItem', name: 'Valid Item' }];
    result = await resolveSingleVariable({ ...varDetailsBase, key: 'validation_passes_key' }, interactiveConfig, mockRegistry, mockInquirer);
    assert.strictEqual(result, 'Valid Item', 'Test Validation (Passes) Failed');

    // Validation Fails
    mockRegistry.mockType.discover = async (key) => [{ id: 'invalidItem', name: 'Invalid Item' }];
    result = await resolveSingleVariable({ ...varDetailsBase, key: 'validation_fails_key' }, interactiveConfig, mockRegistry, mockInquirer);
    assert.ok(result.includes('Validation Error for {{$mockType:validation_fails_key}} (key: validation_fails_key): This item is invalid.'), 'Test Validation (Fails) Failed - Message Check: ' + result);
    
    // --- Unknown Variable Type ---
    console.log('    Testing Unknown Variable Type...');
    result = await resolveSingleVariable({ ...varDetailsBase, type: 'unknownType' }, interactiveConfig, mockRegistry, mockInquirer);
    assert.ok(result.includes('Error: Variable type "unknownType" not registered'), 'Test Unknown Type Failed - Message Check');

    // Restore original discover for mockType if other tests depend on its earlier state
    mockRegistry.mockType.discover = async (key, config) => {
        if (key === 'no_candidates') return [];
        if (key === 'one_candidate') return [{ id: 'item1', name: 'Item 1' }];
        if (key === 'multi_candidates') return [{ id: 'itemA', name: 'Item A' }, { id: 'itemB', name: 'Item B' }];
        if (key === 'default_found') return [{ id: 'defaultItem', name: 'Default Item' }];
        return [];
    };

    console.log('  testResolveSingleVariable tests passed.');
}


if (require.main === module) {
    testResolveSingleVariable().catch(err => {
        console.error("Test execution error:", err);
        process.exit(1);
    });
    console.log('All resolver tests passed (or an error above).');
}

module.exports = { testResolveSingleVariable };
