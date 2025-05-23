// test/fixtures/test-scaffold-e2e/jaw-tools.config.js
module.exports = {
  testScaffold: {
    templateDir: 'templates/tests/', // Relative to this config file's location for E2E
    defaultTypes: ['unit', 'api'], // Override default types for E2E test
    todoMarker: '// E2E TODO for <FEATURE_NAME>',
    // fileNaming: '{feature}-{type}.test.ts' // Example of overriding naming (using default for now)
  },
  // To prevent other parts of jaw-tools from interfering if CLI is run from here:
  directories: {
    docs: '_docs_e2e_test', // Avoid conflict with main _docs
    prompts: '_docs_e2e_test/prompts',
    compiledPrompts: '_docs_e2e_test/prompts-compiled',
  },
  promptCompiler: {
      interactive: false, // Good for E2E
  }
};
