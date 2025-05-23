#!/usr/bin/env node
'use strict';

/**
 * Prompt Compiler
 * 
 * This script compiles a prompt template, replacing {{file-path}} placeholders
 * with the actual content of those files.
 */

// Try to use fs-extra but fall back to native fs
let fs;
try {
  fs = require('fs-extra');
} catch (err) {
  console.warn('fs-extra not found, falling back to native fs module');
  fs = require('fs');
  // Add any missing methods that might be needed
  if (!fs.ensureDirSync) {
    fs.ensureDirSync = (dirPath) => {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    };
  }
}

const path = require('path');
let glob;
try {
  glob = require('glob');
} catch (err) {
  console.warn('glob not found, file pattern matching will be limited');
  glob = {
    sync: (pattern) => {
      console.warn(`Cannot process glob pattern without glob package: ${pattern}`);
      return [];
    }
  };
}

// Helper to pad numbers
function pad(num, size) {
  let s = num + '';
  while (s.length < size) s = '0' + s;
  return s;
}

/**
 * Compile a prompt template, replacing file placeholders with content.
 * This function is typically called with `(config, argv)` when invoked via `executeCommandModule`.
 * - `argv.promptFile` is expected to contain the path to the prompt template.
 * - Other properties of `argv` are treated as options for the compilation process
 *   (e.g., for variable replacement if such a feature is fully implemented).
 * 
 * @param {Object} config - The jaw-tools configuration object.
 * @param {Object} argv - The yargs argv object, expected to contain `promptFile` and other potential options.
 * @returns {Object} Result object indicating success or failure.
 *                   Example: `{ success: true, outFile: 'path/to/output' }` or
 *                            `{ success: false, error: 'message' }`
 */
function compile(config, argv) {
  const promptFilePath = argv.promptFile;
  // Options can be extracted from argv, excluding yargs specific ones like _, $0
  const options = { ...argv };
  delete options._;
  delete options['$0'];
  delete options.promptFile;
  
  // Config is now passed directly, no need for configOverride or internal loading here.
  const { formatError } = require('../src/utils'); // Ensure formatError is available

  if (!promptFilePath) {
    // This should ideally be caught by yargs or the calling run<Command> function.
    const errorMessage = "Prompt file path is required.";
    // console.error(`❌ Error: ${errorMessage}`); // CLI will show the error via .fail()
    throw formatError(errorMessage, {suggestion: 'Pass the path to the prompt template file.'});
  }
  
  // Resolve the template path
  const templatePath = path.resolve(promptFilePath);
  
  // Read template
  let template;
  try {
    template = fs.readFileSync(templatePath, 'utf8');
  } catch (err) {
    // console.error calls removed
    throw formatError(`Error reading template: ${templatePath}`, { originalError: err });
  }

  // Replace config variables first
  if (config.promptCompiler.variables) {
    Object.entries(config.promptCompiler.variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      template = template.replace(regex, value);
    });
  }

  // Find all {{...}} placeholders for files and globs
  const placeholderRegex = /{{\s*([^}]+)\s*}}/g;
  let match;
  const replacements = {}; // Use an object to cache file reads
  const pathsToProcess = new Set();

  // First pass: collect all unique file paths and glob patterns
  while ((match = placeholderRegex.exec(template)) !== null) {
    pathsToProcess.add(match[1].trim());
  }
  placeholderRegex.lastIndex = 0; // Reset regex index for the replacement pass

  // Process file paths and glob patterns
  for (const pathPattern of pathsToProcess) {
    // Check if it's a glob pattern
    if (pathPattern.includes('*')) {
      try {
        const files = glob.sync(pathPattern);
        if (files.length === 0) {
          replacements[pathPattern] = `<!-- No files matched pattern: ${pathPattern} -->`;
          continue;
        }
        
        let combinedContent = '';
        for (const file of files) {
          try {
            const content = fs.readFileSync(file, 'utf8');
            combinedContent += `\n// File: ${file}\n${content}\n`;
          } catch (err) {
            combinedContent += `\n// Error reading file: ${file}\n`;
          }
        }
        replacements[pathPattern] = combinedContent;
      } catch (err) {
        replacements[pathPattern] = `<!-- Error processing glob pattern: ${pathPattern} -->`;
      }
    } else {
            // Regular file path      try {        const absoluteFilePath = path.resolve(pathPattern);        const stats = fs.statSync(absoluteFilePath);        const fileSizeInKB = stats.size / 1024;                // Warn about large files (over 100KB)        if (fileSizeInKB > 100) {          console.warn(`⚠️ WARNING: Including large file (${Math.round(fileSizeInKB)}KB): ${pathPattern}`);          console.warn(`   This may result in excessive token usage with AI models.`);                    // For extremely large files (over 500KB), add a warning in the prompt          if (fileSizeInKB > 500) {            replacements[pathPattern] = `<!-- WARNING: File ${pathPattern} is extremely large (${Math.round(fileSizeInKB)}KB) and has been truncated -->\n\n// First part of ${pathPattern}:\n` +               fs.readFileSync(absoluteFilePath, 'utf8').substring(0, 50000) +               `\n\n// ... file truncated (${Math.round(fileSizeInKB)}KB total) ...`;            continue;          }        }                const fileContent = fs.readFileSync(absoluteFilePath, 'utf8');        replacements[pathPattern] = fileContent;      } catch (err) {        replacements[pathPattern] = `<!-- ERROR: Could not read file ${pathPattern} -->`;      }
    }
  }

  // Replace all placeholders
  let compiled = template.replace(placeholderRegex, (_, pathPattern) => {
    return replacements[pathPattern.trim()] || `<!-- File not found: ${pathPattern.trim()} -->`;
  });

  // Prepare output directory
  const outDirRelative = config.directories.compiledPrompts;
  const outDir = path.resolve(outDirRelative);

  if (!fs.existsSync(outDir)) {
    try {
      fs.mkdirSync(outDir, { recursive: true });
    } catch (err) {
      // console.error calls removed
      throw formatError(`Error creating output directory: ${outDir}`, { originalError: err });
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
    return { outFile }; // success: true is implied if no error is thrown
  } catch (err) {
    // console.error calls removed
    throw formatError(`Error writing compiled prompt to: ${outFile}`, { originalError: err });
  }
}

// If called directly via CLI
if (require.main === module) {
  // Get template path from CLI
  const [,, templatePathRelative, ...cliArgs] = process.argv;
  if (!templatePathRelative) {
    console.error('Usage: jaw-tools compile-prompt <path-to-template>');
    // Try to load config for example path
    let examplePath = '_docs/prompts/example.md';
    try {
      const configManager = require('../src/config-manager');
      const config = configManager.getConfig();
      examplePath = path.join(config.directories.prompts, 'example.md');
    } catch (err) {
      // Use default
    }
    console.error(`Example: jaw-tools compile-prompt ${examplePath}`);
    process.exit(1);
  }
  
  // Parse options
  const options = {};
  for (let i = 0; i < cliArgs.length; i++) {
    if (cliArgs[i].startsWith('--')) {
      const optionName = cliArgs[i].substring(2);
      const optionValue = cliArgs[i+1] && !cliArgs[i+1].startsWith('--') ? cliArgs[i+1] : true;
      options[optionName] = optionValue;
      if (optionValue !== true) i++; // Skip the next arg
    }
  }
  
  const result = compile(templatePathRelative, options);
  process.exit(result.success ? 0 : 1);
}

// Export the compile function
module.exports = { compile }; 