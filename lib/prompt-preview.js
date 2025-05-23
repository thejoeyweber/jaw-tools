// lib/prompt-preview.js
const fs = require('fs');
const path = require('path');
const compileLib = require('./compile-prompt'); 
const inquirer = require('inquirer');
const { registry } = require('../dist/variables'); 
const configManager = require('../src/config-manager');

async function previewPrompt(templatePath, options = {}) {
  const config = configManager.getConfig();
  console.log(`Starting preview for: ${templatePath}`);

  let templateContent;
  try {
    templateContent = fs.readFileSync(path.resolve(templatePath), 'utf8');
  } catch (err) {
    console.error(`Error reading template file: ${err.message}`);
    return { success: false };
  }

  const newPlaceholderRegex = /{{(?:(\/[^}\s]+)|(?:\$([a-zA-Z_][a-zA-Z0-9_]*)([:a-zA-Z_][a-zA-Z0-9_]*(?:\([^)]*\))?)*)(?:\|default=([^}\s]+))?)}}/g;
  let match;
  const detectedVariables = [];
  const seenRawPlaceholders = new Set();

  while ((match = newPlaceholderRegex.exec(templateContent)) !== null) {
    const raw = match[0];
    if (seenRawPlaceholders.has(raw)) continue;
    seenRawPlaceholders.add(raw);

    const filePath = match[1];
    const varTypeOrKey = match[2];
    const filtersString = match[3]; 
    const defaultValue = match[4];
    let type = 'unknown';
    let key = raw; 
    let parsedFilters = [];

    if (filePath) {
      type = 'file';
      key = filePath;
    } else if (varTypeOrKey) {
      type = varTypeOrKey;
      key = varTypeOrKey; 
      if (filtersString) {
        const filterRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)(?:\(([^)]*)\))?/g;
        let filterMatchInternal; 
        while ((filterMatchInternal = filterRegex.exec(filtersString)) !== null) {
          parsedFilters.push({ name: filterMatchInternal[1], arg: filterMatchInternal[2] || null });
        }
      }
      if (!registry[type]) {
          console.warn(`Warning: Variable type "${type}" for placeholder ${raw} not found in registry.`);
      }
    }
    detectedVariables.push({ raw, type, key, filters: parsedFilters, default: defaultValue || '—', resolvedValue: '...' });
  }
  newPlaceholderRegex.lastIndex = 0;

  if (detectedVariables.length === 0) {
    console.log('No variables found in this template.');
    if (options.out) {
      fs.writeFileSync(path.resolve(options.out), templateContent, 'utf8');
      console.log(`Output written to ${options.out}`);
    } else {
      console.log('--- Template Content (No Variables) ---');
      console.log(templateContent);
    }
    return { success: true };
  }

  console.log('Performing initial non-interactive resolution for preview...');
  const resolvedValuesMap = new Map();
  for (let i = 0; i < detectedVariables.length; i++) {
    const variable = detectedVariables[i];
    try {
      const varDetails = {
        raw: variable.raw,
        type: variable.type,
        key: variable.key,
        filters: variable.filters, 
        default: variable.default === '—' ? null : variable.default
      };
       // Ensure config.__projectRoot is set for resolveSingleVariable
       if (!config.__projectRoot) {
           config.__projectRoot = process.cwd();
       }
       if (compileLib.resolveSingleVariable && registry[variable.type]) {
         // The resolveSingleVariable in compile-prompt.js expects (varDetails, config, registry)
         // The preview script was trying to pass (varDetails, false, registry, inquirer, process.env, {}, config)
         // Correcting the call:
         const resolved = await compileLib.resolveSingleVariable(varDetails, config, registry);
         
         if (typeof resolved === 'string' && resolved.length > 200 && !resolved.startsWith("<!--")) {
            variable.resolvedValue = resolved.substring(0, 197) + "... (truncated)";
         } else {
            variable.resolvedValue = resolved;
         }
         resolvedValuesMap.set(variable.raw, resolved); 
       } else if (!registry[variable.type]) {
         // Attempt to resolve using process.env if type is not in registry and it's a simple key
         if (process.env[variable.key]) {
            variable.resolvedValue = process.env[variable.key];
         } else {
            variable.resolvedValue = `Error: Type "${variable.type}" not in registry. Not an ENV var.`;
         }
         resolvedValuesMap.set(variable.raw, variable.resolvedValue);
       } else {
         variable.resolvedValue = "Error: Resolver function not available or type not in registry.";
         resolvedValuesMap.set(variable.raw, variable.resolvedValue);
       }
    } catch (e) {
      variable.resolvedValue = `Error: ${e.message}`;
      resolvedValuesMap.set(variable.raw, variable.resolvedValue);
    }
  }

  let previewLoop = true;
  while (previewLoop) {
    if (process.stdout.isTTY) {
        console.clear(); 
    }
    console.log("Interactive Prompt Variable Preview:");
    console.table(detectedVariables.map(v => ({ 
        Variable: v.raw.substring(0,70) + (v.raw.length > 70 ? '...' : ''), 
        Type: v.type, 
        Default: v.default,
        'Resolved (Preview)': String(v.resolvedValue).substring(0,70) + (String(v.resolvedValue).length > 70 ? '...' : '')
    })));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Preview Actions:',
        choices: [
          ...detectedVariables.map((v, i) => ({ name: `Edit "${v.raw.substring(0, 50)}${v.raw.length > 50 ? '...' : ''}"`, value: i })),
          new inquirer.Separator(),
          { name: 'Confirm and Expand Template', value: 'confirm' },
          { name: 'Cancel', value: 'cancel' },
        ],
      },
    ]);

    if (action === 'confirm') {
      previewLoop = false;
    } else if (action === 'cancel') {
      console.log('Preview cancelled.');
      return { success: true, cancelled: true };
    } else if (typeof action === 'number') { 
      const varIndex = action;
      const variableToEdit = detectedVariables[varIndex];
      const currentFullValue = resolvedValuesMap.get(variableToEdit.raw);
      const { newValue } = await inquirer.prompt([
        {
          type: 'input',
          name: 'newValue',
          message: `Enter new value for ${variableToEdit.raw}:`,
          default: typeof currentFullValue === 'string' && !currentFullValue.startsWith("<!--") ? currentFullValue : (variableToEdit.default !== '—' ? variableToEdit.default : ''),
        },
      ]);
      if (typeof newValue === 'string' && newValue.length > 200 && !newValue.startsWith("<!--")) {
        variableToEdit.resolvedValue = newValue.substring(0, 197) + "... (truncated)";
      } else {
        variableToEdit.resolvedValue = newValue;
      }
      resolvedValuesMap.set(variableToEdit.raw, newValue);
    }
  }

  let finalOutput = templateContent;
  for (const [rawPlaceholder, value] of resolvedValuesMap.entries()) { 
    // Ensure that the placeholder is replaced globally if it appears multiple times
    const placeholderRegex = new RegExp(rawPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    finalOutput = finalOutput.replace(placeholderRegex, String(value));
  }

  if (options.out) {
    fs.writeFileSync(path.resolve(options.out), finalOutput, 'utf8');
    console.log(`Expanded template written to ${options.out}`);
  } else {
    console.log('--- Expanded Template ---');
    console.log(finalOutput);
  }
  return { success: true };
}

module.exports = { previewPrompt };
