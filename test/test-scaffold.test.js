const assert = require('assert');
const path = require('path');
const { scaffoldTests } = require('../lib/test-scaffold');

// Store original modules
const realFs = require('fs');
const realInquirer = require('inquirer');

// Mock storage
let mockFsStore = {};
let mockInquirerStore = {};
let consoleWarnOutput = [];
let consoleErrorOutput = [];
let consoleLogOutput = [];

// Mock implementations
const mockFs = {
    existsSync: (p) => {
        // console.log(`Mock existsSync: ${p}, Result: ${mockFsStore[p]?.exists}`);
        return mockFsStore[p]?.exists || false;
    },
    mkdirSync: (p, opts) => {
        // console.log(`Mock mkdirSync: ${p}`);
        if (mockFsStore[p]?.mkdirError) throw new Error(mockFsStore[p].mkdirError);
        mockFsStore[p] = { ...mockFsStore[p], exists: true, created: true };
        if (!mockFsStore.__mkdirCalls) mockFsStore.__mkdirCalls = [];
        mockFsStore.__mkdirCalls.push({ path: p, options: opts });
    },
    readFileSync: (p, enc) => {
        // console.log(`Mock readFileSync: ${p}`);
        if (mockFsStore[p]?.readError) throw new Error(mockFsStore[p].readError);
        return mockFsStore[p]?.content || '';
    },
    writeFileSync: (p, content, enc) => {
        // console.log(`Mock writeFileSync: ${p}`);
        if (mockFsStore[p]?.writeError) throw new Error(mockFsStore[p].writeError);
        mockFsStore[p] = { ...mockFsStore[p], writtenContent: content, written: true, exists: true };
        if (!mockFsStore.__writeFileCalls) mockFsStore.__writeFileCalls = [];
        mockFsStore.__writeFileCalls.push({ path: p, content: content, encoding: enc });
    },
    statSync: (p) => { // Not explicitly used in current scaffoldTests, but good to have
        if (mockFsStore[p]?.statError) throw new Error(mockFsStore[p].statError);
        return { isDirectory: () => mockFsStore[p]?.isDirectory || false };
    }
};

const mockInquirer = {
    prompt: async (questions) => {
        // console.log('Mock Inquirer prompt called with:', questions[0].name);
        const questionName = questions[0].name;
        if (mockInquirerStore[questionName]) {
            const answer = mockInquirerStore[questionName];
            // console.log(`Mock Inquirer providing answer for ${questionName}: ${answer}`);
            return { [questionName]: answer };
        }
        // console.log(`Mock Inquirer: No answer for ${questionName}, returning default 'true' for confirm`);
        return { [questionName]: true }; // Default to 'yes' for unconfigured prompts
    }
};

// Helper to setup/reset mocks for each test
function setupTestMocks() {
    mockFsStore = { __mkdirCalls: [], __writeFileCalls: [] }; // Reset store
    mockInquirerStore = {}; // Reset store
    consoleWarnOutput = [];
    consoleErrorOutput = [];
    consoleLogOutput = [];

    require.cache[require.resolve('fs')].exports = mockFs;
    require.cache[require.resolve('inquirer')].exports = mockInquirer;

    // Capture console output
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    const originalConsoleLog = console.log;
    console.warn = (...args) => { consoleWarnOutput.push(args.join(' ')); originalConsoleWarn(...args); };
    console.error = (...args) => { consoleErrorOutput.push(args.join(' ')); originalConsoleError(...args); };
    console.log = (...args) => { consoleLogOutput.push(args.join(' ')); originalConsoleLog(...args); };
}

function restoreRealModules() {
    require.cache[require.resolve('fs')].exports = realFs;
    require.cache[require.resolve('inquirer')].exports = realInquirer;

    console.warn = require('console').warn;
    console.error = require('console').error;
    console.log = require('console').log;
}

const baseConfig = {
    testScaffold: {
        templateDir: 'test_templates', // Relative to project root, but path.resolve in code makes it absolute
        fileNaming: '{feature}.{type}.test.js',
        defaultTypes: ['unit', 'integration'],
        todoMarker: '// TODO: <FEATURE_NAME> test'
    }
};
const resolvedTemplateDir = path.resolve(baseConfig.testScaffold.templateDir);


console.log('Running test-scaffold.test.js...');

async function testFeatureFolderLogic() {
    console.log('  Testing Feature Folder Logic...');

    // Test 1: Folder doesn't exist, user confirms creation
    setupTestMocks();
    mockFsStore['features/new-feat'] = { exists: false };
    mockInquirerStore['createFolder'] = true;
    let result = await scaffoldTests('new-feat', {}, baseConfig);
    assert.strictEqual(result.success, true, 'Test 1.1 Failed: Success should be true');
    assert.ok(mockFsStore['features/new-feat']?.created, 'Test 1.2 Failed: mkdirSync should be called for new-feat');
    restoreRealModules();

    // Test 2: Folder doesn't exist, user denies creation
    setupTestMocks();
    mockFsStore['features/no-feat'] = { exists: false };
    mockInquirerStore['createFolder'] = false;
    result = await scaffoldTests('no-feat', {}, baseConfig);
    assert.strictEqual(result.success, false, 'Test 2.1 Failed: Success should be false');
    assert.strictEqual(result.aborted, true, 'Test 2.2 Failed: Should be aborted');
    assert.strictEqual(mockFsStore['features/no-feat']?.created, undefined, 'Test 2.3 Failed: mkdirSync should NOT be called');
    restoreRealModules();

    // Test 3: Folder exists
    setupTestMocks();
    mockFsStore['features/existing-feat'] = { exists: true };
    // Need to mock template files to prevent other errors for this specific test
    mockFsStore[path.join(resolvedTemplateDir, 'unit.test.template.ts')] = { exists: true, content: '// unit template <FEATURE_NAME>' };
    mockFsStore[path.join(resolvedTemplateDir, 'integration.test.template.ts')] = { exists: true, content: '// integration template <FEATURE_NAME>' };
    result = await scaffoldTests('existing-feat', {}, baseConfig);
    assert.strictEqual(result.success, true, 'Test 3.1 Failed: Success should be true');
    assert.strictEqual(mockFsStore['features/existing-feat']?.created, undefined, 'Test 3.2 Failed: mkdirSync should NOT be called for existing-feat');
    restoreRealModules();

    // Test 4: Dry run, folder doesn't exist
    setupTestMocks();
    mockFsStore['features/dry-run-feat'] = { exists: false };
    result = await scaffoldTests('dry-run-feat', { dryRun: true }, baseConfig);
    assert.strictEqual(result.success, true, 'Test 4.1 Failed: Success should be true in dry run');
    assert.strictEqual(mockFsStore['features/dry-run-feat']?.created, undefined, 'Test 4.2 Failed: mkdirSync should NOT be called in dry run');
    const dryRunLog = consoleLogOutput.some(log => log.includes('[dry-run] Would prompt to create feature folder: features/dry-run-feat'));
    assert.ok(dryRunLog, 'Test 4.3 Failed: Expected dry run log message for folder creation');
    restoreRealModules();

    console.log('  Feature Folder Logic tests passed.');
}

async function testFeatureNameValidation() {
    console.log('  Testing Feature Name Validation...');
    setupTestMocks(); // Basic setup, fs/inquirer interaction not primary focus here

    // Test 1: Valid name
    // Need to mock templates for this to pass further
    mockFsStore[path.join(resolvedTemplateDir, 'unit.test.template.ts')] = { exists: true, content: '' };
    mockFsStore[path.join(resolvedTemplateDir, 'integration.test.template.ts')] = { exists: true, content: '' };
    let result = await scaffoldTests('valid-name_123', {}, baseConfig);
    assert.strictEqual(result.success, true, 'Test 1.1 (Valid Name) Failed: Success should be true');

    // Test 2: Invalid name (with spaces)
    result = await scaffoldTests('invalid name', {}, baseConfig);
    assert.strictEqual(result.success, false, 'Test 2.1 (Invalid Name) Failed: Success should be false');
    const errorLog = consoleErrorOutput.some(log => log.includes('Invalid <feature-name-slug>'));
    assert.ok(errorLog, 'Test 2.2 Failed: Expected error log for invalid name');
    
    restoreRealModules();
    console.log('  Feature Name Validation tests passed.');
}

async function testSuiteDetermination() {
    console.log('  Testing Test Suite Determination...');

    // Test 1: Default types from config
    setupTestMocks();
    mockFsStore['features/suite-default'] = { exists: true }; // Assume feature folder exists
    // Mock templates to avoid read errors
    baseConfig.testScaffold.defaultTypes.forEach(type => {
        mockFsStore[path.join(resolvedTemplateDir, `${type}.test.template.ts`)] = { exists: true, content: `// ${type}` };
    });
    let result = await scaffoldTests('suite-default', {}, baseConfig);
    assert.deepStrictEqual(result.suites, baseConfig.testScaffold.defaultTypes, 'Test 1.1 (Default Types) Failed');
    restoreRealModules();

    // Test 2: --types provided
    setupTestMocks();
    const customTypes = ['custom1', 'custom2'];
    mockFsStore['features/suite-custom'] = { exists: true };
    customTypes.forEach(type => {
        mockFsStore[path.join(resolvedTemplateDir, `${type}.test.template.ts`)] = { exists: true, content: `// ${type}` };
    });
    result = await scaffoldTests('suite-custom', { types: customTypes }, baseConfig);
    assert.deepStrictEqual(result.suites, customTypes, 'Test 2.1 (--types) Failed');
    restoreRealModules();

    // Test 3: --all flag (should use default types)
    setupTestMocks();
    mockFsStore['features/suite-all'] = { exists: true };
    baseConfig.testScaffold.defaultTypes.forEach(type => {
        mockFsStore[path.join(resolvedTemplateDir, `${type}.test.template.ts`)] = { exists: true, content: `// ${type}` };
    });
    result = await scaffoldTests('suite-all', { all: true }, baseConfig);
    assert.deepStrictEqual(result.suites, baseConfig.testScaffold.defaultTypes, 'Test 3.1 (--all) Failed');
    restoreRealModules();

    // Test 4: --types provided but empty (e.g. user did --types "")
    setupTestMocks();
    mockFsStore['features/suite-empty-types'] = { exists: true };
    baseConfig.testScaffold.defaultTypes.forEach(type => { // Should fall back to defaults
        mockFsStore[path.join(resolvedTemplateDir, `${type}.test.template.ts`)] = { exists: true, content: `// ${type}` };
    });
    // The CLI parser in bin/jaw-tools-cli.js turns empty --types into null if no value follows.
    // If --types is followed by nothing, it's parsed as options.types = [] by the CLI snippet.
    // Let's test scaffoldTests's behavior if cliOptions.types is an empty array.
    result = await scaffoldTests('suite-empty-types', { types: [] }, baseConfig);
    // The current scaffoldTests logic: if (cliOptions.types && cliOptions.types.length > 0)
    // So empty array for cliOptions.types will result in defaultTypes.
    assert.deepStrictEqual(result.suites, baseConfig.testScaffold.defaultTypes, 'Test 4.1 (--types empty array) Failed');
    restoreRealModules();

    console.log('  Test Suite Determination tests passed.');
}

async function testTemplateLoadingAndPlaceholders() {
    console.log('  Testing Template Loading and Placeholders...');
    const featureName = 'placeholder-feat';
    const featurePath = path.join('features', featureName);
    const testsPath = path.join(featurePath, '__tests__');
    const unitTemplatePath = path.join(resolvedTemplateDir, 'unit.test.template.ts');
    const integrationTemplatePath = path.join(resolvedTemplateDir, 'integration.test.template.ts');

    // Test 1: Template exists and placeholders are replaced
    setupTestMocks();
    mockFsStore[featurePath] = { exists: true }; // Feature folder exists
    mockFsStore[unitTemplatePath] = { 
        exists: true, 
        content: '// Unit test for <FEATURE_NAME>\nimport {} from "<IMPORT_PATH>";\n// INSERT_TODO_MARKER_HERE' 
    };
    mockFsStore[integrationTemplatePath] = { exists: false }; // Simulate one template missing

    await scaffoldTests(featureName, { types: ['unit'] }, baseConfig);
    
    const expectedUnitFilePath = path.join(testsPath, `${featureName}.unit.test.js`);
    assert.ok(mockFsStore[expectedUnitFilePath]?.written, 'Test 1.1 (Template Exists) Failed: unit file not written');
    const writtenContent = mockFsStore[expectedUnitFilePath].writtenContent;
    assert.ok(writtenContent.includes(`// Unit test for ${featureName}`), 'Test 1.2 Failed: <FEATURE_NAME> not replaced');
    assert.ok(writtenContent.includes(`import {} from "../../${featureName}";`), 'Test 1.3 Failed: <IMPORT_PATH> not replaced');
    assert.ok(writtenContent.includes(`// TODO: ${featureName} test`), 'Test 1.4 Failed: todoMarker not replaced/inserted');
    restoreRealModules();

    // Test 2: Template doesn't exist (integration template was mocked as non-existent)
    setupTestMocks();
    mockFsStore[featurePath] = { exists: true };
    mockFsStore[unitTemplatePath] = { exists: true, content: '// unit' }; // Unit exists
    mockFsStore[integrationTemplatePath] = { exists: false }; // Integration does not

    await scaffoldTests(featureName, { types: ['unit', 'integration'] }, baseConfig); // Try to scaffold both
    assert.ok(consoleWarnOutput.some(log => log.includes(`Template file not found for type 'integration'`)), 'Test 2.1 Failed: Expected warning for missing integration template');
    const expectedIntegrationFilePath = path.join(testsPath, `${featureName}.integration.test.js`);
    assert.strictEqual(mockFsStore[expectedIntegrationFilePath]?.written, undefined, 'Test 2.2 Failed: Integration file should not have been written');
    assert.ok(mockFsStore[path.join(testsPath, `${featureName}.unit.test.js`)]?.written, 'Test 2.3 Failed: Unit file should still be written');
    restoreRealModules();

    console.log('  Template Loading and Placeholders tests passed.');
}

async function testFileWritingLogic() {
    console.log('  Testing File Writing Logic...');
    const featureName = 'filewrite-feat';
    const featurePath = path.join('features', featureName);
    const testsPath = path.join(featurePath, '__tests__');
    const unitTestFilePath = path.join(testsPath, `${featureName}.unit.test.js`);
    const unitTemplatePath = path.join(resolvedTemplateDir, 'unit.test.template.ts');

    // Test 1: __tests__ directory creation
    setupTestMocks();
    mockFsStore[featurePath] = { exists: true }; // Feature folder exists
    mockFsStore[testsPath] = { exists: false }; // __tests__ does NOT exist
    mockFsStore[unitTemplatePath] = { exists: true, content: '// unit' };
    await scaffoldTests(featureName, { types: ['unit'] }, baseConfig);
    const mkdirCall = mockFsStore.__mkdirCalls.find(call => call.path === testsPath);
    assert.ok(mkdirCall, 'Test 1.1 Failed: mkdirSync should be called for __tests__ dir');
    assert.ok(mockFsStore[unitTestFilePath]?.written, 'Test 1.2 Failed: File should be written after __tests__ creation');
    restoreRealModules();

    // Test 2: --dry-run
    setupTestMocks();
    mockFsStore[featurePath] = { exists: true };
    mockFsStore[unitTemplatePath] = { exists: true, content: '// unit for dry run' };
    await scaffoldTests(featureName, { types: ['unit'], dryRun: true }, baseConfig);
    assert.strictEqual(mockFsStore[unitTestFilePath]?.written, undefined, 'Test 2.1 (--dry-run) Failed: File should not be written');
    assert.ok(consoleLogOutput.some(log => log.includes(`[dry-run] Would create/overwrite test file: ${unitTestFilePath}`)), 'Test 2.2 Failed: Expected dry run log for file creation');
    restoreRealModules();

    // Test 3: --force with existing file
    setupTestMocks();
    mockFsStore[featurePath] = { exists: true };
    mockFsStore[testsPath] = { exists: true };
    mockFsStore[unitTestFilePath] = { exists: true, writtenContent: 'old content' }; // File exists
    mockFsStore[unitTemplatePath] = { exists: true, content: 'new content for force write' };
    await scaffoldTests(featureName, { types: ['unit'], force: true }, baseConfig);
    assert.strictEqual(mockFsStore[unitTestFilePath]?.writtenContent, 'new content for force write', 'Test 3.1 (--force) Failed: File not overwritten');
    restoreRealModules();

    // Test 4: No --force with existing file
    setupTestMocks();
    mockFsStore[featurePath] = { exists: true };
    mockFsStore[testsPath] = { exists: true };
    mockFsStore[unitTestFilePath] = { exists: true, writtenContent: 'original content' }; // File exists
    mockFsStore[unitTemplatePath] = { exists: true, content: 'new content, should not write' };
    await scaffoldTests(featureName, { types: ['unit'] }, baseConfig);
    assert.strictEqual(mockFsStore[unitTestFilePath]?.writtenContent, 'original content', 'Test 4.1 (no --force) Failed: File should not have been overwritten');
    assert.ok(consoleLogOutput.some(log => log.includes(`Skipping existing file: ${unitTestFilePath}`)), 'Test 4.2 Failed: Expected skip log message');
    restoreRealModules();
    
    console.log('  File Writing Logic tests passed.');
}

async function testReporting() {
    console.log('  Testing Reporting Logic...');
    const featureName = 'report-feat';
    const featurePath = path.join('features', featureName);
    const unitTemplatePath = path.join(resolvedTemplateDir, 'unit.test.template.ts');
    const integrationTemplatePath = path.join(resolvedTemplateDir, 'integration.test.template.ts');
    const expectedUnitFile = path.join(featurePath, '__tests__', `${featureName}.unit.test.js`);
    const expectedIntegrationFile = path.join(featurePath, '__tests__', `${featureName}.integration.test.js`);

    // Test 1: Files created
    setupTestMocks();
    mockFsStore[featurePath] = { exists: true };
    mockFsStore[unitTemplatePath] = { exists: true, content: '// unit' };
    mockFsStore[integrationTemplatePath] = { exists: true, content: '// integration' };
    let result = await scaffoldTests(featureName, { types: ['unit', 'integration'] }, baseConfig);
    assert.deepStrictEqual(result.filesCreated.sort(), [expectedUnitFile, expectedIntegrationFile].sort(), 'Test 1.1 (Files Created) Failed: filesCreated array mismatch');
    assert.ok(consoleLogOutput.some(log => log.includes(`Created test file: ${path.relative(process.cwd(), expectedUnitFile)}`)), 'Test 1.2 Failed: Log for unit file missing');
    assert.ok(consoleLogOutput.some(log => log.includes(`Created test file: ${path.relative(process.cwd(), expectedIntegrationFile)}`)), 'Test 1.3 Failed: Log for integration file missing');
    restoreRealModules();

    // Test 2: Dry run reporting
    setupTestMocks();
    mockFsStore[featurePath] = { exists: true };
    mockFsStore[unitTemplatePath] = { exists: true, content: '// unit' };
    result = await scaffoldTests(featureName, { types: ['unit'], dryRun: true }, baseConfig);
    assert.deepStrictEqual(result.filesCreated, [expectedUnitFile], 'Test 2.1 (Dry Run) Failed: filesCreated array mismatch for dry run');
    assert.ok(consoleLogOutput.some(log => log.includes(`[dry-run] Would create/overwrite test file: ${expectedUnitFile}`)), 'Test 2.2 Failed: Dry run log for file creation missing');
    assert.ok(consoleLogOutput.some(log => log.includes(`[dry-run] Test stubs for '${featureName}' would be managed at the following paths:`)), 'Test 2.3 Failed: Dry run summary log missing');
    restoreRealModules();
    
    // Test 3: No files created (e.g. templates missing)
    setupTestMocks();
    mockFsStore[featurePath] = { exists: true };
    // No templates mocked as existing
    result = await scaffoldTests(featureName, { types: ['unit'] }, baseConfig);
    assert.deepStrictEqual(result.filesCreated, [], 'Test 3.1 (No Files Created) Failed: filesCreated should be empty');
    assert.ok(consoleLogOutput.some(log => log.includes(`No test stub files were created for '${featureName}'. Check template directory or use --force for existing files.`)), 'Test 3.2 Failed: Expected "no files created" message');
    restoreRealModules();

    console.log('  Reporting Logic tests passed.');
}


// Test Suite (to be expanded)
async function runAllUnitTests() {
    try {
        await testFeatureFolderLogic();
        await testFeatureNameValidation();
        await testSuiteDetermination();
        await testTemplateLoadingAndPlaceholders();
        await testFileWritingLogic();
        await testReporting();
        console.log('All test-scaffold unit tests passed!');
    } catch (error) {
        console.error('Unit Test Suite Failed:', error);
        restoreRealModules(); // Ensure cleanup even on error
        process.exit(1);
    }
}

if (require.main === module) {
    runAllUnitTests();
}

module.exports = { runAllUnitTests };
