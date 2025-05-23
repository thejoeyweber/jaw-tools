const assert = require('assert');
const path = require('path');

// Mocked modules
let mockFs = {};
let mockGlob = {};

// Original modules
const originalFs = require('fs');
const originalGlob = require('glob');

// Helper to set up mocks
function setupMocks() {
    mockFs = {
        existsSync: (filePath) => {
            // console.log(`Mock fs.existsSync called with ${filePath}`);
            if (filePath.endsWith('nonexistent.txt')) return false;
            if (filePath.endsWith('existing_file.txt')) return true;
            if (filePath.endsWith('is_a_directory')) return true;
            if (filePath.endsWith('file.json')) return true;
            if (filePath.endsWith('file.xml')) return true;
            return false;
        },
        statSync: (filePath) => {
            // console.log(`Mock fs.statSync called with ${filePath}`);
            const isDirectory = filePath.endsWith('is_a_directory');
            return {
                isDirectory: () => isDirectory,
                isFile: () => !isDirectory,
                size: 1024, // Default size
            };
        },
        readFileSync: (filePath, encoding) => {
            // console.log(`Mock fs.readFileSync called with ${filePath}`);
            if (filePath.endsWith('existing_file.txt')) return 'File content';
            return '';
        },
    };

    mockGlob = {
        sync: (pattern, options) => {
            // console.log(`Mock glob.sync called with pattern: ${pattern}`);
            if (pattern.includes('*.txt')) return ['/project/file1.txt', '/project/file2.txt'];
            if (pattern.includes('abs_path_pattern*.md')) return ['/tmp/abs_file.md'];
            if (pattern.includes('no_match_pattern')) return [];
            return [];
        },
    };

    // Override require cache for fs and glob to inject mocks
    // This is a common way to mock in simple Node.js tests without a full framework
    require.cache[require.resolve('fs')] = { exports: mockFs };
    require.cache[require.resolve('glob')] = { exports: mockGlob };
}

function restoreOriginalModules() {
    require.cache[require.resolve('fs')] = { exports: originalFs };
    require.cache[require.resolve('glob')] = { exports: originalGlob };
    // console.log("Restored original fs and glob modules.");
}

// Import the module to be tested AFTER setting up mocks if it loads fs/glob at module level
// However, our variables.js is structured to be imported, and its functions use fs/glob when called.
// So we can import it, then setup mocks before each test block that needs them.

const { registry, registerVariableType, __TEST_ONLY_RESET_REGISTRY } = require('../dist/variables');

console.log('Running variables.test.js...');

// Test Suite: registerVariableType
function testRegisterVariableType() {
    console.log('  Running testRegisterVariableType...');
    __TEST_ONLY_RESET_REGISTRY(); // Ensure clean state

    const mockType1 = { name: 'testType1', discover: async () => [], render: () => '' };
    registerVariableType('testType1', mockType1);
    assert.strictEqual(registry.testType1, mockType1, 'Test Case 1.1 (Register new type) Failed');

    const mockType2 = { name: 'testType1', discover: async () => ['item'], render: () => 'new' };
    // Suppress console.warn for this specific test if possible, or just note it happens
    const originalWarn = console.warn;
    let warnCalled = false;
    console.warn = (message) => { 
        if (message.includes('Variable type "testType1" is already registered. Overwriting.')) {
            warnCalled = true; 
        } else {
            originalWarn(message);
        }
    };
    registerVariableType('testType1', mockType2);
    console.warn = originalWarn; // Restore original console.warn

    assert.strictEqual(registry.testType1, mockType2, 'Test Case 1.2 (Re-register type) Failed - Instance Check');
    assert.strictEqual(warnCalled, true, 'Test Case 1.3 (Re-register type) Failed - Warning Check');
    
    console.log('  testRegisterVariableType passed.');
}

// Test Suite: File Variable Type
async function testFileVariableType() {
    console.log('  Running testFileVariableType...');
    setupMocks(); // Setup mocks before these tests
    
    const fileType = registry.file;
    assert.ok(fileType, 'File type should be registered by default');

    // Test discover()
    console.log('    Testing file.discover()...');
    const config = { __projectRoot: '/project' };
    let files = await fileType.discover('*.txt', config);
    assert.deepStrictEqual(files, ['file1.txt', 'file2.txt'], 'Test Case 2.1 (discover matching) Failed');
    
    files = await fileType.discover('no_match_pattern', config);
    assert.deepStrictEqual(files, [], 'Test Case 2.2 (discover no match) Failed');

    files = await fileType.discover('/tmp/abs_path_pattern*.md', config);
    assert.deepStrictEqual(files, ['/tmp/abs_file.md'], 'Test Case 2.3 (discover absolute path) Failed');
    
    // Test validate()
    console.log('    Testing file.validate()...');
    let validationResult = await fileType.validate('/project/existing_file.txt', '*.txt', config);
    assert.strictEqual(validationResult, true, 'Test Case 2.4 (validate valid file) Failed');

    validationResult = await fileType.validate('/project/nonexistent.txt', '*.txt', config);
    assert.strictEqual(typeof validationResult, 'string', 'Test Case 2.5 (validate non-existent) Failed - Should return error string');
    assert.ok(validationResult.includes('File not found'), 'Test Case 2.5 (validate non-existent) Failed - Message check');
    
    validationResult = await fileType.validate('/project/is_a_directory', '*.txt', config);
    assert.strictEqual(typeof validationResult, 'string', 'Test Case 2.6 (validate directory) Failed - Should return error string');
    assert.ok(validationResult.includes('got a directory'), 'Test Case 2.6 (validate directory) Failed - Message check');

    validationResult = await fileType.validate('/project/file.xml', '*.json', config); // originalKeyOrPattern is '*.json'
    assert.strictEqual(typeof validationResult, 'string', 'Test Case 2.7 (validate extension mismatch) Failed - Should return error string');
    assert.ok(validationResult.includes('Expected .json but got .xml'), `Test Case 2.7 (validate extension mismatch) Failed - Message check: ${validationResult}`);

    validationResult = await fileType.validate('/project/file.json', '*.json', config);
    assert.strictEqual(validationResult, true, 'Test Case 2.8 (validate matching extension) Failed');

    // Test render()
    console.log('    Testing file.render()...');
    const renderedPath = fileType.render('/project/some_file.path');
    assert.strictEqual(renderedPath, '/project/some_file.path', 'Test Case 2.9 (render) Failed');

    // Test filters.extension
    console.log('    Testing file.filters.extension...');
    const items = ['file.txt', 'doc.md', 'another.txt'];
    const filteredTxt = fileType.filters.extension(items, 'txt');
    assert.deepStrictEqual(filteredTxt, ['file.txt', 'another.txt'], 'Test Case 2.10 (filter by txt) Failed');
    const filteredMd = fileType.filters.extension(items, 'md');
    assert.deepStrictEqual(filteredMd, ['doc.md'], 'Test Case 2.11 (filter by md) Failed');
    const filteredAll = fileType.filters.extension(items, undefined); // No extension filter
    assert.deepStrictEqual(filteredAll, items, 'Test Case 2.12 (filter by undefined) Failed');

    restoreOriginalModules(); // Clean up mocks
    console.log('  testFileVariableType passed.');
}


// Run tests
async function runTests() {
    try {
        testRegisterVariableType();
        await testFileVariableType(); // This one is async
        console.log('All variables tests passed!');
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1); // Indicate test failure
    }
}

// This is a simple runner. For more complex scenarios, a test framework like Mocha or Jest is better.
// To make this self-executing:
if (require.main === module) {
    runTests();
}

module.exports = { runTests }; // Export if needed by a master test runner
