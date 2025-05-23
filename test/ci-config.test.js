// test/ci-config.test.js
const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const yaml = require('js-yaml');
// DEFER loading generateCIConfig until mocks are set up
// const { generateCIConfig } = require('../lib/ci-config'); 
const configManager = require('../src/config-manager');

// --- Mocking Setup ---
let generateCIConfig; // Will be loaded in setupMocks
let mockFsStore = {}; // In-memory store for writeFile
let writtenFiles = {};
let ensuredDirs = [];

// Store original functions
const originalReadFile = fs.readFile;
const originalWriteFile = fs.writeFile;
const originalEnsureDir = fs.ensureDir;
const originalPathExists = fs.pathExists;

// Store original functions from configManager
const originalGetConfig = configManager.getConfig;
const originalFindProjectRoot = configManager.findProjectRoot; 

const MOCK_PROJECT_ROOT = path.resolve(__dirname, 'mock-project');

function setupMocks(userConfig = {}) {
  // Reset states
  writtenFiles = {};
  ensuredDirs = [];
  mockFsStore = {}; // Clear for each test

  fs.readFile = async (filePath, encoding) => {
    const normalizedPath = path.normalize(filePath);
    // If the file was "written" by our mock fs.writeFile, return its content
    if (writtenFiles[normalizedPath]) {
      return writtenFiles[normalizedPath];
    }
    if (mockFsStore[normalizedPath]) { // Check mockFsStore for compatibility with example
        return mockFsStore[normalizedPath];
    }

    const fileName = path.basename(filePath);
    if (filePath.includes('lint.stage.yml')) {
      return '<JOB_NAME>:\n  name: Lint Stage\n  runs-on: ubuntu-latest\n  steps:\n    - run: <COMMAND>';
    }
    if (filePath.includes('test.stage.yml')) {
      return '<JOB_NAME>:\n  name: Test Stage\n  runs-on: ubuntu-latest\n  steps:\n    - run: <COMMAND>';
    }
    if (filePath.includes('build.stage.yml')) { // For testing with more stages
        return '<JOB_NAME>:\n  name: Build Stage\n  runs-on: ubuntu-latest\n  steps:\n    - run: <COMMAND>';
    }
    // Mock for jaw-tools.config.js if needed for a specific test, though getConfig is mocked directly
    if (fileName === 'jaw-tools.config.js' && userConfig && Object.keys(userConfig).length > 0) {
        return `module.exports = ${JSON.stringify(userConfig)};`;
    }
    console.warn(`Attempting to read unmocked file in test: ${filePath}`);
    // Fallback to original if absolutely necessary, but prefer explicit mocks
    // return originalReadFile(filePath, encoding);
    throw new Error(`Mock fs.readFile: File not found or not mocked ${filePath}`);
  };

  fs.writeFile = async (filePath, content) => {
    const normalizedPath = path.normalize(filePath);
    writtenFiles[normalizedPath] = content;
    mockFsStore[normalizedPath] = content; // For compatibility with example test
  };

  fs.ensureDir = async (dirPath) => {
    const normalizedPath = path.normalize(dirPath);
    ensuredDirs.push(normalizedPath);
  };

  fs.pathExists = async (filePath) => {
    const normalizedFilePath = path.normalize(filePath);
    if (normalizedFilePath.includes('.stage.yml')) {
      const stageNameFromPath = path.basename(normalizedFilePath).replace('.stage.yml', '');
      const currentCIConfig = (userConfig && userConfig.ciConfig) ? userConfig.ciConfig : getDefaultCIConfig();
      const currentStages = currentCIConfig.stages || [];
      return currentStages.some(s => s.name === stageNameFromPath);
    }
    return false; 
  };

  // Mock configManager functions BEFORE requiring the module that uses them
  configManager.findProjectRoot = () => MOCK_PROJECT_ROOT;

  configManager.getConfig = () => {
    const defaultConfigPart = getDefaultCIConfig(); // This is just the ciConfig part
    let mergedCiConfig = { ...defaultConfigPart }; // Clone default CI config

    if (userConfig && userConfig.ciConfig) { // If user-specific CI config is provided
      mergedCiConfig.provider = userConfig.ciConfig.provider !== undefined ? userConfig.ciConfig.provider : defaultConfigPart.provider;
      mergedCiConfig.out = userConfig.ciConfig.out !== undefined ? userConfig.ciConfig.out : defaultConfigPart.out;
      
      // If userConfig.ciConfig.stages is explicitly provided, use it. Otherwise, keep default.
      mergedCiConfig.stages = userConfig.ciConfig.stages !== undefined ? userConfig.ciConfig.stages : defaultConfigPart.stages;
      
      // Merge environment variables: user's env vars take precedence over default ones.
      mergedCiConfig.env = { ...defaultConfigPart.env, ...(userConfig.ciConfig.env || {}) };
    }
    
    const finalConfig = {
      __projectRoot: MOCK_PROJECT_ROOT,
      directories: { templates: 'templates' }, 
      ciConfig: mergedCiConfig, 
    };
    // console.log('Mocked getConfig. Final ciConfig:', JSON.stringify(finalConfig.ciConfig, null, 2));
    return finalConfig;
  };
  
  // Clear require cache for lib/ci-config.js to ensure it picks up the new mocks
  delete require.cache[require.resolve('../lib/ci-config')];
  // NOW require the module that uses the mocked configManager
  generateCIConfig = require('../lib/ci-config').generateCIConfig;
}

function getDefaultCIConfig() {
  return {
    provider: 'github',
    out: '.github/workflows/ci.yml',
    stages: [
      { name: 'lint', command: 'npm run lint-default' },
      { name: 'test', command: 'npm run test-default' },
    ],
    env: { CI: 'true', NODE_ENV: 'test-default' },
  };
}

function teardownMocks() {
  fs.readFile = originalReadFile;
  fs.writeFile = originalWriteFile;
  fs.ensureDir = originalEnsureDir;
  fs.pathExists = originalPathExists;
  
  // Restore original configManager functions
  configManager.getConfig = originalGetConfig;
  configManager.findProjectRoot = originalFindProjectRoot; 
  
  // Clear the loaded module from cache so it can be re-loaded with fresh mocks next time
  delete require.cache[require.resolve('../lib/ci-config')];
  mockFsStore = {};
  writtenFiles = {};
  ensuredDirs = [];
}

// --- Test Cases ---

async function testDryRun() {
  console.log('Running: testDryRun');
  setupMocks();
  const result = await generateCIConfig({ dryRun: true });
  assert.ok(result.success, 'Dry run should succeed');
  assert.ok(result.content, 'Dry run should produce content');
  assert.strictEqual(Object.keys(writtenFiles).length, 0, 'writeFile should not be called in dry run');
  const parsedYaml = yaml.load(result.content);
  assert.strictEqual(parsedYaml.name, 'CI', 'YAML should have correct name');
  assert.ok(parsedYaml.jobs.lint, 'YAML should contain lint job');
  assert.ok(parsedYaml.jobs.test, 'YAML should contain test job');
  console.log('testDryRun passed');
  teardownMocks();
}

async function testFileOutputDefaultConfig() {
  console.log('Running: testFileOutputDefaultConfig');
  setupMocks();
  const expectedOutputPath = path.normalize(path.join(MOCK_PROJECT_ROOT, '.github', 'workflows', 'ci.yml'));
  const result = await generateCIConfig({ dryRun: false });

  assert.ok(result.success, 'File output should succeed');
  assert.strictEqual(path.normalize(result.path), expectedOutputPath, 'Output path should be correct');
  assert.ok(writtenFiles[expectedOutputPath], `Output file ${expectedOutputPath} should be written. Found: ${Object.keys(writtenFiles)}`);
  assert.ok(ensuredDirs.includes(path.dirname(expectedOutputPath)), 'Output directory should be ensured');
  
  const writtenContent = writtenFiles[expectedOutputPath];
  assert.ok(writtenContent.includes('npm run lint-default'), 'Default lint command should be in output');
  assert.ok(writtenContent.includes('npm run test-default'), 'Default test command should be in output');
  
  const parsedYaml = yaml.load(writtenContent);
  assert.strictEqual(parsedYaml.env.NODE_ENV, 'test-default', 'Default env should be in output');
  assert.deepStrictEqual(Object.keys(parsedYaml.jobs), ['lint', 'test'], 'Jobs should be in default order');
  console.log('testFileOutputDefaultConfig passed');
  teardownMocks();
}

async function testUserConfigMerging() {
  console.log('Running: testUserConfigMerging');
  const userCiConfig = {
    provider: 'gitlab', // Override provider
    out: 'custom/gitlab-ci.yml', // Override output path relative to MOCK_PROJECT_ROOT
    stages: [ // Override stages
      { name: 'build', command: 'npm run build-custom' },
      { name: 'test', command: 'npm run test-custom' },
    ],
    env: { CUSTOM_VAR: 'true', NODE_ENV: 'test-custom' }, // Merge env
  };
  setupMocks({ ciConfig: userCiConfig });

  // Mock pathExists for the 'build' template specifically for this test
  const originalPathExistsFn = fs.pathExists;
  fs.pathExists = async (filePath) => {
    const normalizedFilePath = path.normalize(filePath);
    if (normalizedFilePath.endsWith('build.stage.yml')) return true;
    if (normalizedFilePath.endsWith('test.stage.yml')) return true;
    return originalPathExistsFn(normalizedFilePath);
  };

  const expectedOutputPath = path.normalize(path.join(MOCK_PROJECT_ROOT, 'custom', 'gitlab-ci.yml'));
  const result = await generateCIConfig({ dryRun: false });

  assert.ok(result.success, 'File output with user config should succeed');
  assert.strictEqual(path.normalize(result.path), expectedOutputPath, 'User config output path should be used');
  assert.ok(writtenFiles[expectedOutputPath], `Output file ${expectedOutputPath} should be written. Found: ${Object.keys(writtenFiles)}`);

  const writtenContent = writtenFiles[expectedOutputPath];
  assert.ok(writtenContent.includes('npm run build-custom'), 'User config build command should be in output');
  assert.ok(writtenContent.includes('npm run test-custom'), 'User config test command should be in output');
  assert.ok(!writtenContent.includes('npm run lint-default'), 'Default lint command should NOT be in output if stages are overridden');

  const parsedYaml = yaml.load(writtenContent);
  assert.strictEqual(parsedYaml.env.NODE_ENV, 'test-custom', 'User config env should override default');
  assert.strictEqual(parsedYaml.env.CI, 'true', 'Default CI env var should persist if not overridden');
  assert.strictEqual(parsedYaml.env.CUSTOM_VAR, 'true', 'User config custom env var should be present');
  assert.deepStrictEqual(Object.keys(parsedYaml.jobs), ['build', 'test'], 'Jobs should be in user-defined order');
  
  fs.pathExists = originalPathExistsFn; // Restore original mock
  console.log('testUserConfigMerging passed');
  teardownMocks();
}

async function testTemplateSubstitution() {
  console.log('Running: testTemplateSubstitution');
  setupMocks(); // Uses default config
  const result = await generateCIConfig({ dryRun: true });
  assert.ok(result.success, 'Dry run for template substitution test should succeed');
  
  const parsedYaml = yaml.load(result.content);
  assert.strictEqual(parsedYaml.jobs.lint.name, 'Lint Stage', 'Lint job name should be from template');
  assert.strictEqual(parsedYaml.jobs.lint.steps[0].run, 'npm run lint-default', 'Lint command should be substituted');
  assert.strictEqual(parsedYaml.jobs.test.name, 'Test Stage', 'Test job name should be from template');
  assert.strictEqual(parsedYaml.jobs.test.steps[0].run, 'npm run test-default', 'Test command should be substituted');
  console.log('testTemplateSubstitution passed');
  teardownMocks();
}

async function testOutputPathOptions() {
  console.log('Running: testOutputPathOptions');
  setupMocks();
  
  // Test with relative --out option
  const relativeOut = 'my-ci/workflow.yml'; // Relative to MOCK_PROJECT_ROOT
  const expectedRelativePath = path.normalize(path.join(MOCK_PROJECT_ROOT, relativeOut));
  let result = await generateCIConfig({ out: relativeOut, dryRun: false }); // generateCIConfig will join this with projectRoot
  assert.ok(result.success, 'File output with relative --out should succeed');
  assert.strictEqual(path.normalize(result.path), expectedRelativePath, 'Relative --out path should be correct');
  assert.ok(writtenFiles[expectedRelativePath], `Output file ${expectedRelativePath} should be written. Found: ${Object.keys(writtenFiles)}`);
  
  // Clear writtenFiles for next check
  writtenFiles = {}; // Reset for the absolute path test

  // Test with absolute --out option
  // IMPORTANT: If MOCK_PROJECT_ROOT is /app/test/mock-project, an "absolute" path for the test
  // should still be within a controlled space, or fs.ensureDir might try to create system dirs.
  // For this test, let's make it absolute *within* the MOCK_PROJECT_ROOT structure to be safe.
  const absoluteOut = path.normalize(path.join(MOCK_PROJECT_ROOT, 'abs-output', 'ci.yml'));
  result = await generateCIConfig({ out: absoluteOut, dryRun: false });
  assert.ok(result.success, 'File output with absolute --out should succeed');
  assert.strictEqual(path.normalize(result.path), absoluteOut, 'Absolute --out path should be correct');
  assert.ok(writtenFiles[absoluteOut], `Output file ${absoluteOut} should be written. Found: ${Object.keys(writtenFiles)}`);
  
  console.log('testOutputPathOptions passed');
  teardownMocks();
}

async function testMissingTemplateError() {
  console.log('Running: testMissingTemplateError');
  const userCiConfig = {
    stages: [{ name: 'nonexistentstage', command: 'echo "hello"' }],
  };
  setupMocks({ ciConfig: userCiConfig });

  // Ensure pathExists returns false for this specific template
  const originalPathExistsFn = fs.pathExists;
  fs.pathExists = async (filePath) => {
      if (path.basename(filePath) === 'nonexistentstage.stage.yml') return false;
      return originalPathExistsFn(filePath);
  };

  // Capture console.error output
  const originalConsoleError = console.error;
  let consoleErrorOutput = [];
  console.error = (message) => consoleErrorOutput.push(message);

  const result = await generateCIConfig({ dryRun: false });
  
  // Restore console.error
  console.error = originalConsoleError;
  fs.pathExists = originalPathExistsFn; // Restore original mock

  // Check that it still "succeeds" at generating a file (even if empty or partial)
  // but logs an error for the missing template. The current generateCIConfig
  // logs an error and continues, resulting in an empty `jobs` object if all fail.
  assert.ok(result.success, 'generateCIConfig should still report success overall');
  assert.ok(result.path, 'A path should be returned even if a template is missing');
  const expectedDefaultOutputPath = path.normalize(path.join(MOCK_PROJECT_ROOT, getDefaultCIConfig().out));
  
  const writtenContent = writtenFiles[expectedDefaultOutputPath];
  assert.ok(writtenContent, `File content for ${expectedDefaultOutputPath} should exist`);
  const parsedYaml = yaml.load(writtenContent);
  assert.deepStrictEqual(parsedYaml.jobs, {}, 'Jobs object should be empty if template was missing');

  const errorLog = consoleErrorOutput.join('\n');
  // Path in error message is now also based on MOCK_PROJECT_ROOT due to findProjectRoot mock
  const expectedTemplatePath = path.join(MOCK_PROJECT_ROOT, 'templates', 'ci', 'nonexistentstage.stage.yml');
  assert.ok(errorLog.includes(`Error: Template file not found: ${expectedTemplatePath}`), 'Should log error for missing template');
  
  console.log('testMissingTemplateError passed');
  teardownMocks();
}


async function runAllTests() {
  const tests = [
    testDryRun,
    testFileOutputDefaultConfig,
    testUserConfigMerging,
    testTemplateSubstitution,
    testOutputPathOptions,
    testMissingTemplateError,
  ];

  let failures = 0;
  for (const test of tests) {
    try {
      await test();
    } catch (error) {
      failures++;
      console.error(`❌ Test Failed: ${test.name}`);
      console.error(error);
      // Ensure mocks are reset even if a test fails mid-way
      teardownMocks(); 
    }
  }

  if (failures === 0) {
    console.log('\n✅ All ci-config unit tests passed!');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failures} unit test(s) failed.`);
    process.exit(1);
  }
}

runAllTests();
