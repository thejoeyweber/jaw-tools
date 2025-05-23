/**
 * jaw-tools configuration
 */

module.exports = {
  // Directory configuration
  directories: {
    repomixProfiles: '.repomix-profiles',
    docs: '_docs',
    prompts: '_docs/prompts',
    compiledPrompts: '_docs/prompts-compiled',
    miniPrdTemplatePath: '_docs/project-docs/templates/mini-prd-template.md'
  },
  
  // Repomix configuration
  repomix: {
    defaultProfiles: {
      'full-codebase': {
        include: '**',
        ignore: '.git/**,node_modules/**,.next/**,out/**,build/**,coverage/**,.pnp/**,.pnp.js,.yarn/**,yarn.lock,package-lock.json,.env*,.vercel/**,.DS_Store,*.pem,*.tsbuildinfo,next-env.d.ts,npm-debug.log*,yarn-debug.log*,yarn-error.log*,.github/**,.husky/**,public/**',
        style: 'xml',
        compress: false
      },
      'docs-only': {
        include: '_docs/**',
        ignore: '_docs/prompts-compiled/**',
        style: 'xml',
        compress: false
      }
    },
    env: {
      // Environment variables to pass to repomix
      // NODE_OPTIONS: '--max-old-space-size=8192'
    }
  },
  
  // Prompt compiler configuration
  promptCompiler: {
    variables: {
      // Template variables to replace in prompts
      // PROJECT_NAME: 'My Awesome Project',
      // API_VERSION: 'v1.0'
    },
    useNumberedOutputs: true
  },
  
  // Workflow sequential commands
  workflow: {
    sequences: {
      'default': [
        ['repomix-profile', ['run', 'full-codebase']],
        ['repomix-profile', ['run', 'docs-only']],
        // Add compile-prompt commands for your templates
        // ['compile-prompt', ['_docs/prompts/example.md']]
      ],
      'another_sequence': [
        // Add another sequence of commands here
      ]
    },
    defaultSequence: 'default'
  },
  
  // Project scaffolding configuration
  projectScaffolding: {
    // Target directory in the user's project where 'scaffold_root/_docs' (or other top-level dirs in scaffold_root) contents will be copied.
    // For example, if scaffold_root contains an '_docs' folder, it will be copied into this target.
    // If scaffold_root contains 'file.txt', it will be copied to <project_root>/file.txt if scaffoldTargetRootDir is '.'
    scaffoldTargetRootDir: '.',
    
    userGuide: {
      // Source is always 'templates/README.md' from jaw-tools package.
      // Destination is relative to 'directories.docs'.
      destinationFileName: 'jaw-tools-guide.md'
    }
  },

  /**
   * Custom Variable Types
   * Extend jaw-tools with your own variable types.
   * Each type needs a name, a discover function, and a render function.
   * Filters and validate functions are optional.
   *
   * IMPORTANT: The functions (discover, render, validate, filters) in this
   * configuration file must be actual JavaScript functions, not strings.
   * `require()` will load them as such.
   */
  // variableTypes: [
  //   {
  //     name: 'myCustomEnv', // This is the type invoked by {{$myCustomEnv...}}
  //     async discover(keyName, config) {
  //       // keyName for {{$myCustomEnv}} will be 'myCustomEnv'.
  //       // It's up to this function to decide what 'myCustomEnv' means.
  //       // For this example, let's assume we want to fetch an environment variable
  //       // whose name IS keyName.
  //       const envVarToLookup = keyName;
  //       if (process.env.JAW_TOOLS_DEBUG || process.env.DEBUG) {
  //          console.log(`[myCustomEnv VariableType] Discover: Looking for ENV var named '${envVarToLookup}' (based on key '${keyName}')`);
  //       }
  //       const value = process.env[envVarToLookup];
  //       // discover should return an array of items. Each item's structure is up to the type.
  //       return value !== undefined ? [{ key: envVarToLookup, value: value }] : [];
  //     },
  //     render(item) {
  //       // item here would be { key: 'MY_ENV_VAR_NAME', value: 'its_value' }
  //       return String(item.value);
  //     },
  //     async validate(item, keyName, config) {
  //       // item: the specific discovered item (e.g., { key: 'MY_ENV_VAR_NAME', value: 'its_value' })
  //       // keyName: the original key from the template (e.g., 'myCustomEnv')
  //       if (item.value === 'FORBIDDEN_VALUE') {
  //         return `Value '${item.value}' for environment variable '${item.key}' (requested by ${keyName}) is not allowed.`;
  //       }
  //       return true; // true means valid
  //     },
  //     filters: {
  //       toLowerCase: (items) => { // items is an array of { key, value }
  //         return items.map(item => ({ ...item, value: String(item.value).toLowerCase() }));
  //       },
  //       toUpperCase: (items) => {
  //         return items.map(item => ({ ...item, value: String(item.value).toUpperCase() }));
  //       }
  //     }
  //   },
  //   {
  //     name: 'simpleList',
  //     async discover(keyName, config) { // keyName will be 'simpleList'
  //       // For {{$simpleList}}, the keyName is 'simpleList'.
  //       // This discover function could use keyName to fetch different lists,
  //       // or just return a fixed list as in this example.
  //       if (process.env.JAW_TOOLS_DEBUG || process.env.DEBUG) {
  //         console.log(`[simpleList VariableType] Discover: pattern/key was '${keyName}'. Returning a fixed list.`);
  //       }
  //       const list = ["ITEM1_val", "ITEM2_val", "ITEM3_val"];
  //       // Each item in the array should have a structure that render and validate expect.
  //       return list.map(p => ({ id: p.toLowerCase(), name: p.toUpperCase() }));
  //     },
  //     render(item) { // item here would be { id: 'item1_val', name: 'ITEM1_VAL' }
  //       return item.name; // Render the 'name' property of the item
  //     }
  //   }
  // ],
}; 