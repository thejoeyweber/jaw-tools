// test/fixtures/jaw-tools.config.js
// A simplified config for E2E testing custom variable types.
module.exports = {
  variableTypes: [
    {
      name: 'myConfigVar',
      async discover(key, config) { // key is 'myConfigVar'
        // For {{$myConfigVar:someArg}}, 'someArg' isn't directly passed to discover's 'key'.
        // It would be part of varDetails.filters in resolveSingleVariable if parsed.
        // For this E2E, let's assume key 'myConfigVar' means to return a specific item.
        // This also simulates a type that might not use the 'key' for discovery but a fixed logic.
        return [{ id: 'configItem', value: 'Value from E2E config' }];
      },
      render(item) { return item.value; }
    },
    { // A type to test filters, using file content
      name: 'fileData',
      async discover(pattern, config) { // pattern is '/files/data.txt'
        const fs = require('fs'); // Local require for fs inside the config function
        const path = require('path'); // Local require for path
        const projectRoot = config.__projectRoot || '.'; // __projectRoot should be set by configManager
        const filePath = path.isAbsolute(pattern) ? pattern : path.join(projectRoot, pattern);
        
        // console.log(`[E2E fileData discover] projectRoot: ${projectRoot}, pattern: ${pattern}, resolved filePath: ${filePath}`);

        if (fs.existsSync(filePath)) {
          // console.log(`[E2E fileData discover] File exists: ${filePath}`);
          return [{ path: pattern, content: fs.readFileSync(filePath, 'utf-8') }];
        }
        // console.log(`[E2E fileData discover] File does NOT exist: ${filePath}`);
        return [];
      },
      render(item) { return item.content; },
      filters: {
        toUpperCase: (items) => {
          return items.map(item => ({...item, content: String(item.content).toUpperCase()}));
        }
      },
      async validate(item, originalKeyOrPattern, config) {
        // Example validation: if the original key was '/files/must_exist.txt', it must be that.
        // This is a bit contrived for this example, but demonstrates validation.
        if (originalKeyOrPattern === '/files/must_exist.txt' && item.path !== '/files/must_exist.txt') {
          return `Validation failed: Expected path to be /files/must_exist.txt but got ${item.path}`;
        }
        // Check for a hypothetical invalid extension based on originalKeyOrPattern
        if (originalKeyOrPattern && originalKeyOrPattern.endsWith('.json') && !item.path.endsWith('.json')) {
            return `Expected a .json file based on pattern ${originalKeyOrPattern}, but got ${item.path}`;
        }
        return true;
      }
    }
  ],
  promptCompiler: {
    interactive: false, // Ensure CI mode for E2E tests unless overridden by CLI args
    // variables: { // Global static variables if needed for some tests
    //   GLOBAL_STATIC_VAR: "Global Static Value"
    // }
  },
  directories: { // Point to fixture directories for E2E tests
    prompts: 'test/fixtures/templates', // Relative to project root where CLI is run
    // compiledPrompts: 'test/fixtures/output', // If we want to check output files
    // docs: 'test/fixtures/docs' // For prompt-docs E2E
  }
};
