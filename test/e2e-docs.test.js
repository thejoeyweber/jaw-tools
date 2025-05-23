const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running e2e-docs.test.js...');

const cliPath = path.resolve(__dirname, '../bin/jaw-tools-cli.js');
const fixturesDir = path.resolve(__dirname, 'fixtures');
const expectedDir = path.resolve(fixturesDir, 'expected');
const projectRootDir = path.resolve(__dirname, '..'); // Project root

// Helper function to run prompt-docs command
function runPromptDocs(options = {}) {
    let command = `node ${cliPath} prompt-docs`; // or 'pd'
    
    // The prompt-docs command currently doesn't take many options.
    // It relies on a jaw-tools.config.js in the CWD to find template dir.
    // For this test, we need to ensure it uses the test/fixtures/jaw-tools.config.js
    // and that the paths in that config are correctly pointing to test/fixtures/templates.

    const fixtureConfigPath = path.join(fixturesDir, 'jaw-tools.config.js');
    const tempConfigPathInRoot = path.join(projectRootDir, 'jaw-tools.config.js');
    const generatedDocsPath = path.join(projectRootDir, '_docs/prompts/variables.md'); // Default output path

    // console.log(`Executing: ${command} with fixture config`);
    try {
        // Temporarily place the fixture config in the root directory
        fs.copyFileSync(fixtureConfigPath, tempConfigPathInRoot);
        
        execSync(command, {
            env: { ...process.env, ...options.env },
            cwd: projectRootDir // Run from project root where jaw-tools.config.js is expected
        });

        if (fs.existsSync(generatedDocsPath)) {
            return fs.readFileSync(generatedDocsPath, 'utf-8');
        }
        return 'GENERATED_DOCS_NOT_FOUND';
    } catch (error) {
        console.error(`Error executing prompt-docs:`, error.stderr ? error.stderr.toString() : error.message);
        return `COMMAND_FAILED: ${error.message}`;
    } finally {
        // Clean up: remove the temporary config and the generated docs file
        if (fs.existsSync(tempConfigPathInRoot)) {
            fs.unlinkSync(tempConfigPathInRoot);
        }
        if (fs.existsSync(generatedDocsPath)) {
            // To prevent issues with readdir on _docs/prompts if it becomes empty
            const promptsDirForDocs = path.dirname(generatedDocsPath);
            fs.unlinkSync(generatedDocsPath);
            // Attempt to remove the directory if it's empty, otherwise ignore error
            try {
                // Check if promptsDirForDocs is empty. It might contain .gitkeep or other files.
                // For safety, only remove if it's truly empty or only contains .gitkeep
                const filesInPromptsDir = fs.readdirSync(promptsDirForDocs);
                if (filesInPromptsDir.length === 0 || (filesInPromptsDir.length === 1 && filesInPromptsDir[0] === '.gitkeep')) {
                     // fs.rmdirSync(promptsDirForDocs); // Potentially risky if other tests use this dir
                }
            } catch (e) { 
                // console.warn(`Could not remove directory ${promptsDirForDocs}: ${e.message}`);
            }
        }
    }
}

function testPromptDocsGeneration() {
    console.log('  Testing prompt-docs generation...');
    const actualOutput = runPromptDocs();
    const expectedOutput = fs.readFileSync(path.join(expectedDir, 'prompt_docs_output.md'), 'utf-8');
    
    // Normalize line endings (CRLF to LF) and trim whitespace for comparison
    const normalize = (str) => str.replace(/\r\n/g, '\n').trim();

    // Debugging output if the test fails
    if (normalize(actualOutput) !== normalize(expectedOutput)) {
        console.error("------- ACTUAL OUTPUT (Prompt Docs) -------");
        console.error(actualOutput);
        console.error("------- EXPECTED OUTPUT (Prompt Docs) -------");
        console.error(expectedOutput);
        console.error("-------------------------------------------");
    }
    
    assert.strictEqual(normalize(actualOutput), normalize(expectedOutput), 'Test Case: prompt-docs output mismatch');
    console.log('  prompt-docs generation passed.');
}

// Main test execution
async function runAllE2EDocsTests() {
    try {
        testPromptDocsGeneration();
        console.log('All e2e-docs tests passed!');
    } catch (error) {
        console.error('E2E Docs Test Failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    runAllE2EDocsTests();
}

module.exports = { runAllE2EDocsTests };
