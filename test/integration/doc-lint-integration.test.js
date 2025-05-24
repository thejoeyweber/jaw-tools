const assert = require('assert');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLI_PATH = path.resolve(__dirname, '../../../bin/jaw-tools-cli.js'); // Adjust if your script is elsewhere
const TEST_DIR_BASE = path.resolve(__dirname, 'doc-lint-tests');
const DOCS_TO_LINT_DIR = path.join(TEST_DIR_BASE, 'docs_to_lint');

// Store original file contents to reset after --fix tests
const originalFileContents = {};

function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

async function storeOriginalContent(relativePath) {
    const fullPath = path.join(DOCS_TO_LINT_DIR, relativePath);
    if (fs.existsSync(fullPath)) {
        originalFileContents[relativePath] = fs.readFileSync(fullPath, 'utf-8');
    } else {
        console.warn(`Warning: Could not store original content for ${relativePath}, file does not exist.`);
    }
}

async function restoreFile(relativePath) {
    if (originalFileContents[relativePath]) {
        const fullPath = path.join(DOCS_TO_LINT_DIR, relativePath);
        fs.writeFileSync(fullPath, originalFileContents[relativePath], 'utf-8');
    }
}

function runCliCommand(argsString) {
    const command = `node ${CLI_PATH} doc lint ${argsString}`;
    // console.log(`Executing: ${command} in ${TEST_DIR_BASE}`); // For debugging
    return new Promise((resolve) => {
        exec(command, { cwd: TEST_DIR_BASE }, (error, stdout, stderr) => {
            resolve({
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: error ? error.code : 0,
            });
        });
    });
}

async function runIntegrationTests() {
    console.log('Starting doc lint integration tests...\n');

    // --- Pre-test setup: Store original content for files that will be fixed ---
    await storeOriginalContent('missing_version.md');
    await storeOriginalContent('stale_date.md');
    await storeOriginalContent('no_frontmatter.md'); // Will be fixed by adding all fields

    try {
        await testBasicLinting();
        await testLintingWithFix();
        await testLintingWithPath();
        await testLintingWithIgnore();
    } catch (e) {
        console.error('🔴🔴🔴 A test failed catastrophically 🔴🔴🔴');
        console.error(e);
        process.exitCode = 1; // Indicate failure
    } finally {
        // --- Post-test cleanup: Restore modified files ---
        console.log('\nRestoring modified files...');
        await restoreFile('missing_version.md');
        await restoreFile('stale_date.md');
        await restoreFile('no_frontmatter.md');
        console.log('Restoration complete.');
    }

    console.log('\nAll doc lint integration tests completed.');
    if (process.exitCode === 1) {
         console.log("🔴 Some tests failed.");
    } else {
        console.log("✅ All tests passed.");
    }
}

async function testBasicLinting() {
    console.log('\n--- Test Scenario 1: Basic Linting (no fix) ---');
    // Target the docs_to_lint directory relative to TEST_DIR_BASE (where jaw-tools.config.js is)
    const result = await runCliCommand(`--path docs_to_lint`);
    
    // console.log("Basic Linting STDOUT:", result.stdout);
    // console.log("Basic Linting STDERR:", result.stderr);
    // console.log("Basic Linting Exit Code:", result.exitCode);

    assert.notStrictEqual(result.exitCode, 0, 'Test 1 Failed: Exit code should be non-zero due to errors.');
    
    assert.ok(result.stdout.includes('✖ valid.md'), 'Test 1 Failed: valid.md should have a stale date error by default before fix.');
    assert.ok(result.stdout.includes('Error: Invalid lastUpdated format \'2024-01-01 \''), 'Test 1 Failed: Stale date error message missing for valid.md.');

    assert.ok(result.stdout.includes('✖ missing_version.md'), 'Test 1 Failed: missing_version.md should be listed as failing.');
    assert.ok(result.stdout.includes('Error: Missing required front-matter field: version'), 'Test 1 Failed: Missing version error message not found.');

    assert.ok(result.stdout.includes('✖ stale_date.md'), 'Test 1 Failed: stale_date.md should be listed as failing for stale date.');
    // The default config in doc-lint.test.js has lastUpdated in autoFixFields, so it is fixed, but here it's a normal run
    // The check is for the *format* first, then the *value* if fix is on. Here, the format is okay, but it's stale.
    // The summary should reflect this. The error message might not explicitly say "stale" but a fix would be for it.
    // Let's assume it's an error because it's not today's date and not fixed.
    // Actually, without --fix, a stale date is not an "error" but a candidate for fixing.
    // The current linter logic doesn't flag a valid-formatted past date as an error unless --fix is on and updates it.
    // So, stale_date.md might pass if we only check for *format* errors.
    // Let's adjust expectations: stale_date.md should pass format validation but would be fixed by --fix.
    // The default config in `doc-lint-tests/jaw-tools.config.js` has lastUpdated in autoFixFields.
    // The `runDocLint` will update it if fixMode is on.
    // For basic linting (no fix), a past valid date is NOT an error.
    // However, the problem description implies stale_date.md has an "old lastUpdated date"
    // and the test for --fix implies it *should* be updated.
    // Let's assume for the basic linting, it's an error if it's not today.
    // The linter's current behavior is: stale date is NOT an error unless --fix is on, then it's a FIX.
    // So, for basic lint, stale_date.md should PASS if the date is valid format.
    // The `valid.md` has "2024-01-01 ", which has a trailing space, this IS an error.
    assert.ok(result.stdout.includes('✖ invalid_doctype.md'), 'Test 1 Failed: invalid_doctype.md should be listed as failing.');
    assert.ok(result.stdout.includes('Error: Invalid docType \'someInvalidType\''), 'Test 1 Failed: Invalid docType error message not found.');

    assert.ok(result.stdout.includes('✖ no_frontmatter.md'), 'Test 1 Failed: no_frontmatter.md should be listed as failing.');
    assert.ok(result.stdout.includes('Error: Missing required front-matter field: docType'), 'Test 1 Failed: Missing docType for no_frontmatter.md not found.');
    assert.ok(result.stdout.includes('Error: Missing required front-matter field: version'), 'Test 1 Failed: Missing version for no_frontmatter.md not found.');
    assert.ok(result.stdout.includes('Error: Missing required front-matter field: lastUpdated'), 'Test 1 Failed: Missing lastUpdated for no_frontmatter.md not found.');
    
    assert.ok(result.stdout.includes('files passed |'), 'Test 1 Failed: Summary line not found.');
    console.log('Test Scenario 1 Passed.');
}

async function testLintingWithFix() {
    console.log('\n--- Test Scenario 2: Linting with --fix ---');
    const today = getTodayISO();
    // Target the docs_to_lint directory
    const result = await runCliCommand(`--path docs_to_lint --fix`);

    // console.log("Fixing STDOUT:", result.stdout);
    // console.log("Fixing STDERR:", result.stderr);
    // console.log("Fixing Exit Code:", result.exitCode);

    // Exit code might be 0 if all *remaining* errors are unfixable, or if all fixable ones were fixed.
    // It should be non-zero because invalid_doctype.md is unfixable.
    assert.notStrictEqual(result.exitCode, 0, 'Test 2 Failed: Exit code should be non-zero due to unfixable errors.');

    // Check valid.md (its date had a trailing space, which is an invalid format)
    const validContentAfterFix = fs.readFileSync(path.join(DOCS_TO_LINT_DIR, 'valid.md'), 'utf-8');
    assert.ok(validContentAfterFix.includes(`lastUpdated: ${today}`), 'Test 2 Failed: valid.md lastUpdated not fixed to today.');
    assert.ok(result.stdout.includes(`🛠️ valid.md`), 'Test 2 Failed: valid.md should be reported as fixed.');
    assert.ok(result.stdout.includes(`Fix: Updated lastUpdated from '2024-01-01 ' to '${today}'`), 'Test 2 Failed: Fix message for valid.md not found.');


    // Check missing_version.md
    const missingVersionContentAfterFix = fs.readFileSync(path.join(DOCS_TO_LINT_DIR, 'missing_version.md'), 'utf-8');
    assert.ok(missingVersionContentAfterFix.includes('version: 1.0.0'), 'Test 2 Failed: missing_version.md version not added.');
    assert.ok(result.stdout.includes(`🛠️ missing_version.md`), 'Test 2 Failed: missing_version.md should be reported as fixed.');
    assert.ok(result.stdout.includes('Fix: Added missing version: \'1.0.0\''), 'Test 2 Failed: Fix message for missing_version.md not found.');

    // Check stale_date.md
    const staleDateContentAfterFix = fs.readFileSync(path.join(DOCS_TO_LINT_DIR, 'stale_date.md'), 'utf-8');
    assert.ok(staleDateContentAfterFix.includes(`lastUpdated: ${today}`), 'Test 2 Failed: stale_date.md lastUpdated not updated.');
    assert.ok(result.stdout.includes(`🛠️ stale_date.md`), 'Test 2 Failed: stale_date.md should be reported as fixed.');
    assert.ok(result.stdout.includes(`Fix: Updated lastUpdated from '2020-02-15' to '${today}'`), 'Test 2 Failed: Fix message for stale_date.md not found.');
    
    // Check no_frontmatter.md (should have all configured autoFixFields added)
    const noFrontmatterContentAfterFix = fs.readFileSync(path.join(DOCS_TO_LINT_DIR, 'no_frontmatter.md'), 'utf-8');
    assert.ok(noFrontmatterContentAfterFix.includes('docType: unknown'), 'Test 2 Failed: no_frontmatter.md docType not added.');
    assert.ok(noFrontmatterContentAfterFix.includes('version: 1.0.0'), 'Test 2 Failed: no_frontmatter.md version not added.');
    assert.ok(noFrontmatterContentAfterFix.includes(`lastUpdated: ${today}`), 'Test 2 Failed: no_frontmatter.md lastUpdated not added.');
    assert.ok(result.stdout.includes('🛠️ no_frontmatter.md'), 'Test 2 Failed: no_frontmatter.md should be reported as fixed.');

    // Check invalid_doctype.md (should still fail as it's not auto-fixable by current logic)
    assert.ok(result.stdout.includes('✖ invalid_doctype.md'), 'Test 2 Failed: invalid_doctype.md should still be failing.');
    assert.ok(result.stdout.includes('Error: Invalid docType \'someInvalidType\''), 'Test 2 Failed: Invalid docType error for invalid_doctype.md should persist.');
    
    console.log('Test Scenario 2 Passed.');
}

async function testLintingWithPath() {
    console.log('\n--- Test Scenario 3: Linting with --path ---');
    const result = await runCliCommand(`--path docs_to_lint/sub_docs`);
    
    // console.log("Path Test STDOUT:", result.stdout);

    assert.strictEqual(result.exitCode, 0, 'Test 3 Failed: Exit code should be 0 as sub_valid.md is valid.');
    assert.ok(result.stdout.includes('✔ docs_to_lint/sub_docs/sub_valid.md'), 'Test 3 Failed: sub_valid.md should be processed and pass.');
    assert.ok(result.stdout.includes('1 files passed | 0 fixed | 0 failed'), 'Test 3 Failed: Summary incorrect for --path.');
    assert.ok(!result.stdout.includes('valid.md'), 'Test 3 Failed: Files from parent directory should not be processed.');
    console.log('Test Scenario 3 Passed.');
}

async function testLintingWithIgnore() {
    console.log('\n--- Test Scenario 4: Linting with --ignore ---');
    // Note: The paths in ignore should be relative to the CWD of the command, or use glob patterns.
    // Here, docs_to_lint/ignored_file.md is relative to TEST_DIR_BASE.
    const result = await runCliCommand(`--path docs_to_lint --ignore "**/ignored_file.md"`);

    // console.log("Ignore Test STDOUT:", result.stdout);
    // console.log("Ignore Test STDERR:", result.stderr);
    // console.log("Ignore Test Exit Code:", result.exitCode);


    assert.ok(!result.stdout.includes('ignored_file.md'), 'Test 4 Failed: ignored_file.md should not be processed or listed.');
    // It should still process other files and find errors in them.
    assert.ok(result.stdout.includes('✖ valid.md'), 'Test 4 Failed: valid.md should be processed.');
    assert.ok(result.stdout.includes('✖ missing_version.md'), 'Test 4 Failed: missing_version.md should be processed.');
    assert.notStrictEqual(result.exitCode, 0, 'Test 4 Failed: Exit code should be non-zero due to other errors.');
    console.log('Test Scenario 4 Passed.');
}


runIntegrationTests();
