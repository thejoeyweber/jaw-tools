#!/usr/bin/env node

/**
 * Prompt Compiler
 * 
 * This script compiles a prompt template, replacing {{file-path}} placeholders
 * with the actual content of those files.
 */

const fs = require('fs');
const path = require('path');

// Import variable registry
let registry = {};
try {
  const variablesModule = require('../dist/variables');
  registry = variablesModule.registry || {};
} catch (err) {
  console.warn('Could not load ../dist/variables.js. Dynamic variables might not work.');
  console.warn('Make sure to run `npm run build` if you have TypeScript files in `src`.');
  console.warn(err.message);
}


// Helper to pad numbers
function pad(num, size) {
  let s = num + '';
  while (s.length < size) s = '0' + s;
  return s;
}

/**
 * Compile a prompt template, replacing file placeholders with content
 */
async function resolveSingleVariable(varDetails, config, registry) {
  const { type, key, filters, default: defaultValue, raw: rawPlaceholder } = varDetails;
  const variableType = registry[type];

  if (!variableType) {
    // Try to see if 'key' is an environment variable if type is not in registry
    // This is a fallback for undefined types, might point to an env var.
    if (process.env[key]) {
      return process.env[key];
    }
    return `<!-- Error: Variable type "${type}" not registered for ${rawPlaceholder} -->`;
  }

  try {
    let discoveredItems = await variableType.discover(key, config);

    // Apply filters if any
    if (filters && filters.length > 0 && variableType.filters) {
      for (const filter of filters) {
        if (variableType.filters[filter.name]) {
          discoveredItems = variableType.filters[filter.name](discoveredItems, filter.arg);
        } else {
          console.warn(`Warning: Filter "${filter.name}" not found for type "${type}"`);
        }
      }
    }
    
    let chosenItem = null;
    if (discoveredItems && discoveredItems.length > 0) {
      // For now, if multiple items are discovered, take the first one.
      // Future subtasks will introduce interactive choice or specific selection logic.
      chosenItem = discoveredItems[0]; 
    }

    if (chosenItem) {
      if (variableType.validate) {
        const validationResult = await variableType.validate(chosenItem, key, config); // Pass original key
        if (typeof validationResult === 'string') {
          return `<!-- Validation Error for ${rawPlaceholder} (key: ${key}): ${validationResult} -->`;
        }
        if (validationResult === false) {
          return `<!-- Validation Failed for ${rawPlaceholder} (key: ${key}) -->`;
        }
      }
      // If validation passes (true or no validate function), render the item
      let renderedValue = variableType.render(chosenItem);

      // If the type is 'file', the rendered value is the path. Read the file content.
      if (type === 'file') {
        try {
          const projectRoot = config?.__projectRoot || '.';
          const absolutePath = path.isAbsolute(renderedValue) ? renderedValue : path.join(projectRoot, renderedValue);
          
          // File size warnings (copied from old logic, adjust as needed)
          const stats = fs.statSync(absolutePath);
          const fileSizeInKB = stats.size / 1024;
          if (fileSizeInKB > 100) { // Example threshold: 100KB
            console.warn(`⚠️ WARNING: Including large file (${Math.round(fileSizeInKB)}KB): ${renderedValue}`);
          }
          if (fileSizeInKB > 500) { // Example threshold: 500KB
             return `<!-- WARNING: File ${renderedValue} is extremely large (${Math.round(fileSizeInKB)}KB) and has been truncated -->\n\n` +
                    fs.readFileSync(absolutePath, 'utf8').substring(0, 50000) + // Truncate to 50k chars
                    `\n\n// ... file truncated (${Math.round(fileSizeInKB)}KB total) ...`;
          }
          return fs.readFileSync(absolutePath, 'utf8');
        } catch (err) {
          return `<!-- Error reading file ${renderedValue} (for ${rawPlaceholder}): ${err.message} -->`;
        }
      }
      return renderedValue; // For non-file types, or if file.render itself returned content

    } else if (defaultValue !== null && defaultValue !== undefined) {
      return defaultValue;
    } else if (process.env[key]) { // Check environment variable as a fallback if no items and no default
        return process.env[key];
    } else {
      return `<!-- Error: Could not resolve ${rawPlaceholder} (key: ${key}). No items discovered, no default value, and not found as ENV variable. -->`;
    }
  } catch (error) {
    console.error(`Error processing variable ${rawPlaceholder} (key: ${key}):`, error);
    return `<!-- Error processing ${rawPlaceholder}: ${error.message} -->`;
  }
}


// Main compile function is now async
async function compile(promptFilePath, options = {}, configOverride = null) {
  // Try to load configuration if not provided
  let config;
  if (configOverride) {
    config = configOverride;
  } else {
    try {
      const configManager = require('../src/config-manager');
      config = configManager.getConfig();
    } catch (err) {
      config = {
        directories: {
          prompts: '_docs/prompts',
          compiledPrompts: '_docs/prompts-compiled'
        },
        promptCompiler: {
          variables: {},
          useNumberedOutputs: true
        }
      };
    }
  }
  
  // Resolve the template path
  const templatePath = path.resolve(promptFilePath);
  
  // Read template
  let template;
  try {
    template = fs.readFileSync(templatePath, 'utf8');
  } catch (err) {
    console.error(`Error reading template: ${templatePath}`);
    console.error(err.message);
    return { success: false, error: err.message };
  }

  // Replace config variables first
  if (config.promptCompiler.variables) {
    Object.entries(config.promptCompiler.variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      template = template.replace(regex, value);
    });
  }

  // Find all {{...}} placeholders
  const newPlaceholderRegex = /{{(?:(\/(?:[^}\s]|\\})+)|(?:\$([a-zA-Z_][a-zA-Z0-9_]*)([:a-zA-Z_][a-zA-Z0-9_]*(?:\((?:[^()'"/\\]|\\.|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")*\))?)*)(?:\|default=([^}\s]+))?)}}/g;
  let match;
  const replacements = {}; // Cache for resolved values
  const pathsToProcess = new Set(); // Stores raw placeholders
  const parsedVariables = {}; // Stores detailed parsed info for each raw placeholder

  // First pass: collect and parse all placeholders
  while ((match = newPlaceholderRegex.exec(template)) !== null) {
    let variableDetails;
    const raw = match[0];
    const filePath = match[1];
    const varTypeOrKey = match[2];
    const filtersString = match[3];
    const defaultValue = match[4];

    if (filePath) {
      variableDetails = {
        raw,
        type: 'file',
        key: filePath.replace(/\\}/g, '}'), // Unescape escaped curly braces in path
        filters: [],
        default: defaultValue || null
      };
    } else if (varTypeOrKey) {
      const parsedFilters = [];
      if (filtersString) {
        const filterRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)(?:\(([^)]*)\))?/g;
        let filterMatch;
        while ((filterMatch = filterRegex.exec(filtersString)) !== null) {
          parsedFilters.push({
            name: filterMatch[1],
            arg: filterMatch[2] || null
          });
        }
      }
      variableDetails = {
        raw,
        type: varTypeOrKey,
        key: varTypeOrKey, // Default key, might be refined by type definition
        filters: parsedFilters,
        default: defaultValue || null
      };
    } else {
      console.warn(`Could not parse placeholder: ${raw}`);
      replacements[raw] = `<!-- Error parsing placeholder: ${raw} -->`;
      pathsToProcess.add(raw); // Add to process so it gets replaced with the error
      parsedVariables[raw] = { error: true, raw }; // Mark as errored
      continue;
    }
    
    pathsToProcess.add(raw);
    parsedVariables[raw] = variableDetails;
  }
  newPlaceholderRegex.lastIndex = 0; // Reset regex index for the replacement pass

  // Ensure config has __projectRoot, default to process.cwd() if not set by manager
  if (!config.__projectRoot) {
    config.__projectRoot = process.cwd(); 
    // console.warn("Config did not have __projectRoot, defaulting to process.cwd(). This might be an issue if running outside project context.");
  }

  // Process collected placeholders
  const resolutionPromises = [];
  for (const rawPlaceholder of pathsToProcess) {
    const varDetails = parsedVariables[rawPlaceholder];
    if (varDetails && !varDetails.error) {
      resolutionPromises.push(
        resolveSingleVariable(varDetails, config, registry).then(resolvedValue => {
          replacements[rawPlaceholder] = resolvedValue;
        })
      );
    } else if (varDetails && varDetails.error) {
      // Error already placed in replacements during parsing phase for syntax errors
      // replacements[rawPlaceholder] = `<!-- Error parsing placeholder: ${rawPlaceholder} -->`; // This is already done above
    } else {
      // Fallback for unparsed/unhandled placeholders (should be rare)
      replacements[rawPlaceholder] = `<!-- Error: Could not find parsed details for ${rawPlaceholder} -->`;
    }
  }

  await Promise.all(resolutionPromises);

  // Replace all placeholders
  let compiled = template.replace(newPlaceholderRegex, (rawPlaceholder) => {
    return replacements[rawPlaceholder] !== undefined ? replacements[rawPlaceholder] : rawPlaceholder;
  });

  // Prepare output directory
  const outDirRelative = config.directories.compiledPrompts;
  const outDir = path.resolve(outDirRelative);

  if (!fs.existsSync(outDir)) {
    try {
      fs.mkdirSync(outDir, { recursive: true });
    } catch (err) {
      console.error(`Error creating output directory: ${outDir}`);
      console.error(err.message);
      return { success: false, error: err.message };
    }
  }

  // Determine filename for output
  const promptName = path.basename(templatePath, path.extname(templatePath));
  let outFile;

  if (config.promptCompiler.useNumberedOutputs) {
    // Find next available number
    let nextNum = 1;
    try {
      const files = fs.readdirSync(outDir).filter(f => f.match(/^\d{3}-.*\.md$/));
      const nums = files.map(f => parseInt(f.split('-')[0], 10)).filter(n => !isNaN(n));
      if (nums.length > 0) {
        nextNum = Math.max(...nums) + 1;
      }
    } catch (err) {
      console.warn(`Warning: Could not read output directory ${outDir} to determine next file number. Defaulting to 001.`);
    }
    
    const paddedNum = pad(nextNum, 3);
    outFile = path.join(outDir, `${paddedNum}-${promptName}.md`);
  } else {
    // Use same name as template
    outFile = path.join(outDir, `${promptName}.md`);
  }

  // Write output
  try {
    fs.writeFileSync(outFile, compiled, 'utf8');
    console.log(`✅ Compiled prompt written to: ${path.relative(process.cwd(), outFile)}`);
    return { success: true, outFile };
  } catch (err) {
    console.error(`Error writing compiled prompt to: ${outFile}`);
    console.error(err.message);
    return { success: false, error: err.message };
  }
}

// If called directly via CLI
if (require.main === module) {
  const main = async () => {
    const [,, templatePathRelative, ...cliArgs] = process.argv;
    if (!templatePathRelative) {
      console.error('Usage: node lib/compile-prompt.js <path-to-template>');
      // Try to load config for example path
      let examplePath = '_docs/prompts/example.md';
      try {
        const configManagerForExample = require('../src/config-manager'); // Separate instance for safety
        const configForExample = configManagerForExample.getConfig();
        examplePath = path.join(configForExample.directories.prompts, 'example.md');
      } catch (err) {
        // Use default
      }
      console.error(`Example: node lib/compile-prompt.js ${examplePath}`);
      process.exit(1);
    }
    
    const options = {};
    for (let i = 0; i < cliArgs.length; i++) {
      if (cliArgs[i].startsWith('--')) {
        const optionName = cliArgs[i].substring(2);
        const optionValue = cliArgs[i+1] && !cliArgs[i+1].startsWith('--') ? cliArgs[i+1] : true;
        options[optionName] = optionValue;
        if (optionValue !== true) i++;
      }
    }
    
    // When run directly, we need to load the config for the compile function
    let configForDirectRun;
    try {
        const configManager = require('../src/config-manager');
        configForDirectRun = configManager.getConfig();
    } catch(e) {
        console.warn("Could not load config for direct execution, using defaults for compile.");
        configForDirectRun = null; // compile function will use its internal defaults
    }

    compile(templatePathRelative, options, configForDirectRun)
      .then(result => {
        if (!result || !result.success) {
          // Error messages should already be printed by compile() or resolveSingleVariable()
          process.exit(1);
        } else {
          process.exit(0);
        }
      })
      .catch(err => {
        console.error("Fatal error during direct CLI execution of compile-prompt:", err);
        process.exit(1);
      });
  };

  main(); // No need to catch here if main itself handles its errors before process.exit
}

// Test-only export for parser testing
function __TEST_ONLY_parsePlaceholders(templateContent) {
  const newPlaceholderRegexInternal = /{{(?:(\/(?:[^}\s]|\\})+)|(?:\$([a-zA-Z_][a-zA-Z0-9_]*)([:a-zA-Z_][a-zA-Z0-9_]*(?:\((?:[^()'"/\\]|\\.|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")*\))?)*)(?:\|default=([^}\s]+))?)}}/g;
  let match;
  const parsedResult = {}; // Using an object keyed by raw placeholder

  while ((match = newPlaceholderRegexInternal.exec(templateContent)) !== null) {
    let variableDetails;
    const raw = match[0];
    const filePath = match[1];
    const varTypeOrKey = match[2];
    const filtersString = match[3];
    const defaultValue = match[4];

    if (filePath) {
      variableDetails = {
        raw,
        type: 'file',
        key: filePath.replace(/\\}/g, '}'),
        filters: [],
        default: defaultValue || null
      };
    } else if (varTypeOrKey) {
      const parsedFilters = [];
      if (filtersString) {
        const filterRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)(?:\(([^)]*)\))?/g;
        let filterMatch;
        while ((filterMatch = filterRegex.exec(filtersString)) !== null) {
          parsedFilters.push({
            name: filterMatch[1],
            // Replace escaped quotes or other special chars if necessary for args in future
            arg: filterMatch[2] ? filterMatch[2].replace(/\\'/g, "'").replace(/\\"/g, '"') : null
          });
        }
      }
      variableDetails = {
        raw,
        type: varTypeOrKey,
        key: varTypeOrKey,
        filters: parsedFilters,
        default: defaultValue || null
      };
    } else {
      // This case should ideally not be hit by the regex, but handle defensively
      variableDetails = { error: 'Could not parse placeholder', raw };
    }
    parsedResult[raw] = variableDetails;
  }
  newPlaceholderRegexInternal.lastIndex = 0;
  return parsedResult;
}

// Export the compile function and resolveSingleVariable
module.exports = { compile, resolveSingleVariable, __TEST_ONLY_parsePlaceholders, newPlaceholderRegex };