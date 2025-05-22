/**
 * Configuration manager for jaw-tools
 */

const fs = require('fs');
const path = require('path');

// Default configuration
const defaultConfig = {
  directories: {
    repomixProfiles: '.repomix-profiles',
    docs: '_docs',
    prompts: '_docs/prompts',
    compiledPrompts: '_docs/prompts-compiled'
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
  }
};

/**
 * Get configuration from project's jaw-tools.config.js file,
 * falling back to defaults for any missing properties.
 */
function getConfig() {
  const configPath = path.join(process.cwd(), 'jaw-tools.config.js');
  let projectConfig = {};
  
  if (fs.existsSync(configPath)) {
    try {
      projectConfig = require(configPath);
    } catch (error) {
      console.warn(`Warning: Could not load config from ${configPath}. Using defaults.`);
      console.warn(error.message);
    }
  } else {
    console.warn(`Warning: No config file found at ${configPath}. Using defaults.`);
  }
  
  // Deep merge default config with project config
  return mergeConfigs(defaultConfig, projectConfig);
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
  defaultConfig
}; 