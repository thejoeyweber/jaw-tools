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
  promptAudit: {
    defaultPromptPath: '_docs/prompts/',
    requiredFields: ['docType', 'version', 'lastUpdated'],
    requireTestInstructions: true,
    codeGenKeywords: ['write code', 'generate function', 'scaffold', 'create a class', 'export code', 'implement method'],
    testPlanKeywords: ['include test cases', 'generate unit tests', 'write test plan', 'ensure tests are included', 'testing instructions'],
    fixableFields: ['docType', 'version', 'lastUpdated'], // For --fix mode later
    style: { // For --fix mode later
      placeholderFormat: '{{ variable }}' // or '{{$var}}'
    },
    // Optional: Define if and how variables should be declared (e.g., in front-matter)
    // variableDeclarations: {
    //   inFrontMatter: true, // example
    //   key: 'variables'     // example
    // }
    llmAudit: {
      enabled: false, // Disabled by default
      command: '', // e.g., 'my-llm-cli --prompt-file {PROMPT_FILE}' or 'python run_llm_audit.py {PROMPT_FILE}'
      // {PROMPT_FILE} will be replaced with a temporary file path containing the audit query + raw prompt.
      // The external command is expected to print the LLM's response to stdout.
      timeoutMs: 30000, // Timeout for the LLM command
      auditPromptTemplate: `Please audit the following LLM prompt for clarity and completeness:\n\n- Are all variables clearly defined and unambiguous?\n- Does it provide enough structure for reliable output?\n- If it asks the LLM to generate code, does it also require a test plan?\n\n---\n{RAW_PROMPT_CONTENT}`
    }
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