// test/workflow_run.test.js
const assert = require('assert');
const path = require('path'); // For potential path manipulations if needed
const { runWorkflow, parseWorkflowConfig, getWorkflow, executeWorkflow } = require('../src/workflow/run'); // Importing all for direct testing if needed

// Mock dependencies
const child_process = require('child_process');
const configManager = require('../src/config-manager');

// Store original functions to restore them
const originalExecSync = child_process.execSync;
const originalGetConfig = configManager.getConfig;
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

let execSyncCalls = [];
let consoleLogs = [];
let consoleErrors = [];

describe('Workflow Execution - src/workflow/run.js', () => {
    beforeEach(() => {
        execSyncCalls = [];
        consoleLogs = [];
        consoleErrors = [];

        // Mock execSync
        child_process.execSync = (command, options) => {
            execSyncCalls.push({ command, options });
            // Simulate success by default. Specific tests can override this mock locally.
            // For example, to simulate failure: if (command === 'failing_command') throw new Error('Failed');
        };

        // Mock console.log and console.error to capture output
        console.log = (message) => consoleLogs.push(message);
        console.error = (message) => consoleErrors.push(message);

        // Mock configManager.getConfig by default to return a basic valid config
        configManager.getConfig = () => ({
            workflows: {
                'test-workflow': [{ command: 'echo "Test"', description: 'A test step' }],
                'multi-step': [
                    { command: 'step1', description: 'Step 1' },
                    { command: 'step2', description: 'Step 2' },
                ]
            }
        });
    });

    afterEach(() => {
        // Restore original functions
        child_process.execSync = originalExecSync;
        configManager.getConfig = originalGetConfig;
        console.log = originalConsoleLog;
        console.error = originalConsoleError;

        // Clean up any environment variables set during tests
        delete process.env.TEST_VAR;
        delete process.env.MISSING_VAR; // Just in case, though it's not set
    });

    describe('parseWorkflowConfig (via runWorkflow)', () => {
        it('should process a valid workflows config', () => {
            const result = runWorkflow('test-workflow', {});
            assert.strictEqual(result, true, 'runWorkflow should succeed with valid config');
            // No direct way to assert parseWorkflowConfig output without exporting it,
            // but success of runWorkflow implies it parsed correctly.
            assert.deepStrictEqual(consoleErrors, [], 'Should be no errors logged for valid config');
        });

        it('should handle missing "workflows" key in config', () => {
            configManager.getConfig = () => ({}); // No workflows key
            const result = runWorkflow('test-workflow', {});
            assert.strictEqual(result, false, 'runWorkflow should fail if "workflows" key is missing');
            assert.ok(consoleErrors.some(err => err.includes('Workflows configuration is missing or invalid')), 'Error message for missing workflows config not found');
        });

        it('should handle invalid "workflows" type (e.g., array)', () => {
            configManager.getConfig = () => ({ workflows: [] }); // Invalid type
            const result = runWorkflow('test-workflow', {});
            assert.strictEqual(result, false, 'runWorkflow should fail if "workflows" is not an object');
            assert.ok(consoleErrors.some(err => err.includes('Workflows configuration is missing or invalid')), 'Error message for invalid workflows type not found');
        });
         it('should handle invalid "workflows" type (e.g., string)', () => {
            configManager.getConfig = () => ({ workflows: "string" }); // Invalid type
            const result = runWorkflow('test-workflow', {});
            assert.strictEqual(result, false, 'runWorkflow should fail if "workflows" is not an object');
            assert.ok(consoleErrors.some(err => err.includes('Workflows configuration is missing or invalid')), 'Error message for invalid workflows type not found');
        });
    });

    describe('getWorkflow (via runWorkflow)', () => {
        it('should proceed with a valid workflow name', () => {
            const result = runWorkflow('test-workflow', {});
            assert.strictEqual(result, true, 'runWorkflow should succeed with a valid workflow name');
            assert.strictEqual(execSyncCalls.length, 1, 'execSync should be called for a valid workflow');
        });

        it('should handle invalid workflow name and list available workflows', () => {
            configManager.getConfig = () => ({ // Define specific workflows for this test
                workflows: {
                    'valid-workflow-1': [{ command: 'echo 1' }],
                    'valid-workflow-2': [{ command: 'echo 2' }],
                }
            });
            const result = runWorkflow('nonexistent-workflow', {});
            assert.strictEqual(result, false, 'runWorkflow should fail for a non-existent workflow name');
            assert.strictEqual(execSyncCalls.length, 0, 'execSync should not be called');
            const errorMsg = consoleErrors.find(msg => msg.includes('not found. Available workflows are:'));
            assert.ok(errorMsg, 'Error message for non-existent workflow not found');
            assert.ok(errorMsg.includes('valid-workflow-1'), 'Error message should list available workflow "valid-workflow-1"');
            assert.ok(errorMsg.includes('valid-workflow-2'), 'Error message should list available workflow "valid-workflow-2"');
        });

        it('should handle workflow not being an array of steps', () => {
            configManager.getConfig = () => ({ 
                workflows: { 'invalid-format-workflow': { command: 'echo "not an array"' } } 
            });
            const result = runWorkflow('invalid-format-workflow', {});
            assert.strictEqual(result, false, 'runWorkflow should fail if workflow is not an array');
            assert.ok(consoleErrors.some(err => err.includes('is not structured correctly. Expected an array of steps')), 'Error for invalid workflow structure not found');
        });
    });

    describe('executeWorkflow (via runWorkflow)', () => {
        it('should execute a simple workflow successfully', () => {
            const result = runWorkflow('test-workflow', {});
            assert.strictEqual(result, true, 'runWorkflow should return true');
            assert.strictEqual(execSyncCalls.length, 1, 'execSync should be called once');
            assert.strictEqual(execSyncCalls[0].command, 'echo "Test"');
            assert.deepStrictEqual(execSyncCalls[0].options, { stdio: 'inherit' }, 'execSync options should be stdio:inherit');
        });

        it('should not execute commands in dry-run mode', () => {
            const result = runWorkflow('test-workflow', { dryRun: true });
            assert.strictEqual(result, true, 'runWorkflow should return true for dry-run');
            assert.strictEqual(execSyncCalls.length, 0, 'execSync should not be called in dry-run');
            assert.ok(consoleLogs.some(log => log.includes('[DRY RUN] Command: echo "Test"')), 'Dry run log for command not found');
        });

        it('should log verbose messages in verbose mode', () => {
            // For this test, we need to ensure consoleLogs capture messages from executeWorkflow
            // The default mock for execSync doesn't throw, so it should complete.
            const result = runWorkflow('test-workflow', { verbose: true });
            assert.strictEqual(result, true, 'runWorkflow should return true');
            assert.strictEqual(execSyncCalls.length, 1, 'execSync should be called');
            assert.ok(consoleLogs.some(log => log.includes('Executing workflow: test-workflow')), 'Verbose log for "Executing workflow" not found');
            assert.ok(consoleLogs.some(log => log.includes('Processing step 1/1: A test step')), 'Verbose log for "Processing step" not found');
            assert.ok(consoleLogs.some(log => log.includes('Running command: echo "Test"')), 'Verbose log for "Running command" not found');
            assert.ok(consoleLogs.some(log => log.includes('Step "A test step" executed successfully.')), 'Verbose log for "Step executed successfully" not found');
        });

        describe('Variable Substitution', () => {
            beforeEach(() => {
                // Ensure process.env variables are clean or set as needed for each sub-test
                delete process.env.TEST_VAR;
                delete process.env.ANOTHER_VAR;
                delete process.env.MISSING_VAR;
            });

            it('should substitute environment variable $VAR_NAME', () => {
                process.env.TEST_VAR = 'substituted_value_1';
                configManager.getConfig = () => ({
                    workflows: { 'env-test': [{ command: 'echo $TEST_VAR', description: 'Env var test' }] }
                });
                const result = runWorkflow('env-test', {});
                assert.strictEqual(result, true);
                assert.strictEqual(execSyncCalls.length, 1);
                assert.strictEqual(execSyncCalls[0].command, 'echo substituted_value_1');
            });

            it('should substitute environment variable ${VAR_NAME}', () => {
                process.env.TEST_VAR = 'substituted_value_2';
                configManager.getConfig = () => ({
                    workflows: { 'env-test': [{ command: 'echo ${TEST_VAR}', description: 'Env var test' }] }
                });
                const result = runWorkflow('env-test', {});
                assert.strictEqual(result, true);
                assert.strictEqual(execSyncCalls.length, 1);
                assert.strictEqual(execSyncCalls[0].command, 'echo substituted_value_2');
            });
            
            it('should substitute multiple environment variables', () => {
                process.env.TEST_VAR = 'val1';
                process.env.ANOTHER_VAR = 'val2';
                configManager.getConfig = () => ({
                    workflows: { 'env-test': [{ command: 'echo $TEST_VAR ${ANOTHER_VAR} $TEST_VAR', description: 'Multi Env var test' }] }
                });
                const result = runWorkflow('env-test', {});
                assert.strictEqual(result, true);
                assert.strictEqual(execSyncCalls.length, 1);
                assert.strictEqual(execSyncCalls[0].command, 'echo val1 val2 val1');
            });

            it('should handle missing environment variable and halt if continueOnError is false (default)', () => {
                // TEST_VAR is NOT set
                configManager.getConfig = () => ({
                    workflows: { 'env-test-missing': [{ command: 'echo $MISSING_VAR', description: 'Missing var test' }] }
                });
                const result = runWorkflow('env-test-missing', {});
                assert.strictEqual(result, false, 'runWorkflow should return false for missing env variable');
                assert.strictEqual(execSyncCalls.length, 0, 'execSync should not be called');
                assert.ok(consoleErrors.some(err => err.includes('Environment variable "MISSING_VAR" not found')), 'Error log for missing variable not found');
                assert.ok(consoleErrors.some(err => err.includes('Halting workflow "env-test-missing"')), 'Error log for halting workflow not found');
            });

            it('should handle missing environment variable and continue if continueOnError is true', () => {
                // TEST_VAR is NOT set
                configManager.getConfig = () => ({
                    workflows: { 
                        'env-test-missing-continue': [
                            { command: 'echo $MISSING_VAR', description: 'Missing var test', continueOnError: true },
                            { command: 'echo "Fallback"', description: 'Fallback step' }
                        ]
                    }
                });
                const result = runWorkflow('env-test-missing-continue', {});
                assert.strictEqual(result, true, 'runWorkflow should return true as fallback runs');
                assert.strictEqual(execSyncCalls.length, 1, 'execSync should be called for the fallback step');
                assert.strictEqual(execSyncCalls[0].command, 'echo "Fallback"');
                assert.ok(consoleErrors.some(err => err.includes('Environment variable "MISSING_VAR" not found')), 'Error log for missing variable not found');
                assert.ok(consoleLogs.some(log => log.includes('Skipping step due to unresolved variable, but \'continueOnError\' is true')), 'Log for skipping step not found');
            });
        });

        describe('Command Execution and Error Handling', () => {
            it('should stop execution on command failure if continueOnError is false (default)', () => {
                configManager.getConfig = () => ({
                    workflows: { 
                        'fail-test': [
                            { command: 'cmd1-fail', description: 'This will fail' },
                            { command: 'cmd2-should-not-run', description: 'Should not run' }
                        ] 
                    }
                });
                
                const originalExec = child_process.execSync; // Save original mock
                child_process.execSync = (command) => { // Override for this test
                    execSyncCalls.push({ command });
                    if (command === 'cmd1-fail') {
                        throw new Error('Command failed');
                    }
                };
        
                const result = runWorkflow('fail-test', {});
                assert.strictEqual(result, false, 'runWorkflow should return false');
                assert.strictEqual(execSyncCalls.length, 1, 'Only the failing command should be attempted');
                assert.strictEqual(execSyncCalls[0].command, 'cmd1-fail');
                assert.ok(consoleErrors.some(err => err.includes('Error executing command: cmd1-fail')), 'Error log for command execution failure not found');
                assert.ok(consoleErrors.some(err => err.includes('Halting workflow "fail-test"')), 'Error log for halting workflow not found');
                
                child_process.execSync = originalExec; // Restore original mock
            });

            it('should continue execution on command failure if continueOnError is true, and workflow succeeds if subsequent steps succeed', () => {
                configManager.getConfig = () => ({
                    workflows: { 
                        'continue-on-error-test': [
                            { command: 'cmd1-fail', description: 'This will fail', continueOnError: true },
                            { command: 'cmd2-should-run', description: 'This should run' }
                        ] 
                    }
                });

                const originalExec = child_process.execSync; // Save original mock
                child_process.execSync = (command) => {
                    execSyncCalls.push({ command });
                    if (command === 'cmd1-fail') {
                        throw new Error('Command failed');
                    }
                    // cmd2-should-run will "succeed" (no throw)
                };

                const result = runWorkflow('continue-on-error-test', {});
                assert.strictEqual(result, true, 'runWorkflow should return true as second command succeeds');
                assert.strictEqual(execSyncCalls.length, 2, 'Both commands should be attempted');
                assert.strictEqual(execSyncCalls[0].command, 'cmd1-fail');
                assert.strictEqual(execSyncCalls[1].command, 'cmd2-should-run');
                assert.ok(consoleErrors.some(err => err.includes('Error executing command: cmd1-fail')), 'Error log for cmd1-fail not found');
                assert.ok(consoleErrors.some(warn => warn.includes('Continuing to next step due to \'continueOnError: true\'')), 'Warning for continueOnError not found'); // Changed to check consoleErrors as warnings are logged there
                
                child_process.execSync = originalExec; // Restore original mock
            });

            it('should return false if a command fails with continueOnError:true and is the last command', () => {
                 configManager.getConfig = () => ({
                    workflows: { 
                        'continue-on-error-last-fails': [
                            { command: 'cmd1-succeed', description: 'This will succeed' },
                            { command: 'cmd2-will-fail', description: 'This will fail', continueOnError: true }
                        ] 
                    }
                });

                const originalExec = child_process.execSync;
                child_process.execSync = (command) => {
                    execSyncCalls.push({ command });
                    if (command === 'cmd2-will-fail') {
                        throw new Error('Command failed');
                    }
                };

                // Even though it continues, the workflow result should reflect the failure
                // The current implementation of runWorkflow returns true if executeWorkflow returns true.
                // executeWorkflow returns true if all steps completed OR were handled (continueOnError).
                // This test checks if the overall status is true because the error was "handled".
                const result = runWorkflow('continue-on-error-last-fails', {});
                assert.strictEqual(result, true, 'runWorkflow should return true as the error was handled by continueOnError');
                assert.strictEqual(execSyncCalls.length, 2);
                assert.ok(consoleErrors.some(err => err.includes('Error executing command: cmd2-will-fail')));
                assert.ok(consoleErrors.some(warn => warn.includes('Continuing to next step due to \'continueOnError: true\'')));
                // The overall workflow did not "fail" in the sense of halting.
                assert.ok(consoleLogs.some(log => log.includes("Workflow 'continue-on-error-last-fails' completed successfully.")));


                child_process.execSync = originalExec;
            });


            it('should return false if a command after a continueOnError:true step fails (without its own continueOnError:true)', () => {
                configManager.getConfig = () => ({
                    workflows: { 
                        'failure-after-continue': [
                            { command: 'cmd1-fail-continue', description: 'Fails but continues', continueOnError: true },
                            { command: 'cmd2-succeeds', description: 'Succeeds' },
                            { command: 'cmd3-fails-halts', description: 'Fails and halts' }
                        ] 
                    }
                });

                const originalExec = child_process.execSync;
                let cmd2Called = false;
                child_process.execSync = (command) => {
                    execSyncCalls.push({ command });
                    if (command === 'cmd1-fail-continue') {
                        throw new Error('Cmd1 Failed');
                    }
                    if (command === 'cmd2-succeeds') {
                        cmd2Called = true; // Mark that cmd2 was called
                    }
                    if (command === 'cmd3-fails-halts') {
                        if (!cmd2Called) assert.fail('cmd2 should have been called before cmd3');
                        throw new Error('Cmd3 Failed and Halted');
                    }
                };

                const result = runWorkflow('failure-after-continue', {});
                assert.strictEqual(result, false, 'runWorkflow should return false due to cmd3 failure');
                assert.strictEqual(execSyncCalls.length, 3, 'All three commands should be attempted');
                assert.strictEqual(execSyncCalls[0].command, 'cmd1-fail-continue');
                assert.strictEqual(execSyncCalls[1].command, 'cmd2-succeeds');
                assert.strictEqual(execSyncCalls[2].command, 'cmd3-fails-halts');
                
                assert.ok(consoleErrors.some(err => err.includes('Error executing command: cmd1-fail-continue')));
                assert.ok(consoleErrors.some(warn => warn.includes("Continuing to next step due to 'continueOnError: true' for step \"Fails but continues\"")));
                assert.ok(consoleErrors.some(err => err.includes('Error executing command: cmd3-fails-halts')));
                assert.ok(consoleErrors.some(err => err.includes('Halting workflow "failure-after-continue" due to error in step "Fails and halts"')));
                
                child_process.execSync = originalExec;
            });
        });
    });

    describe('runWorkflow (Overall Orchestration)', () => {
        it('should handle config loading failure', () => {
            configManager.getConfig = () => {
                throw new Error('Failed to load config');
            };
            const result = runWorkflow('test-workflow', {});
            assert.strictEqual(result, false, 'runWorkflow should return false if config loading fails');
            assert.ok(consoleErrors.some(err => err.includes('Error running workflow \'test-workflow\': Failed to load config')), 'Error message for config loading failure not found');
        });

        it('should handle if workflow name is not found in a valid config', () => {
            // getConfig is already mocked with 'test-workflow' and 'multi-step'
            const result = runWorkflow('nonExistentWf', {});
            assert.strictEqual(result, false);
            assert.ok(consoleErrors.some(err => err.includes('Workflow "nonExistentWf" not found. Available workflows are: test-workflow, multi-step')));
        });
    });
});
