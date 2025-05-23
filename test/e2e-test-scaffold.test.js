const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process'); // Using spawnSync for better error capture

console.log('Running e2e-test-scaffold.test.js...');

const projectRootDir = path.resolve(__dirname, '..');
const cliPath = path.join(projectRootDir, 'bin/jaw-tools-cli.js');
const e2eFixturesDir = path.join(projectRootDir, 'test/fixtures/test-scaffold-e2e');
const featuresBaseDir = path.join(e2eFixturesDir, 'features'); // Base for feature folders for this test suite

// Helper function to run test-scaffold command
function runTestScaffold(argsString, expectSuccess = true) {
    const command = `node ${cliPath} ts ${argsString}`; // 'ts' is alias for test-scaffold
    console.log(`  Executing E2E: ${command}`);
    
    const result = spawnSync('node', [cliPath, 'ts', ...argsString.split(' ')], {
        cwd: e2eFixturesDir, // Run CLI from the E2E fixture directory context
        encoding: 'utf-8',
        shell: false // Better not to use shell for spawnSync if not needed
    });

    if (expectSuccess && result.status !== 0) {
        console.error('E2E command failed unexpectedly:');
        console.error('STDOUT:', result.stdout);
        console.error('STDERR:', result.stderr);
    } else if (!expectSuccess && result.status === 0) {
        console.error('E2E command succeeded but was expected to fail:');
        console.error('STDOUT:', result.stdout);
    }
    
    return {
        status: result.status,
        stdout: result.stdout,
        stderr: result.stderr
    };
}

// Helper to clean up created feature directories
function cleanupFeatureDir(featureSlug) {
    const featureDirPath = path.join(featuresBaseDir, featureSlug);
    if (fs.existsSync(featureDirPath)) {
        fs.rmSync(featureDirPath, { recursive: true, force: true });
        // console.log(`  Cleaned up: ${featureDirPath}`);
    }
}

// Helper to verify file content
function verifyFileContent(filePath, expectedPlaceholdersReplaced, expectedTodoMarker) {
    assert.ok(fs.existsSync(filePath), `File ${filePath} should exist.`);
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes(expectedPlaceholdersReplaced), `File ${filePath} content missing replaced placeholders. Got:\n${content}`);
    assert.ok(content.includes(expectedTodoMarker), `File ${filePath} content missing TODO marker. Got:\n${content}`);
}

async function testBasicRun() {
    const featureSlug = 'new-e2e-feat';
    const featurePath = path.join(featuresBaseDir, featureSlug);
    const testsPath = path.join(featurePath, '__tests__');
    console.log(`  Testing basic run for '${featureSlug}'...`);
    cleanupFeatureDir(featureSlug); // Ensure clean state

    // For this test, we want user to confirm folder creation if prompted by inquirer mock used in unit tests
    // However, E2E tests run the actual CLI, so we need to handle real inquirer prompts
    // The CLI test-scaffold case should be non-interactive by default or accept a --yes / --ci flag.
    // For now, let's assume it creates the folder without prompt for simplicity in E2E,
    // or we can pipe 'yes' to it if it's truly interactive.
    // The current lib/test-scaffold.js prompts. We'll run with --force to bypass prompt for folder creation.
    // The prompt is "Feature folder ... not found. Create it?".
    // We can't easily pipe 'yes' with spawnSync without more complex stream handling.
    // The test-scaffold CLI does not yet have a --yes. Let's assume it creates the dir or we use --force.
    // The lib/test-scaffold.js will create the feature folder if it doesn't exist and not dryRun.
    // Let's rely on that behavior and ensure it.

    const result = runTestScaffold(featureSlug); // No --force, rely on default behavior
    assert.strictEqual(result.status, 0, `Basic run failed. STDERR: ${result.stderr}`);

    const unitTestPath = path.join(testsPath, `${featureSlug}.unit.test.js`); // Default naming
    const apiTestPath = path.join(testsPath, `${featureSlug}.api.test.js`);   // Default naming

    verifyFileContent(unitTestPath, `// Unit test for ${featureSlug}`, `// E2E TODO for ${featureSlug}`);
    verifyFileContent(apiTestPath, `// API test for ${featureSlug}`, `// E2E TODO for ${featureSlug}`);
    
    assert.ok(result.stdout.includes(`Created feature folder: ${path.join('features', featureSlug)}`), "Expected log for feature folder creation");
    assert.ok(result.stdout.includes(`Test suites to scaffold for '${featureSlug}': unit, api`), "Expected log for suites to scaffold");
    assert.ok(result.stdout.includes(`Created test file: ${path.relative(e2eFixturesDir, unitTestPath)}`), "Expected log for unit test file creation");
    assert.ok(result.stdout.includes(`Created test file: ${path.relative(e2eFixturesDir, apiTestPath)}`), "Expected log for api test file creation");

    cleanupFeatureDir(featureSlug);
    console.log(`  Basic run for '${featureSlug}' passed.`);
}

async function testDryRun() {
    const featureSlug = 'new-feat-dry';
    const featurePath = path.join(featuresBaseDir, featureSlug);
    const testsPath = path.join(featurePath, '__tests__');
    console.log(`  Testing --dry-run for '${featureSlug}'...`);
    cleanupFeatureDir(featureSlug);

    const result = runTestScaffold(`${featureSlug} --dry-run`);
    assert.strictEqual(result.status, 0, `Dry run failed. STDERR: ${result.stderr}`);
    
    const unitTestPath = path.join(testsPath, `${featureSlug}.unit.test.js`);
    const apiTestPath = path.join(testsPath, `${featureSlug}.api.test.js`);

    assert.ok(!fs.existsSync(featurePath), `Feature folder ${featurePath} should NOT exist after dry run.`);
    assert.ok(result.stdout.includes(`[dry-run] Would prompt to create feature folder: ${path.join('features', featureSlug)}`), "Expected dry run log for folder prompt");
    assert.ok(result.stdout.includes(`[dry-run] Would create/overwrite test file: ${path.join(testsPath, featureSlug + '.unit.test.js')}`), "Expected dry run log for unit file");
    assert.ok(result.stdout.includes(`[dry-run] Would create/overwrite test file: ${path.join(testsPath, featureSlug + '.api.test.js')}`), "Expected dry run log for api file");
    
    cleanupFeatureDir(featureSlug); // Should do nothing if dry run was successful
    console.log(`  --dry-run for '${featureSlug}' passed.`);
}

async function testForceOverwrite() {
    const featureSlug = 'new-feat-force';
    const featurePath = path.join(featuresBaseDir, featureSlug);
    const testsPath = path.join(featurePath, '__tests__');
    const unitTestPath = path.join(testsPath, `${featureSlug}.unit.test.js`);
    console.log(`  Testing --force for '${featureSlug}'...`);
    cleanupFeatureDir(featureSlug);
    
    fs.mkdirSync(testsPath, { recursive: true });
    const dummyContent = "// Old dummy content";
    fs.writeFileSync(unitTestPath, dummyContent, 'utf-8');

    const result = runTestScaffold(`${featureSlug} --force`);
    assert.strictEqual(result.status, 0, `Force overwrite failed. STDERR: ${result.stderr}`);
    
    verifyFileContent(unitTestPath, `// Unit test for ${featureSlug}`, `// E2E TODO for ${featureSlug}`);
    const currentContent = fs.readFileSync(unitTestPath, 'utf-8');
    assert.notStrictEqual(currentContent, dummyContent, "File content should have been overwritten.");

    cleanupFeatureDir(featureSlug);
    console.log(`  --force for '${featureSlug}' passed.`);
}

async function testTypesOption() {
    const featureSlug = 'new-feat-types';
    const featurePath = path.join(featuresBaseDir, featureSlug);
    const testsPath = path.join(featurePath, '__tests__');
    console.log(`  Testing --types for '${featureSlug}'...`);
    cleanupFeatureDir(featureSlug);

    const result = runTestScaffold(`${featureSlug} --types unit`);
    assert.strictEqual(result.status, 0, `--types unit failed. STDERR: ${result.stderr}`);

    const unitTestPath = path.join(testsPath, `${featureSlug}.unit.test.js`);
    const apiTestPath = path.join(testsPath, `${featureSlug}.api.test.js`);
    
    verifyFileContent(unitTestPath, `// Unit test for ${featureSlug}`, `// E2E TODO for ${featureSlug}`);
    assert.ok(!fs.existsSync(apiTestPath), `API test file ${apiTestPath} should NOT exist.`);
    assert.ok(result.stdout.includes(`Test suites to scaffold for '${featureSlug}': unit`), "Expected log for specific types");

    cleanupFeatureDir(featureSlug);
    console.log(`  --types for '${featureSlug}' passed.`);
}

async function testExistingFeatureFolder() {
    const featureSlug = 'existing-feature'; // This folder is created by .gitkeep in fixtures
    const featurePath = path.join(featuresBaseDir, featureSlug);
    const testsPath = path.join(featurePath, '__tests__');
    console.log(`  Testing existing feature folder '${featureSlug}'...`);
    // Clean up __tests__ dir from previous runs if any, but keep 'existing-feature' folder
    if(fs.existsSync(testsPath)) fs.rmSync(testsPath, { recursive: true, force: true });


    const result = runTestScaffold(featureSlug);
    assert.strictEqual(result.status, 0, `Existing feature folder test failed. STDERR: ${result.stderr}`);
    
    const unitTestPath = path.join(testsPath, `${featureSlug}.unit.test.js`);
    const apiTestPath = path.join(testsPath, `${featureSlug}.api.test.js`);
    verifyFileContent(unitTestPath, `// Unit test for ${featureSlug}`, `// E2E TODO for ${featureSlug}`);
    verifyFileContent(apiTestPath, `// API test for ${featureSlug}`, `// E2E TODO for ${featureSlug}`);
    assert.ok(result.stdout.includes(`Feature folder found: ${path.join('features', featureSlug)}`), "Expected log for finding existing feature folder");

    // No cleanup of 'existing-feature' itself as it's part of fixtures, just its __tests__
    if(fs.existsSync(testsPath)) fs.rmSync(testsPath, { recursive: true, force: true });
    console.log(`  Existing feature folder '${featureSlug}' passed.`);
}

async function testInvalidSlug() {
    const featureSlug = 'bad name'; // Invalid slug
    console.log(`  Testing invalid slug '${featureSlug}'...`);
    
    const result = runTestScaffold(`"${featureSlug}"`, false); // Expect failure
    assert.notStrictEqual(result.status, 0, 'Invalid slug command should have failed (non-zero exit code).');
    assert.ok(result.stderr.includes('Error: Invalid <feature-name-slug>'), `Expected error message for invalid slug. Got: ${result.stderr}`);
    
    console.log(`  Invalid slug '${featureSlug}' passed.`);
}

async function testMissingTemplates() {
    const featureSlug = 'new-feat-missing-tpl';
    const featurePath = path.join(featuresBaseDir, featureSlug);
    const testsPath = path.join(featurePath, '__tests__');
    console.log(`  Testing missing templates for '${featureSlug}'...`);
    cleanupFeatureDir(featureSlug);

    const originalApiTemplatePath = path.join(e2eFixturesDir, 'templates/tests/api.test.template.ts');
    const renamedApiTemplatePath = path.join(e2eFixturesDir, 'templates/tests/api.test.template.ts.bak');
    fs.renameSync(originalApiTemplatePath, renamedApiTemplatePath); // Simulate missing template

    let result;
    try {
        result = runTestScaffold(featureSlug);
        assert.strictEqual(result.status, 0, `Missing templates test failed. STDERR: ${result.stderr}`);
        
        const unitTestPath = path.join(testsPath, `${featureSlug}.unit.test.js`);
        const apiTestPath = path.join(testsPath, `${featureSlug}.api.test.js`);
        
        verifyFileContent(unitTestPath, `// Unit test for ${featureSlug}`, `// E2E TODO for ${featureSlug}`);
        assert.ok(!fs.existsSync(apiTestPath), `API test file ${apiTestPath} should NOT exist due to missing template.`);
        assert.ok(result.stdout.includes("Warning: Template file not found for type 'api'"), "Expected warning for missing API template");

    } finally {
        fs.renameSync(renamedApiTemplatePath, originalApiTemplatePath); // Restore template
        cleanupFeatureDir(featureSlug);
    }
    console.log(`  Missing templates for '${featureSlug}' passed.`);
}


async function runAllE2ETests() {
    // Ensure the base 'features' directory for E2E tests exists
    if (!fs.existsSync(featuresBaseDir)) {
        fs.mkdirSync(featuresBaseDir, { recursive: true });
    }
    try {
        await testBasicRun();
        await testDryRun();
        await testForceOverwrite();
        await testTypesOption();
        await testExistingFeatureFolder();
        await testInvalidSlug();
        await testMissingTemplates();
        console.log('All e2e-test-scaffold tests passed!');
    } catch (error) {
        console.error('E2E Test Suite Failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    runAllE2ETests();
}

module.exports = { runAllE2ETests };
