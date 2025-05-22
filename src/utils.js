/**
 * Common utilities for jaw-tools
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Pads a number with leading zeros
 * @param {number} num Number to pad
 * @param {number} size Size of resulting string
 * @returns {string} Padded number
 */
function pad(num, size) {
  let s = num + '';
  while (s.length < size) s = '0' + s;
  return s;
}

/**
 * Gets an approximation of token count for a file
 * @param {string} filePath Path to the file
 * @returns {number|string} Estimated token count or error message
 */
function getTokenCount(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const fileSizeInKB = stats.size / 1024;
    // Rough estimate: ~0.6 tokens per byte for XML/text
    return Math.round(fileSizeInKB * 0.6 * 1024); 
  } catch (err) {
    return "Error getting token count";
  }
}

/**
 * Resolves command aliases to real commands
 * @param {string} command Command that might be an alias
 * @returns {string} The resolved command
 */
function resolveCommandAlias(command) {
  const aliases = {
    'repomix-profile': 'jaw-tools repomix',
    'compile-prompt': 'jaw-tools compile'
  };
  
  return aliases[command] || command;
}

/**
 * Runs a command with proper error handling
 * @param {Array} command Command and args array, e.g. ['node', ['file.js']]
 * @param {number} index Optional index for step numbering
 * @returns {Promise} Promise that resolves when command completes
 */
function runCommand([cmd, args], index) {
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const stepNum = typeof index === 'number' ? `[Step ${index + 1}] ` : '';
    
    // Resolve command alias if needed
    const resolvedCmd = resolveCommandAlias(cmd);
    
    // Split the resolved command if it contains spaces (like 'jaw-tools repomix')
    const cmdParts = resolvedCmd.split(' ');
    const mainCmd = cmdParts[0];
    const mainArgs = [...cmdParts.slice(1), ...args];
    
    console.log(`\n${stepNum}Running: ${resolvedCmd} ${args.join(' ')}`);
    
    const proc = spawn(mainCmd, mainArgs, { stdio: 'inherit', shell: true });
    
    proc.on('close', code => {
      if (code !== 0) {
        reject(new Error(`Command failed: ${resolvedCmd} ${args.join(' ')}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Creates directory if it doesn't exist
 * @param {string} dir Directory path
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Creates a readline interface for interactive prompts
 * @returns {readline.Interface} Readline interface
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompts the user with a question and returns their answer
 * @param {string} question The question to ask
 * @param {readline.Interface} rl Readline interface (optional, will create one if not provided)
 * @returns {Promise<string>} User's answer
 */
async function askQuestion(question, rl) {
  const interface = rl || createInterface();
  return new Promise(resolve => {
    interface.question(question, answer => {
      if (!rl) interface.close();
      resolve(answer);
    });
  });
}

/**
 * Prompts the user for conflict resolution when a file exists
 * @param {string} targetPath Path to the conflicting file
 * @param {readline.Interface} rl Readline interface (optional)
 * @returns {Promise<string>} Resolution action: 'skip', 'overwrite', 'rename', or 'abort'
 */
async function resolveFileConflict(targetPath, rl) {
  const interface = rl || createInterface();
  const relativePath = path.relative(process.cwd(), targetPath);
  
  const prompt = `File "${relativePath}" already exists. What would you like to do?\n` +
                 `(S)kip, (O)verwrite, (R)ename existing and create new, (A)bort scaffold: `;
  
  return new Promise(resolve => {
    interface.question(prompt, answer => {
      if (!rl) interface.close();
      
      const action = answer.trim().toLowerCase();
      if (action === 's' || action === 'skip') {
        resolve('skip');
      } else if (action === 'o' || action === 'overwrite') {
        resolve('overwrite');
      } else if (action === 'r' || action === 'rename') {
        resolve('rename');
      } else if (action === 'a' || action === 'abort') {
        resolve('abort');
      } else {
        console.log('Invalid option. Defaulting to Skip.');
        resolve('skip');
      }
    });
  });
}

/**
 * Prompts the user for a suffix to rename an existing file
 * @param {string} targetPath Path to the file to be renamed
 * @param {readline.Interface} rl Readline interface (optional)
 * @returns {Promise<string>} The new file path with suffix
 */
async function getRenameSuffix(targetPath, rl) {
  const interface = rl || createInterface();
  const defaultSuffix = '.original';
  
  return new Promise(resolve => {
    interface.question(`Enter suffix for renamed file [${defaultSuffix}]: `, answer => {
      if (!rl) interface.close();
      
      const suffix = answer.trim() || defaultSuffix;
      const parsedPath = path.parse(targetPath);
      const newPath = path.join(
        parsedPath.dir, 
        `${parsedPath.name}${suffix}${parsedPath.ext}`
      );
      
      resolve(newPath);
    });
  });
}

/**
 * Checks if a command can be executed
 * @param {string} command Command to check
 * @returns {Promise<boolean>} True if command exists and can be executed
 */
async function checkCommandAvailability(command) {
  const { exec } = require('child_process');
  
  return new Promise(resolve => {
    exec(`${command} --version`, { shell: true }, (error) => {
      resolve(!error);
    });
  });
}

module.exports = {
  pad,
  getTokenCount,
  runCommand,
  resolveCommandAlias,
  ensureDir,
  createInterface,
  askQuestion,
  resolveFileConflict,
  getRenameSuffix,
  checkCommandAvailability
}; 