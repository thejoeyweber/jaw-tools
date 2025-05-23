const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running e2e-compile.test.js...');

const cliPath = path.resolve(__dirname, '../bin/jaw-tools-cli.js');
const fixturesDir = path.resolve(__dirname, 'fixtures');
const templatesDir = path.resolve(fixturesDir, 'templates');
const expectedDir = path.resolve(fixturesDir, 'expected');
const outputDir = path.resolve(fixturesDir, 'output_e2e_compile'); // For compiled outputs

// Helper function to run compile command
function runCompile(templateName, options = {}) {
    const templatePath = path.join(templatesDir, templateName);
    const outputFileName = `${path.basename(templateName, '.md')}_compiled.md`;
    const outputPath = path.join(outputDir, outputFileName);
    
    let command = `node ${cliPath} compile ${templatePath} --out ${outputPath}`;
    if (options.configFile) {
        command += ` --config ${path.join(fixturesDir, options.configFile)}`;
    }
    if (options.env) {
        // execSync options take an env property
    }
    if (options.ci) {
        command += ` --ci`;
    }

    // console.log(`Executing: ${command} with env:`, options.env);
    try {
        execSync(command, {
            env: { ...process.env, ...options.env },
            cwd: path.resolve(__dirname, '..') // Run from project root
        });
        return fs.readFileSync(outputPath, 'utf-8');
    } catch (error) {
        // console.error(`Error executing compile for ${templateName}:`, error.stderr ? error.stderr.toString() : error.message);
        // If the command fails and is expected to, we might want to capture the error output.
        // For now, if an error occurs, it will bubble up and fail the test, unless specifically handled.
        // If output file is not created due to error, readFileSync will fail.
        if (fs.existsSync(outputPath)) { // It might have created a file with error content
            return fs.readFileSync(outputPath, 'utf-8');
        }
        return `COMMAND_FAILED: ${error.message}`; // Return a specific string if command fails hard
    }
}

function testCompileSimpleFile() {
    console.log('  Testing compile: simple_file.md...');
    const actualOutput = runCompile('simple_file.md');
    const expectedOutput = fs.readFileSync(path.join(expectedDir, 'simple_file_compiled.md'), 'utf-8');
    assert.strictEqual(actualOutput.trim(), expectedOutput.trim(), 'Test Case: simple_file.md Failed');
    console.log('  simple_file.md passed.');
}

function testCompileDefaultVar() {
    console.log('  Testing compile: default_var.md...');
    const actualOutput = runCompile('default_var.md');
    const expectedOutput = fs.readFileSync(path.join(expectedDir, 'default_var_compiled.md'), 'utf-8');
    assert.strictEqual(actualOutput.trim(), expectedOutput.trim(), 'Test Case: default_var.md Failed');
    console.log('  default_var.md passed.');
}

function testCompileEnvVarSuccess() {
    console.log('  Testing compile: env_var.md (Success)...');
    const actualOutput = runCompile('env_var.md', { env: { MY_TEST_ENV_VAR: 'E2ETestEnvValue' } });
    const expectedOutput = fs.readFileSync(path.join(expectedDir, 'env_var_compiled_success.md'), 'utf-8');
    assert.strictEqual(actualOutput.trim(), expectedOutput.trim(), 'Test Case: env_var.md (Success) Failed');
    console.log('  env_var.md (Success) passed.');
}

function testCompileEnvVarFail() {
    console.log('  Testing compile: env_var.md (Fail)...');
    // Ensure the env var is not set, or set to something that won't be picked up
    const currentEnv = { ...process.env };
    delete currentEnv.MY_TEST_ENV_VAR; 
    const actualOutput = runCompile('env_var.md', { env: currentEnv, ci: true }); // CI mode to prevent prompts
    const expectedOutput = fs.readFileSync(path.join(expectedDir, 'env_var_compiled_fail.md'), 'utf-8');
    assert.strictEqual(actualOutput.trim(), expectedOutput.trim(), 'Test Case: env_var.md (Fail) Failed');
    console.log('  env_var.md (Fail) passed.');
}

function testCompileCustomVarConfig() {
    console.log('  Testing compile: custom_var_config.md...');
    // This test relies on the --config flag pointing to our fixture config
    // The jaw-tools-cli.js needs to be updated to handle --config for compile command
    // For now, let's assume config is loaded from test/fixtures/jaw-tools.config.js due to CWD
    // or by placing it in the root and renaming it temporarily.
    // The most robust way is to ensure the CLI's config loading finds our test config.
    // We can achieve this by setting CWD for execSync to 'test/fixtures' and adjusting paths.
    
    // For this test, we will copy the fixture config to the root, run, then delete.
    const rootDir = path.resolve(__dirname, '..');
    const fixtureConfigPath = path.join(fixturesDir, 'jaw-tools.config.js');
    const tempConfigPathInRoot = path.join(rootDir, 'jaw-tools.config.js');

    fs.copyFileSync(fixtureConfigPath, tempConfigPathInRoot);
    let actualOutput;
    try {
        actualOutput = runCompile('custom_var_config.md', { ci: true }); // ci: true to avoid any potential prompts
    } finally {
        fs.unlinkSync(tempConfigPathInRoot); // Clean up
    }
    const expectedOutput = fs.readFileSync(path.join(expectedDir, 'custom_var_config_compiled.md'), 'utf-8');
    assert.strictEqual(actualOutput.trim(), expectedOutput.trim(), 'Test Case: custom_var_config.md Failed');
    console.log('  custom_var_config.md passed.');
}

function testCompileFiltersAndValidation() {
    console.log('  Testing compile: filters_and_validation.md...');
    const rootDir = path.resolve(__dirname, '..');
    const fixtureConfigPath = path.join(fixturesDir, 'jaw-tools.config.js');
    const tempConfigPathInRoot = path.join(rootDir, 'jaw-tools.config.js');

    fs.copyFileSync(fixtureConfigPath, tempConfigPathInRoot);
    let actualOutput;
    try {
        // The template is in 'test/fixtures/templates/filters_and_validation.md'
        // The files it references (e.g. /files/data.txt) need to be relative to project root
        // or the E2E config needs to point __projectRoot to test/fixtures
        // The current `jaw-tools.config.js` in fixtures does not set __projectRoot.
        // `configManager.findProjectRoot()` will find the main project root.
        // The paths in templates like {{/files/data.txt}} will be sought from `projectRoot + /files/data.txt`
        // So, we need `files` dir to be `test/fixtures/files` from project root.
        // This should work if `runCompile` uses `cwd: path.resolve(__dirname, '..')`
        actualOutput = runCompile('filters_and_validation.md', { ci: true });
    } finally {
        fs.unlinkSync(tempConfigPathInRoot); // Clean up
    }
    
    const expectedOutputContent = fs.readFileSync(path.join(expectedDir, 'filters_and_validation_compiled.md'), 'utf-8').trim();
    // Normalize paths in expected output for comparison, as it contains absolute paths from test generation time
    const normalizedExpected = expectedOutputContent.replace(/\/app\/test\/fixtures\//g, '');
    const normalizedActual = actualOutput.trim().replace(new RegExp(path.join(rootDir, 'test/fixtures').replace(/\\/g, '/'), 'g'), '');
    
    assert.strictEqual(normalizedActual, normalizedExpected, 'Test Case: filters_and_validation.md Failed');
    console.log('  filters_and_validation.md passed.');
}


// Main test execution
async function runAllE2ECompileTests() {
    if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });

    try {
        testCompileSimpleFile();
        testCompileDefaultVar();
        testCompileEnvVarSuccess();
        testCompileEnvVarFail();
        testCompileCustomVarConfig(); // This test needs careful config handling
        testCompileFiltersAndValidation(); // Also needs config and path handling
        console.log('All e2e-compile tests passed!');
    } catch (error) {
        console.error('E2E Compile Test Failed:', error);
        process.exit(1);
    } finally {
        // Clean up output directory if desired, or inspect it manually
        // fs.rmSync(outputDir, { recursive: true, force: true });
    }
}

if (require.main === module) {
    runAllE2ECompileTests();
}

module.exports = { runAllE2ECompileTests };
