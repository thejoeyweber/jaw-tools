const assert = require('assert');
const path = require('path');
const fs = require('fs');
const glob = require('glob');

// Functions to test (assuming they are exported from doc-lint.js)
// We will require them properly after mocking.
let runDocLint;
let parseDocLintArgs; // If we need to test this separately, though focus is on runDocLint

// --- Mocking fs and glob ---
let mockFsStore = {};
let globSyncMockReturn = [];
let writeFileSyncCalls = [];

const originalGlobSync = glob.sync;
const originalReadFileSync = fs.readFileSync;
const originalWriteFileSync = fs.writeFileSync;

function mockGlobSync(pattern, options) {
    // console.log(`Mock glob.sync called with pattern: ${pattern}`);
    return globSyncMockReturn;
}

function mockReadFileSync(filePath, encoding) {
    // console.log(`Mock fs.readFileSync called for: ${filePath}`);
    if (mockFsStore[filePath]) {
        return mockFsStore[filePath];
    }
    throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
}

function mockWriteFileSync(filePath, content, encoding) {
    // console.log(`Mock fs.writeFileSync called for: ${filePath} with content:\n${content}`);
    mockFsStore[filePath] = content; // Update store so subsequent reads get new content
    writeFileSyncCalls.push({ filePath, content });
}

function setupMocks(filesToReturn, initialFileContents = {}) {
    glob.sync = mockGlobSync;
    fs.readFileSync = mockReadFileSync;
    fs.writeFileSync = mockWriteFileSync;

    globSyncMockReturn = filesToReturn;
    mockFsStore = { ...initialFileContents };
    writeFileSyncCalls = [];

    // Re-require the module to use the mocked functions
    // This is a common way to ensure mocks are applied if modules are cached
    delete require.cache[require.resolve('../lib/doc-lint.js')];
    const docLintModule = require('../lib/doc-lint.js');
    runDocLint = docLintModule.runDocLint;
    parseDocLintArgs = docLintModule.parseDocLintArgs;
}

function teardownMocks() {
    glob.sync = originalGlobSync;
    fs.readFileSync = originalReadFileSync;
    fs.writeFileSync = originalWriteFileSync;
    mockFsStore = {};
    globSyncMockReturn = [];
    writeFileSyncCalls = [];
}

// --- Test Helper ---
function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

// --- Test Suites ---
async function runTests() {
    console.log('Starting doc-lint.js tests...\n');

    await testFrontMatterParsing();
    await testAutoFixingLogic();
    // Add more test suites if needed

    console.log('\nAll doc-lint.js tests completed.');
    // Simple way to indicate pass/fail based on assertions.
    // If any assert fails, the script will exit with an error.
    console.log('If no errors above, all tests passed.');
}

async function testFrontMatterParsing() {
    console.log('--- Describe: Front-Matter Parsing ---');

    const mockConfig = {
        projectRoot: '/app', // Assuming project root is /app for tests
        docLint: {
            requiredFields: ['docType', 'version', 'lastUpdated'],
            autoFixFields: ['lastUpdated'],
            validDocTypes: ['mini-prd', 'adr', 'sppg', 'prompt', 'reference'],
        }
    };

    // Test Case 1: Valid Front-Matter
    console.log('\n  It: should correctly parse valid front-matter');
    setupMocks(
        ['valid.md'],
        {
            '/app/valid.md': `---
docType: mini-prd
version: 1.0.0
lastUpdated: ${getTodayISO()}
---
# Valid Document
Content here.`
        }
    );
    let result = runDocLint([], mockConfig);
    assert.strictEqual(result.success, true, 'Test Case 1 Failed: Should succeed for valid front-matter.');
    assert.strictEqual(result.filesFailed, 0, 'Test Case 1 Failed: No files should fail.');
    assert.strictEqual(result.errorDetails[0].errors.length, 0, 'Test Case 1 Failed: No errors expected.');
    teardownMocks();


    // Test Case 2: Missing a required field (docType)
    console.log('\n  It: should report error for missing docType');
    setupMocks(
        ['missing_doctype.md'],
        {
            '/app/missing_doctype.md': `---
version: 1.0.0
lastUpdated: ${getTodayISO()}
---
# Missing DocType
Content here.`
        }
    );
    result = runDocLint([], mockConfig);
    assert.strictEqual(result.success, false, 'Test Case 2 Failed: Should fail for missing docType.');
    assert.strictEqual(result.filesFailed, 1, 'Test Case 2 Failed: One file should fail.');
    assert.ok(result.errorDetails[0].errors.some(e => e.includes('Missing required front-matter field: docType')), 'Test Case 2 Failed: Specific error for missing docType not found.');
    teardownMocks();

    // Test Case 3: Invalid docType value
    console.log('\n  It: should report error for invalid docType value');
    setupMocks(
        ['invalid_doctype.md'],
        {
            '/app/invalid_doctype.md': `---
docType: nonExistentType
version: 1.0.0
lastUpdated: ${getTodayISO()}
---
# Invalid DocType
Content here.`
        }
    );
    result = runDocLint([], mockConfig);
    assert.strictEqual(result.success, false, 'Test Case 3 Failed: Should fail for invalid docType value.');
    assert.ok(result.errorDetails[0].errors.some(e => e.includes("Invalid docType 'nonExistentType'")), 'Test Case 3 Failed: Specific error for invalid docType not found.');
    teardownMocks();

    // Test Case 4: Invalid version format
    console.log('\n  It: should report error for invalid version format');
    setupMocks(
        ['invalid_version.md'],
        {
            '/app/invalid_version.md': `---
docType: adr
version: 1.0
lastUpdated: ${getTodayISO()}
---
# Invalid Version
Content here.`
        }
    );
    result = runDocLint([], mockConfig);
    assert.strictEqual(result.success, false, 'Test Case 4 Failed: Should fail for invalid version format.');
    assert.ok(result.errorDetails[0].errors.some(e => e.includes("Invalid version format '1.0'")), 'Test Case 4 Failed: Specific error for invalid version not found.');
    teardownMocks();

    // Test Case 5: Invalid lastUpdated date format
    console.log('\n  It: should report error for invalid lastUpdated date format');
    setupMocks(
        ['invalid_date.md'],
        {
            '/app/invalid_date.md': `---
docType: sppg
version: 1.0.0
lastUpdated: 2023/01/01
---
# Invalid Date
Content here.`
        }
    );
    result = runDocLint([], mockConfig);
    assert.strictEqual(result.success, false, 'Test Case 5 Failed: Should fail for invalid date format.');
    assert.ok(result.errorDetails[0].errors.some(e => e.includes("Invalid lastUpdated format '2023/01/01'")), 'Test Case 5 Failed: Specific error for invalid date not found.');
    teardownMocks();

    // Test Case 6: Multiple missing fields
    console.log('\n  It: should report errors for multiple missing fields');
     setupMocks(
        ['multiple_missing.md'],
        {
            '/app/multiple_missing.md': `---
lastUpdated: ${getTodayISO()}
---
# Multiple Missing
Content here.`
        }
    );
    result = runDocLint([], mockConfig);
    assert.strictEqual(result.success, false, 'Test Case 6 Failed: Should fail for multiple missing fields.');
    assert.strictEqual(result.errorDetails[0].errors.length, 2, 'Test Case 6 Failed: Expected 2 errors for missing fields.');
    assert.ok(result.errorDetails[0].errors.some(e => e.includes('Missing required front-matter field: docType')), 'Test Case 6 Failed: Missing docType error not found.');
    assert.ok(result.errorDetails[0].errors.some(e => e.includes('Missing required front-matter field: version')), 'Test Case 6 Failed: Missing version error not found.');
    teardownMocks();
}


async function testAutoFixingLogic() {
    console.log('\n--- Describe: Auto-Fixing Logic ---');
    const today = getTodayISO();

    // Test Case 1: Add missing lastUpdated (default autoFixField)
    console.log('\n  It: should add missing lastUpdated when --fix is enabled');
    const mockConfigFixDefault = {
        projectRoot: '/app',
        docLint: {
            requiredFields: ['docType', 'version', 'lastUpdated'],
            autoFixFields: ['lastUpdated'], // Default
            validDocTypes: ['mini-prd'],
        }
    };
    setupMocks(
        ['missing_date_fix.md'],
        {
            '/app/missing_date_fix.md': `---
docType: mini-prd
version: 1.0.0
---
# Missing Date Fix
Content here.`
        }
    );
    let result = runDocLint(['--fix'], mockConfigFixDefault);
    assert.strictEqual(result.success, true, 'Test Case AF1.1 Failed: Should succeed after fixing.');
    assert.strictEqual(result.filesFixed, 1, 'Test Case AF1.1 Failed: One file should be fixed.');
    assert.strictEqual(writeFileSyncCalls.length, 1, 'Test Case AF1.1 Failed: writeFileSync should be called once.');
    assert.ok(writeFileSyncCalls[0].content.includes(`lastUpdated: ${today}`), 'Test Case AF1.1 Failed: lastUpdated not added or incorrect.');
    assert.ok(result.errorDetails[0].fixes.some(f => f.includes(`Added missing lastUpdated: '${today}'`)), 'Test Case AF1.1 Failed: Fix message not found.');
    teardownMocks();

    // Test Case 2: Update stale lastUpdated
    console.log('\n  It: should update stale lastUpdated when --fix is enabled');
    setupMocks(
        ['stale_date_fix.md'],
        {
            '/app/stale_date_fix.md': `---
docType: mini-prd
version: 1.0.0
lastUpdated: 2020-01-01
---
# Stale Date Fix
Content here.`
        }
    );
    result = runDocLint(['--fix'], mockConfigFixDefault);
    assert.strictEqual(result.success, true, 'Test Case AF2 Failed: Should succeed after fixing date.');
    assert.strictEqual(result.filesFixed, 1, 'Test Case AF2 Failed: One file should be fixed for date.');
    assert.strictEqual(writeFileSyncCalls.length, 1, 'Test Case AF2 Failed: writeFileSync should be called for date update.');
    assert.ok(writeFileSyncCalls[0].content.includes(`lastUpdated: ${today}`), 'Test Case AF2 Failed: lastUpdated not updated correctly.');
    assert.ok(result.errorDetails[0].fixes.some(f => f.includes(`Updated lastUpdated from '2020-01-01' to '${today}'`)), 'Test Case AF2 Failed: Date update fix message not found.');
    teardownMocks();

    // Test Case 3: Add missing docType and version (when configured in autoFixFields)
    console.log('\n  It: should add missing docType and version when configured and --fix is enabled');
    const mockConfigFixAll = {
        projectRoot: '/app',
        docLint: {
            requiredFields: ['docType', 'version', 'lastUpdated'],
            autoFixFields: ['docType', 'version', 'lastUpdated'],
            validDocTypes: ['mini-prd', 'unknown'], // 'unknown' needed if docType is auto-fixed to it
        }
    };
    setupMocks(
        ['missing_all_fix.md'],
        {
            '/app/missing_all_fix.md': `---
# Missing All Fix
Content here.
---`
        }
    );
    result = runDocLint(['--fix'], mockConfigFixAll);
    assert.strictEqual(result.success, true, 'Test Case AF3 Failed: Should succeed after fixing all.');
    assert.strictEqual(result.filesFixed, 1, 'Test Case AF3 Failed: One file should be fixed for all.');
    assert.strictEqual(writeFileSyncCalls.length, 1, 'Test Case AF3 Failed: writeFileSync should be called.');
    const fixedContent = writeFileSyncCalls[0].content;
    assert.ok(fixedContent.includes('docType: unknown'), 'Test Case AF3 Failed: docType not added.');
    assert.ok(fixedContent.includes('version: 1.0.0'), 'Test Case AF3 Failed: version not added.');
    assert.ok(fixedContent.includes(`lastUpdated: ${today}`), 'Test Case AF3 Failed: lastUpdated not added.');
    assert.strictEqual(result.errorDetails[0].fixes.length, 3, 'Test Case AF3 Failed: Expected 3 fix messages.');
    teardownMocks();


    // Test Case 4: Do NOT override existing docType/version if not missing, even if --fix is on
    console.log('\n  It: should NOT override existing docType/version if present, even with --fix');
    setupMocks(
        ['existing_valid_nofix.md'],
        {
            '/app/existing_valid_nofix.md': `---
docType: mini-prd
version: 0.5.0
lastUpdated: ${today} 
---
# Existing Valid, No Fix Expected for these
Content here.`
        }
    );
    // Using mockConfigFixAll to ensure autoFixFields for docType/version are enabled,
    // but they shouldn't apply because fields are present.
    result = runDocLint(['--fix'], mockConfigFixAll);
    assert.strictEqual(result.success, true, 'Test Case AF4 Failed: Should succeed.');
    // filesFixed might be 1 if only lastUpdated was "fixed" due to being today, or 0 if lastUpdated was already today.
    // The key is that docType and version were not "fixed" by adding them.
    // Let's check that writeFileSync was not called if lastUpdated was already today.
    // OR that if it was called, docType & version are original.
    if (writeFileSyncCalls.length > 0) {
        const writtenContent = writeFileSyncCalls[0].content;
        assert.ok(writtenContent.includes('docType: mini-prd'), 'Test Case AF4 Failed: docType was changed.');
        assert.ok(writtenContent.includes('version: 0.5.0'), 'Test Case AF4 Failed: version was changed.');
        // This implies only lastUpdated might have been "fixed" if it wasn't today, which is fine.
        assert.ok(result.errorDetails[0].fixes.every(f => f.includes('lastUpdated')), 'Test Case AF4: Fixes should only be for lastUpdated if any');
    } else {
        // No write call means nothing was fixed, which is correct if lastUpdated was already today.
        assert.strictEqual(result.filesFixed, 0, 'Test Case AF4 Failed: No files should be marked fixed if lastUpdated was current.');
    }
    teardownMocks();
    
    // Test Case 5: Invalid but present docType is NOT fixed if docType not in autoFixFields for "missing"
    // (current autoFixFields logic only adds if *missing*)
    console.log('\n  It: should report error for invalid but present docType and NOT fix it if autoFixFields is only for missing');
     const mockConfigFixOnlyDate = {
        projectRoot: '/app',
        docLint: {
            requiredFields: ['docType', 'version', 'lastUpdated'],
            autoFixFields: ['lastUpdated'], // docType and version are not auto-fixed if missing
            validDocTypes: ['mini-prd', 'adr'],
        }
    };
    setupMocks(
        ['invalid_present_nofix.md'],
        {
            '/app/invalid_present_nofix.md': `---
docType: customTypeThatIsInvalid
version: 1.2.3
lastUpdated: 2020-01-01 
---
# Invalid Present, No Fix for docType/version
Content here.`
        }
    );
    result = runDocLint(['--fix'], mockConfigFixOnlyDate);
    assert.strictEqual(result.success, false, 'Test Case AF5 Failed: Should fail due to invalid docType.');
    assert.strictEqual(result.filesFailed, 1, 'Test Case AF5 Failed: One file should fail.');
    assert.ok(result.errorDetails[0].errors.some(e => e.includes("Invalid docType 'customTypeThatIsInvalid'")), 'Test Case AF5 Failed: Invalid docType error not found.');
    
    // Check that docType was not changed, only lastUpdated might have been
    if (writeFileSyncCalls.length > 0) {
        const writtenContent = writeFileSyncCalls[0].content;
        assert.ok(writtenContent.includes('docType: customTypeThatIsInvalid'), 'Test Case AF5 Failed: docType was changed.');
        assert.ok(writtenContent.includes('version: 1.2.3'), 'Test Case AF5 Failed: version was changed.');
        assert.ok(writtenContent.includes(`lastUpdated: ${today}`), 'Test Case AF5 Failed: lastUpdated should have been fixed.');
        assert.strictEqual(result.errorDetails[0].fixes.length, 1, 'Test Case AF5 Failed: Only one fix (lastUpdated) expected.');
        assert.ok(result.errorDetails[0].fixes[0].includes('lastUpdated'), 'Test Case AF5 Failed: The fix should be for lastUpdated.');
    } else {
        assert.fail('Test Case AF5 Failed: Expected writeFileSync to be called for lastUpdated fix.');
    }
    teardownMocks();
}


// --- Run Tests ---
runTests().catch(err => {
    console.error("Error during tests:", err);
    process.exit(1);
});
