// test/e2e/workflow_e2e.test.js
const assert = require('assert');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const cliPath = path.resolve(__dirname, '../../bin/jaw-tools-cli.js');
const e2eTestDir = path.resolve(__dirname); // The e2e tests will run from within test/e2e/
const e2eConfigPath = path.join(e2eTestDir, 'jaw-tools.config.js'); // Defined in previous step

describe('E2E Tests for jaw workflow run', function() {
    // Increase timeout for E2E tests if necessary, though these should be quick
    this.timeout(10000); 

    // Ensure the specific e2e config is present (it was created in the previous step)
    before(() => {
        assert(fs.existsSync(e2eConfigPath), `E2E config file not found at ${e2eConfigPath}`);
    });

    describe('Basic Execution', () => {
        it('should execute a simple workflow and substitute environment variables', () => {
            const originalEnvVar = process.env.E2E_VAR;
            process.env.E2E_VAR = "Hello E2E World";
            let output;
            try {
                output = execSync(`node "${cliPath}" workflow run e2e-echo`, {
                    cwd: e2eTestDir, // Run CLI with CWD set to test/e2e
                    env: { ...process.env }, // Pass current environment variables
                    encoding: 'utf-8'
                });
                // console.log('E2E Test 1 Output:\n', output); 
            } catch (e) {
                console.error('E2E Test 1 STDOUT:', e.stdout);
                console.error('E2E Test 1 STDERR:', e.stderr);
                assert.fail(`CLI execution failed: ${e.message}`);
            } finally {
                // Restore original environment variable if it existed
                if (originalEnvVar === undefined) {
                    delete process.env.E2E_VAR;
                } else {
                    process.env.E2E_VAR = originalEnvVar;
                }
            }
            assert(output.includes("E2E test message: Hello E2E World"), `Expected output not found. Output was: ${output}`);
            assert(output.includes("Workflow 'e2e-echo' completed successfully."), "Success message not found.");
        });
    });

    describe('Dry-Run Execution', () => {
        it('should display dry-run information and not execute commands', () => {
            let output;
            try {
                output = execSync(`node "${cliPath}" workflow run e2e-dry-run-test --dry-run`, {
                    cwd: e2eTestDir,
                    env: { ...process.env },
                    encoding: 'utf-8'
                });
                // console.log('E2E Test 2 Output:\n', output);
            } catch (e) {
                console.error('E2E Test 2 STDOUT:', e.stdout);
                console.error('E2E Test 2 STDERR:', e.stderr);
                assert.fail(`CLI execution failed: ${e.message}`);
            }
            assert(output.includes('[DRY RUN] Command: echo "This should not execute in dry run"'), `Dry run prefix not found. Output: ${output}`);
            assert(output.includes('Description: Dry run step'), `Dry run description not found. Output: ${output}`);
            // Check that the actual command output is NOT present
            assert(!output.includes("This should not execute in dry run") || output.includes('[DRY RUN]'), `Command appears to have executed in dry-run mode. Output: ${output}`);
            assert(output.includes("Workflow 'e2e-dry-run-test' completed successfully."), "Success message for dry-run not found.");
        });
    });
    
    describe('Error Handling Execution', () => {
        it('should fail if a step fails and continueOnError is false', () => {
            try {
                execSync(`node "${cliPath}" workflow run e2e-fail-no-continue`, {
                    cwd: e2eTestDir,
                    env: { ...process.env },
                    encoding: 'utf-8'
                });
                assert.fail("CLI command should have failed but it succeeded.");
            } catch (e) {
                // Expected failure
                const output = e.stdout + e.stderr;
                // console.log('E2E Test 3 Output:\n', output);
                assert(output.includes('Error executing command: node -e "process.exit(1);"'), 'Error message for command execution not found.');
                assert(output.includes('Halting workflow "e2e-fail-no-continue"'), 'Halting message not found.');
                assert(output.includes("Workflow 'e2e-fail-no-continue' failed or was halted due to errors."), "Failure summary message not found.");
            }
        });

        it('should continue and succeed if a step fails but continueOnError is true and subsequent steps succeed', () => {
            let output;
            try {
                output = execSync(`node "${cliPath}" workflow run e2e-fail-with-continue`, {
                    cwd: e2eTestDir,
                    env: { ...process.env },
                    encoding: 'utf-8'
                });
                // console.log('E2E Test 4 Output:\n', output);
            } catch (e) {
                console.error('E2E Test 4 STDOUT:', e.stdout);
                console.error('E2E Test 4 STDERR:', e.stderr);
                assert.fail(`CLI execution failed: ${e.message}`);
            }
            assert(output.includes('Error executing command: node -e "process.exit(1);"'), 'Error message for failing step not found.');
            assert(output.includes('Continuing to next step due to \'continueOnError: true\' for step "Failing step with continue"'), 'ContinueOnError warning not found.');
            assert(output.includes('Second step after continue'), 'Output from second step not found.');
            assert(output.includes("Workflow 'e2e-fail-with-continue' completed successfully."), "Success message not found despite continueOnError.");
        });
    });
});
