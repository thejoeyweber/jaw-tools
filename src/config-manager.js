/**
 * Configuration manager for jaw-tools
 */

const fs = require('fs');
const path = require('path');
const { registerVariableType, registry } = require('../dist/variables');

// Default configuration
const defaultConfig = {
  directories: {
    repomixProfiles: '.repomix-profiles',
    docs: '_docs',
    prompts: '_docs/prompts',
    compiledPrompts: '_docs/prompts-compiled',
    projectDocs: '_docs/project-docs'
  },
  repomix: {
    defaultProfiles: {
      'full-codebase': {
        include: '**',
        ignore: '.git/**,node_modules/**,.next/**',
        style: 'xml',
        compress: false
      }
    },
    env: {}
  },
  promptCompiler: {
    variables: {},
    useNumberedOutputs: true
  },
  workflow: {
    sequences: {
      'default': [
        ['repomix-profile', ['run', 'full-codebase']]
      ]
    },
    defaultSequence: 'default'
  },
  projectScaffolding: {
    scaffoldTargetRootDir: '.',
    userGuide: {
      destinationFileName: 'jaw-tools-guide.md'
    }
  },
  executionWorkflow: {
    baseDir: '_docs/project-docs/execution',
    centralMetaPromptDir: '_docs/prompts/meta',
    coreDocsForBundling: {
      sppg: '_docs/project-docs/SPPG.md',
      northStar: '_docs/project-docs/NORTH_STAR.md'
    },
    defaultRepomixProfile: 'full-codebase',
    tempSubDirs: {
      codeSnapshots: 'temp_code_snapshots',
      compiledPrompts: 'temp_compiled_prompts'
    }
  },
  testScaffold: {
    templateDir: 'templates/tests/', // Relative to project root
    fileNaming: '{feature}.{type}.test.ts', // Placeholders: {feature}, {type}
    defaultTypes: ['unit', 'integration', 'a11y', 'api'],
    todoMarker: '// TODO: write meaningful assertions for <FEATURE_NAME>' // <FEATURE_NAME> will be replaced
  }
};

/**
 * Determines the project root by searching for jaw-tools.config.js
 * starting from the current directory and traversing upwards
 * @returns {string} The absolute path to the project root
 */
function findProjectRoot() {
  let currentDir = process.cwd();
  const rootDir = path.parse(currentDir).root;
  
  // Search for jaw-tools.config.js up to the file system root
  while (currentDir !== rootDir) {
    const configPath = path.join(currentDir, 'jaw-tools.config.js');
    if (fs.existsSync(configPath)) {
      return currentDir;
    }
    
    // Move up one directory
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // We've reached the root directory
      break;
    }
    currentDir = parentDir;
  }
  
  // If no config file found, use current working directory as project root
  return process.cwd();
}

/**
 * Get configuration from project's jaw-tools.config.js file,
 * falling back to defaults for any missing properties.
 */
function getConfig() {
  const projectRoot = findProjectRoot();
  const configPath = path.join(projectRoot, 'jaw-tools.config.js');
  let projectConfig = {};
  
  if (fs.existsSync(configPath)) {
    try {
      // Clear the require cache to ensure we get the latest version
      delete require.cache[require.resolve(configPath)];
      projectConfig = require(configPath);
    } catch (error) {
      console.warn(`Warning: Could not load config from ${configPath}. Using defaults.`);
      console.warn(error.message);
    }
  } else {
    console.warn(`Warning: No config file found at ${configPath}. Using defaults.`);
  }
  
  // Deep merge default config with project config
  const mergedConfig = mergeConfigs(defaultConfig, projectConfig);
  
  // Store the determined project root in the config for access by all modules
  mergedConfig.__projectRoot = projectRoot;

  // Register custom variable types
  if (mergedConfig.variableTypes && Array.isArray(mergedConfig.variableTypes)) {
    mergedConfig.variableTypes.forEach(customType => {
      if (customType && customType.name && typeof customType.discover === 'function' && typeof customType.render === 'function') {
        try {
          registerVariableType(customType.name, {
            name: customType.name,
            discover: customType.discover, // Should be async function
            render: customType.render,
            filters: customType.filters || {}, // Ensure filters is an object
            validate: customType.validate, // Optional validate function
          });
          if (process.env.JAW_TOOLS_DEBUG || process.env.DEBUG) {
            console.log(`Custom variable type "${customType.name}" registered from config.`);
          }
        } catch (e) {
          console.warn(`Warning: Could not register custom variable type "${customType.name}" from config. Error: ${e.message}`);
        }
      } else {
        console.warn('Warning: Invalid custom variable type found in jaw-tools.config.js. Missing name, discover, or render function.');
      }
    });
  }
  // Built-in types (e.g., 'file') should have been registered when '../dist/variables' was required.
  
  return mergedConfig;
}

/**
 * Deep merge two objects
 */
function mergeConfigs(defaultObj, overrideObj) {
  const result = { ...defaultObj };
  
  if (!overrideObj) return result;
  
  Object.keys(overrideObj).forEach(key => {
    if (typeof overrideObj[key] === 'object' && !Array.isArray(overrideObj[key])) {
      result[key] = mergeConfigs(defaultObj[key] || {}, overrideObj[key]);
    } else {
      result[key] = overrideObj[key];
    }
  });
  
  return result;
}

module.exports = {
  getConfig,
  defaultConfig,
  findProjectRoot
}; 