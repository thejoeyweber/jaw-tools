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
 * @returns {number|string} Estimated token count or "Error getting token count" on failure.
 *
 * @description
 * This function provides a *very rough heuristic* for estimating the number of tokens in a file.
 * It is based on the assumption that, on average, a token is roughly equivalent to a certain number of bytes (currently using a factor of 0.6 tokens per byte).
 *
 * **Suitability:**
 * - Best suited for plain text files or code where token length is somewhat consistent.
 * - Can give a ballpark figure for assessing if a file is too large for an LLM context window.
 *
 * **Limitations:**
 * - **Highly Inaccurate for Precise LLM Token Counting:** Different LLMs have different tokenization methods (e.g., BPE, WordPiece, SentencePiece). This function does NOT replicate any specific model's tokenizer.
 * - The 0.6 tokens/byte factor is a general approximation and can vary significantly based on content type (e.g., verbose XML vs. dense code, language, use of whitespace).
 * - Does not account for specific token encodings or special characters treated uniquely by tokenizers.
 *
 * **Intended Use Case within `jaw-tools`:**
 * - Primarily used to provide a quick, rough estimate of file "size" in terms of potential tokens, mainly for display purposes or very coarse-grained filtering.
 * - **Not to be used for critical decision-making based on precise token limits.** For that, use the specific model's official tokenizer.
 */
function getTokenCount(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    // Heuristic: average 0.6 tokens per byte. This is a very rough estimate.
    // For example, OpenAI's rule of thumb is often "1 token ~= 4 chars in English text".
    // Or, for code, it can be different. This factor is a simplification.
    return Math.round(fileSizeInBytes * 0.6); 
  } catch (err) {
    // console.error(`Error getting token count for ${filePath}: ${err.message}`); // Avoid console.error in utils
    return "Error getting token count";
  }
}

/**
 * Resolves specific internal command aliases, typically used within workflow sequences.
 * This is NOT for general CLI command aliasing, which is handled by yargs.
 * It allows workflow definitions in `jaw-tools.config.js` to use shorthand for common `jaw-tools` commands.
 * For example, a workflow might specify `repomix-profile run my-profile` which this function
 * would resolve before execution by `runCommand`.
 * 
 * @param {string} command The command string that might be an alias (e.g., 'repomix-profile').
 * @returns {string} The resolved command (e.g., 'jaw-tools repomix') or the original command if no alias is found.
 */
function resolveCommandAlias(command) {
  const aliases = {
    // Defines internal aliases used by runCommand, typically for workflow sequences.
    // These allow workflows to use shorter, more abstract names for jaw-tools commands.
    'repomix-profile': 'jaw-tools repomix', // Example: 'repomix-profile run full-codebase'
    'compile-prompt': 'jaw-tools compile'  // Example: 'compile-prompt _docs/prompts/my-prompt.md'
  };
  
  return aliases[command] || command;
}

/**
 * Runs a shell command and returns a Promise that resolves on successful completion
 * or rejects if the command fails or exits with a non-zero code.
 *
 * @param {Array<string>} commandAndArgs - An array where the first element is the command
 *                                       and subsequent elements are its arguments (e.g., ['node', 'script.js', '--arg1']).
 *                                       The command can be a simple command like 'ls' or a namespaced one like 'jaw-tools repomix'.
 * @param {number} [index] - Optional index for numbering steps, used in logging.
 * @returns {Promise<void>} A Promise that resolves if the command executes successfully (exit code 0),
 *                          and rejects with an Error if the command fails.
 * @throws {Error} If the command fails to spawn or exits with a non-zero code.
 */
function runCommand([cmd, args = []], index) { // Ensure args defaults to an empty array
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const stepNum = typeof index === 'number' ? `[Step ${index + 1}] ` : '';
    
    // Resolve command alias if needed (e.g., for commands defined in workflows)
    const resolvedCmd = resolveCommandAlias(cmd);
    
    // Split the resolved command if it contains spaces (e.g., 'jaw-tools repomix' becomes 'jaw-tools' and 'repomix')
    // This allows cmd to be something like "jaw-tools repomix" and args to be ["run", "my-profile"]
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
 * Creates directory if it doesn't exist.
 * @param {string} dir Directory path.
 * @deprecated Use fs-extra.ensureDirSync() or fs-extra.ensureDir() instead for better error handling and async options.
 *             This function uses native `fs.mkdirSync` and does not provide detailed error feedback through exceptions
 *             in the same way `fs-extra` might. It also lacks an asynchronous version.
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    // fs.mkdirSync can throw an error, which is fine for this deprecated function.
    // Consumers should migrate to fs-extra for more robust error handling.
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Creates a readline interface for interactive user prompts in the console.
 * Remember to close the returned interface when done if it's not passed to `askQuestion` repeatedly.
 * @returns {readline.Interface} A new readline.Interface instance.
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompts the user with a question via the console and returns their answer as a Promise.
 * If a readline.Interface instance (`rl`) is provided, it will be used; otherwise, a new one is created
 * and closed after the question is answered.
 * @param {string} question The question to display to the user.
 * @param {readline.Interface} [rl] - Optional. An existing readline.Interface instance.
 *                                   If provided, this function will NOT close it.
 *                                   If not provided, a new interface is created and closed internally.
 * @returns {Promise<string>} A Promise that resolves with the user's answer (string).
 */
async function askQuestion(question, rl) {
  const ownInterface = !rl; // True if we create our own interface
  const currentInterface = rl || createInterface();
  return new Promise(resolve => {
    currentInterface.question(question, answer => {
      if (ownInterface) {
        currentInterface.close();
      }
      resolve(answer);
    });
  });
}

/**
 * Prompts the user for conflict resolution when a target file already exists.
 * Provides options: Skip, Overwrite, Rename existing, Abort.
 * @param {string} targetPath - Absolute or relative path to the conflicting file.
 * @param {readline.Interface} [rl] - Optional. An existing readline.Interface instance.
 * @returns {Promise<string>} A Promise that resolves to one of: 'skip', 'overwrite', 'rename', 'abort'.
 *                            Defaults to 'skip' on invalid input.
 */
async function resolveFileConflict(targetPath, rl) {
  const ownInterface = !rl;
  const currentInterface = rl || createInterface();
  const relativePath = path.relative(process.cwd(), targetPath);
  
  const prompt = `File "${relativePath}" already exists. What would you like to do?\n` +
                 `(S)kip, (O)verwrite, (R)ename existing and create new, (A)bort operation: `;
  
  return new Promise(resolve => {
    currentInterface.question(prompt, answer => {
      if (ownInterface) {
        currentInterface.close();
      }
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
        console.log('Invalid option. Defaulting to Skip.'); // This console.log is acceptable for interactive feedback.
        resolve('skip');
      }
    });
  });
}

/**
 * Prompts the user to enter a suffix for renaming an existing file.
 * If the user provides no input, a default suffix ('.original') is used.
 * @param {string} targetPath - The path of the file to be renamed (used for context in the prompt, not for actual renaming here).
 * @param {readline.Interface} [rl] - Optional. An existing readline.Interface instance.
 * @returns {Promise<string>} A Promise that resolves with the new file path including the chosen or default suffix.
 *                            Note: This function constructs the new path string; it does not perform the rename.
 */
async function getRenameSuffix(targetPath, rl) {
  const ownInterface = !rl;
  const currentInterface = rl || createInterface();
  const defaultSuffix = '.original';
  
  return new Promise(resolve => {
    // targetPath is used implicitly in the prompt context for the user
    currentInterface.question(`Enter suffix for renaming the existing file (e.g., .backup, _old) [default: ${defaultSuffix}]: `, answer => {
      if (ownInterface) {
        currentInterface.close();
      }
      const suffix = answer.trim() || defaultSuffix;
      const parsedPath = path.parse(targetPath); // Parses the original target path
      const newPath = path.join(
        parsedPath.dir, 
        `${parsedPath.name}${suffix}${parsedPath.ext}`
      );
      resolve(newPath);
    });
  });
}

/**
 * Checks if a command-line tool is available in the system's PATH by attempting to run its version command.
 * @param {string} command - The command to check (e.g., 'node', 'npm', 'git').
 * @returns {Promise<boolean>} A Promise that resolves to `true` if the command executes successfully
 *                             (implying it's available), and `false` otherwise.
 */
async function checkCommandAvailability(command) {
  const { exec } = require('child_process');
  
  return new Promise(resolve => {
    // Most CLI tools support a --version flag.
    exec(`${command} --version`, { shell: true, timeout: 5000 }, (error) => {
      resolve(!error); // If no error, command is available.
    });
  });
}

/**
 * Creates a standardized Error object with additional contextual information.
 * This helps in providing consistent error messages throughout the application.
 * The actual logging of the error should be handled by the calling code or a dedicated error handler.
 * 
 * @param {string} message - The primary error message.
 * @param {Object} [options={}] - Additional options for formatting the error.
 * @param {Error} [options.originalError] - The original error object that was caught, if any.
 * @param {string} [options.command] - The command or operation that was being attempted when the error occurred.
 * @param {string} [options.suggestion] - A helpful suggestion for the user on how to potentially resolve the error.
 * @returns {Error} A new Error object with a formatted message and an `isFormatted` property set to true.
 *                  The original error, if provided, is included in the formatted message.
 */
function formatError(message, options = {}) {
  let formattedMessage = `❌ Error: ${message}`;
  
  if (options.command) {
    formattedMessage += `\nCommand: ${options.command}`;
  }
  
  if (options.suggestion) {
    formattedMessage += `\nSuggestion: ${options.suggestion}`;
  }
  
  if (options.originalError) {
    formattedMessage += `\nDetails: ${options.originalError.message}`;
    if (options.originalError.stack && process.env.DEBUG) {
      formattedMessage += `\nStack: ${options.originalError.stack}`;
    }
  }
  
  const error = new Error(formattedMessage);
  error.isFormatted = true;
  
  return error;
}

/**
 * Handle command error with consistent formatting
 * @param {Error} error The error to handle
 * @param {string} command The command that failed
 */
function handleCommandError(error, command) {
  if (error.isFormatted) {
    console.error(error.message);
  } else {
    console.error(`❌ Error in '${command}' command: ${error.message}`);
    if (error.stack && process.env.DEBUG) {
      console.error(`Stack: ${error.stack}`);
    }
  }
  // process.exit(1); // Removed: Errors should be thrown and handled by the CLI's .fail() handler
  // Instead of exiting, the caller should catch the error and decide how to proceed.
  // This function's purpose was primarily to log and exit. Logging can be done by the caller or .fail().
  // For now, we'll remove it. If specific formatting is needed before throwing,
  // the calling code can use formatError and then throw the result.
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
  checkCommandAvailability,
  formatError
  // handleCommandError removed from exports
};