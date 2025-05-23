// lib/prompt-docs.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const configManager = require('../src/config-manager');

async function generatePromptDocs(options = {}) {
  const config = configManager.getConfig();
  const promptsDir = path.resolve(config.directories?.prompts || '_docs/prompts');
  const outFile = path.resolve(config.directories?.docs || '_docs', 'prompts', 'variables.md');

  console.log(`Scanning templates in: ${promptsDir}`);
  let templateFiles = [];
  try {
    templateFiles = glob.sync(path.join(promptsDir, '**/*.md'), { nodir: true });
  } catch (e) {
    console.error(`Error scanning for template files: ${e.message}`);
    return { success: false };
  }

  if (templateFiles.length === 0) {
    console.warn(`No template files found in ${promptsDir}.`);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, '# Prompt Variable Documentation\n\nNo template files found.\n', 'utf8');
    console.log(`Documentation written to ${outFile}`);
    return { success: true };
  }

  const allVariables = new Map(); 

  for (const templateFile of templateFiles) {
    const relativeTemplatePath = path.relative(process.cwd(), templateFile); 
    try {
      const content = fs.readFileSync(templateFile, 'utf8');
      // Regex from compile-prompt.js, slightly simplified for doc generation (no need to capture filter args separately for now)
      const newPlaceholderRegex = /{{(?:(\/(?:[^}\s]|\\})+)|(?:\$([a-zA-Z_][a-zA-Z0-9_]*)([:a-zA-Z_][a-zA-Z0-9_]*(?:\((?:[^()'"/\\]|\\.|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")*\))?)*)(?:\|default=([^}\s]+))?)}}/g;
      let match;
      while ((match = newPlaceholderRegex.exec(content)) !== null) {
        const rawPlaceholder = match[0];
        const filePath = match[1];
        const varTypeOrKey = match[2]; // This is the $type or $variable_name
        const filtersString = match[3] || ''; // Full filter chain string e.g. :filter1(arg):filter2
        const defaultValue = match[4];

        let type, key, patternRepresentation;

        if (filePath) {
          type = 'file';
          // key for 'file' type is the path itself
          key = filePath.replace(/\\}/g, '}'); // Unescape escaped curly braces
          patternRepresentation = key; // For files, key and pattern are the same
        } else if (varTypeOrKey) {
          // For $type variables, varTypeOrKey is the type, key is also the type unless refined by definition (not handled here)
          type = varTypeOrKey;
          key = varTypeOrKey; 
          patternRepresentation = filtersString; // Show the filters applied
        } else {
          console.warn(`Could not fully parse placeholder for docs: ${rawPlaceholder} in ${relativeTemplatePath}`);
          continue;
        }
        
        // Use the raw placeholder as the primary key to ensure uniqueness for identical definitions used multiple times
        // but also store type, key, pattern for grouping and display
        const mapKey = rawPlaceholder; // Using the full raw placeholder as the unique key
        
        if (!allVariables.has(mapKey)) {
          allVariables.set(mapKey, { 
            type, 
            keyDisplay: key, // The core identifier (e.g. file path or $type)
            pattern: patternRepresentation, // Filters or the file path itself
            defaults: new Set(), 
            files: new Set(),
            raw: rawPlaceholder // Store the raw placeholder for reference
          });
        }
        const varEntry = allVariables.get(mapKey);
        if (defaultValue) varEntry.defaults.add(defaultValue);
        varEntry.files.add(relativeTemplatePath);
      }
      newPlaceholderRegex.lastIndex = 0; 
    } catch (e) {
      console.warn(`Skipping file ${templateFile} due to read error: ${e.message}`);
    }
  }

  if (allVariables.size === 0) {
    console.log('No variables found in any templates.');
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, '# Prompt Variable Documentation\n\nNo variables found in templates.\n', 'utf8');
    console.log(`Documentation written to ${outFile}`);
    return { success: true };
  }

  let mdContent = '# Prompt Variable Documentation\n\n';
  mdContent += 'This document lists all unique variables found across prompt templates.\n\n';
  mdContent += '| Variable (Raw) | Key / Path | Type | Filters / Pattern | Default(s) | Used In Template(s) |\n';
  mdContent += '|----------------|------------|------|-------------------|------------|---------------------|\n';

  // Sort for consistent output
  const sortedVariables = Array.from(allVariables.values()).sort((a,b) => {
    if (a.raw < b.raw) return -1;
    if (a.raw > b.raw) return 1;
    return 0;
  });

  for (const varData of sortedVariables) {
    const defaults = Array.from(varData.defaults).join(', ') || '—';
    const files = Array.from(varData.files).map(f => `\`${f}\``).join('<br>'); 
    const displayPattern = (varData.type === 'file' && varData.pattern === varData.keyDisplay) ? '—' : (varData.pattern || '—');
    mdContent += `| \`${varData.raw.replace(/\|/g, '\\|')}\` | \`${varData.keyDisplay.replace(/\|/g, '\\|')}\` | ${varData.type} | \`${displayPattern.replace(/\|/g, '\\|')}\` | ${defaults.replace(/\|/g, '\\|')} | ${files} |\n`;
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, mdContent, 'utf8');
  console.log(`Documentation written to ${outFile}`);
  return { success: true };
}

module.exports = { generatePromptDocs };
