#!/usr/bin/env node
'use strict';

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const path = require('path');
const fs = require('fs-extra'); // Changed to fs-extra, aliased as fs

// Global error handler for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`\n❌ Fatal error: ${err.message}`);
  if (err.stack) {
    console.error(`\nStack trace: ${err.stack}`);
  }
  console.error('\nIf this issue persists, please report it at https://github.com/jaw-tools/issues');
  process.exit(1);
});

// Import utilities and config manager
const configManager = require('../src/config-manager');
// const { ensureDir } = require('../src/utils'); // ensureDir from utils is deprecated and its usages were replaced
// fsExtra require is now aliased to fs at the top of the file.

// Normalize path for cross-platform compatibility
function normalizePath(...pathSegments) {
  return path.normalize(path.join(...pathSegments));
}

// Path to the setup script
const setupPath = normalizePath(__dirname, '..', 'setup.js');

// Initialize if not already done - This logic might need adjustment with yargs
// We need to ensure this check happens *before* yargs tries to parse a command
// that might depend on the config.
// For now, let's assume yargs parsing will handle command-specific logic.
// const projectRoot = configManager.findProjectRoot();
// const configPath = normalizePath(projectRoot, 'jaw-tools.config.js');
// if (!fs.existsSync(configPath) && command !== 'init' && command !== 'setup' && command !== 'help' && command !== 'h' && command !== 'version' && command !== 'v') {
//   console.log('⚠️ jaw-tools configuration not found. Running setup...');
//   runSetup();
  
//   // Only exit if there are no additional commands to run (e.g., execution init)
//   if (command !== 'execution' && command !== 'e') {
//     return;
//   }
// }


// Helper Functions

/**
 * @typedef {Object} CommandModuleOptions
 * @property {boolean} [requiresConfig=true] - Whether the command module requires configuration to be loaded.
 * @property {boolean} [passConfig=true] - Whether to pass the loaded configuration as the first argument to the module function.
 * @property {boolean} [passArgv=true] - Whether to pass the yargs `argv` object as an argument to the module function.
 *                                       If `passConfig` is true, `argv` is the second argument; otherwise, it's the first.
 */

/**
 * Dynamically requires and executes a function from a specified command module.
 * This helper centralizes common logic for loading configurations, requiring modules,
 * invoking module functions, and handling their results or errors.
 * 
 * Assumes that the target module function is async and either:
 * 1. Throws an error on failure.
 * 2. Returns an object with a `success` boolean property (`{ success: false, error: '...' }` on failure).
 * 
 * @param {string} moduleName - The name of the module in `../lib/` directory (e.g., 'scaffold', 'doctor').
 * @param {string} functionName - The name of the function to execute within the module.
 * @param {Object} argv - The yargs `argv` object containing parsed command-line arguments and options.
 * @param {CommandModuleOptions} [options={}] - Options to control how the module is loaded and function is called.
 * @returns {Promise<any>} A promise that resolves with the result of the module function if successful.
 * @throws {Error} Throws a formatted error if module/function loading fails, execution fails,
 *                 or the module function reports failure (e.g., returns `{ success: false }`).
 */
async function executeCommandModule(moduleName, functionName, argv, options = {}) {
  const { formatError } = require('../src/utils');
  const { 
    requiresConfig = true, 
    passConfig = true, // Whether to pass config as the first argument
    passArgv = true,   // Whether to pass argv as the second argument
                       // (or first if passConfig is false)
    // transformArgs = null // Callback: (config, argv) => [arg1, arg2, ...]
                           // If provided, this dictates the exact args passed.
                           // For now, we'll try to make lib functions accept (config, argv) or (argv)
  } = options;

  let config = null;
  let modulePath = ''; // Initialize modulePath

  try {
    if (requiresConfig) {
      config = loadConfig(); // loadConfig throws on error
    }

    modulePath = `../lib/${moduleName}`; // Construct module path
    const module = require(modulePath);

    if (typeof module[functionName] !== 'function') {
      throw new Error(`Function '${functionName}' not found in module '${moduleName}' (path: ${modulePath}).`);
    }

    let moduleArgs = [];
    if (passConfig && requiresConfig) { // Check requiresConfig as well for safety
      moduleArgs.push(config);
    }
    if (passArgv) {
      moduleArgs.push(argv);
    }
    
    // Call the module function
    // Most lib functions are expected to be async and return { success: true/false, ... }
    // or throw an error directly.
    const result = await module[functionName](...moduleArgs);

    // Module functions are now expected to throw errors directly on failure.
    // The check for `result.success === false` is removed.
    
    return result; // Return the result of the module function if successful.

  } catch (error) {
    // Add context to the error
    let errorMessage = `Error in command execution: module='${moduleName}', function='${functionName}'`;
    if (modulePath) { // Include modulePath if it was resolved
        errorMessage += `, path='${modulePath}'`;
    }

    if (error.isFormatted) { // If formatError was already used in the module or loadConfig
        // We might want to prepend our context or just rethrow
        // For now, rethrow as is, assuming it has enough detail
        throw error;
    }
    // Use formatError for consistent error structure
    throw formatError(errorMessage, { originalError: error });
  }
}


// These functions will be called by yargs command handlers.
// They will throw errors on failure.

/**
 * Executes the initial setup for jaw-tools in a project.
 * This involves finding or creating the `setup.js` script (either in the project's
 * `node_modules/jaw-tools` directory or the package root) and running it.
 * The `setup.js` script itself handles the specifics of configuration and scaffolding.
 * 
 * @async
 * @param {Object} argv - The yargs `argv` object. May not be directly used if setup has no specific CLI args.
 * @throws {Error} Throws a formatted error if the setup script cannot be found,
 *                 if it doesn't export a callable function, or if the setup process reports failure.
 */
async function runSetup(argv) { 
  const { formatError } = require('../src/utils'); 
  try {
    const projectRoot = configManager.findProjectRoot();
    const localSetupPath = normalizePath(projectRoot, 'node_modules', 'jaw-tools', 'setup.js');
    const actualSetupPath = fs.existsSync(localSetupPath) ? localSetupPath : setupPath;

    if (!fs.existsSync(actualSetupPath)) {
      throw new Error(`Setup script not found at: ${actualSetupPath}`);
    }

    const setupModule = require(actualSetupPath);
    const setupFunction = (typeof setupModule === 'function') ? setupModule : setupModule.default || setupModule.setup;

    if (typeof setupFunction !== 'function') {
        throw new Error(`The setup script at ${actualSetupPath} does not export a callable function.`);
    }
    const result = await setupFunction(); 

    if (!result || !result.success) {
      // If setupFunction itself throws an error, it will be caught by the outer catch.
      // This handles cases where it returns a failure object.
      throw new Error(result?.error || 'Setup failed or returned no result. Check setup script logs for details.');
    }
    // Success
  } catch (err) {
    if (err.isFormatted) throw err;
    throw formatError('Failed to run setup', { originalError: err });
  }
}

/**
 * Runs the project scaffolding process.
 * Delegates to the `scaffold` function in `lib/scaffold.js` via `executeCommandModule`.
 * Assumes `lib/scaffold.js#scaffold` is adapted to accept `(config, argv)`.
 * 
 * @async
 * @param {Object} argv - The yargs `argv` object, expected to contain `force` option.
 * @returns {Promise<any>} The result from `executeCommandModule`.
 * @throws {Error} Propagates errors from `executeCommandModule` or `lib/scaffold.js`.
 */
async function runScaffold(argv) { 
  // lib/scaffold.js#scaffold is expected to take (config, argv)
  // and destructure 'force' from argv internally.
  return executeCommandModule('scaffold', 'scaffold', argv, { 
    requiresConfig: true, 
    passConfig: true, 
    passArgv: true 
  });
}

/**
 * Runs diagnostic checks for the jaw-tools setup.
 * Delegates to the `runDiagnostics` function in `lib/doctor.js` via `executeCommandModule`.
 * Assumes `lib/doctor.js#runDiagnostics` is adapted to accept `(config, argv)`.
 * The function interprets the result from `runDiagnostics` to throw an error if overall checks fail.
 * 
 * @async
 * @param {Object} argv - The yargs `argv` object.
 * @returns {Promise<Object>} The diagnostic results if successful.
 * @throws {Error} Propagates errors or throws if `results.overall` is false.
 */
async function runDoctor(argv) { 
  // lib/doctor.js#runDiagnostics is expected to take (config, argv).
  // It returns a results object like { overall: boolean, ... }.
  const results = await executeCommandModule('doctor', 'runDiagnostics', argv, { 
    requiresConfig: true, 
    passConfig: true, 
    passArgv: true 
  });

  if (!results || !results.overall) {
    // The doctor command itself logs detailed issues.
    // Here, we just signal that the overall check failed by throwing an error.
    throw new Error('Doctor checks failed. See output above for details.');
  }
  return results; // Return results for any potential future use, though CLI typically just relies on throw.
}

/**
 * Handles `repomix` subcommands that involve spawning `lib/profiles-manager.js`.
 * This includes listing, running, adding, or deleting repomix profiles.
 * It ensures `profiles-manager.js` exists, copying it from templates if necessary,
 * and then spawns it as a child process with the appropriate arguments.
 * 
 * Note: The `generate-from-prd` repomix subcommand is handled by `runRepomixGenerateFromPrd`.
 * 
 * @async
 * @param {Object} argv - The yargs `argv` object. It's used to derive arguments for `profiles-manager.js`.
 *                        `argv._` contains the subcommand (e.g., 'list', 'run'), and `argv.profile` may contain the profile name.
 * @throws {Error} Throws a formatted error if `profiles-manager.js` cannot be prepared,
 *                 if spawning the script fails, or if the script exits with a non-zero code.
 */
async function runRepomixCommand(argv) {
  const { formatError } = require('../src/utils');
  const config = loadConfig(); 
  const projectRoot = configManager.findProjectRoot();

  const commandArgs = argv._.slice(1); // Get the subcommand and its arguments, e.g., ['list'] or ['run', 'myProfile']
  // If 'profile' is a named option (like in 'run <profile>'), ensure it's part of the args for profiles-manager.js
  // Yargs usually makes positional <profile> available as argv.profile.
  // We need to ensure profilesManagerArgs correctly reflects what profiles-manager.js expects.
  // For 'list', 'add <name>', 'delete <name>', the name is part of commandArgs.
  // For 'run <profile>', argv.profile has the name.
  let profilesManagerActualArgs = [...commandArgs];
  if (argv.profile && commandArgs[0] === 'run' && commandArgs.length === 1) {
    // If 'run' is the subcommand and only 'run' is in commandArgs, append argv.profile
    profilesManagerActualArgs.push(argv.profile);
  }


  // 'generate-from-prd' is handled by its own yargs command and runRepomixGenerateFromPrd function.
  // This check prevents runRepomixCommand from handling it if called directly.
  if (argv._[1] === 'generate-from-prd') {
    return runRepomixGenerateFromPrd(argv);
  }

  try {
    const repoProfilesDir = normalizePath(projectRoot, config.directories?.repomixProfiles || '.repomix-profiles');
    fs.ensureDirSync(repoProfilesDir); // Now uses fs-extra via fs alias
    const profileManagerPath = normalizePath(repoProfilesDir, 'profiles-manager.js');

    if (!fs.existsSync(profileManagerPath)) {
      const sourceProfileManager = normalizePath(__dirname, '..', 'lib', 'profiles-manager.js');
      if (!fs.existsSync(sourceProfileManager)) {
        throw new Error(`Source profile manager script not found at: ${sourceProfileManager}. This is an issue with the jaw-tools installation.`);
      }
      fs.copyFileSync(sourceProfileManager, profileManagerPath); 
      console.log(`✅ Created profiles-manager.js in ${repoProfilesDir}`);
    }

    const { spawn } = require('child_process');
    
    await new Promise((resolve, reject) => {
      const profileMgrProcess = spawn('node', [profileManagerPath, ...profilesManagerActualArgs], {
        stdio: 'inherit', 
        shell: false 
      });

      profileMgrProcess.on('error', (spawnError) => {
        reject(formatError('Failed to start or run the repomix profile manager script.', { originalError: spawnError }));
      });

      profileMgrProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Repomix profile manager script finished with error code ${code}. Check output above for details.`));
        } else {
          resolve(); 
        }
      });
    });
  } catch (err) {
    // Catch errors from ensureDir, copyFileSync, or the promise rejection
    if (err.isFormatted) throw err; // Re-throw if already formatted by formatError
    throw formatError(`Error during repomix command '${argv._[1] || ''}'`, { originalError: err });
  }
}

async function runRepomixGenerateFromPrd(argv) {
  const { formatError } = require('../src/utils');
  // lib/repomix/generateFromPrd.js#generateProfileFromPrd was adapted to take (config, argv)
  // and destructure prdFile from argv.
  return executeCommandModule('repomix', 'generateProfileFromPrd', argv, {
    requiresConfig: true,
    passConfig: true, // Will pass config as first arg
    passArgv: true    // Will pass argv as second arg
  });
  // The lib/repomix/generateFromPrd.js function returns {success, error}, which executeCommandModule handles.
}

/**
 * Compiles a prompt template file.
 * Delegates to the `compile` function in `lib/compile-prompt.js` via `executeCommandModule`.
 * Assumes `lib/compile-prompt.js#compile` is adapted to accept `(config, argv)`.
 * 
 * @param {Object} argv - The yargs `argv` object, expected to contain `promptFile` and other options.
 * @returns {Promise<any>} The result from `executeCommandModule`.
 * @throws {Error} Propagates errors from `executeCommandModule` or `lib/compile-prompt.js`.
 */
function runCompilePrompt(argv) { 
  // lib/compile-prompt.js#compile is expected to take (config, argv)
  // and destructure promptFile and other options from argv.
  // It's synchronous but executeCommandModule handles its {success, error} return.
  return executeCommandModule('compile-prompt', 'compile', argv, { 
    requiresConfig: true, 
    passConfig: true, 
    passArgv: true 
  });
}

/**
 * Executes a defined workflow sequence or lists available sequences.
 * Workflows are defined in `jaw-tools.config.js` and consist of a series of commands.
 * 
 * If `argv.sequence` is 'list' (or `argv._[1]` is 'list'), it lists sequences.
 * Otherwise, it attempts to run the specified sequence (or the default one if none is provided).
 * 
 * @async
 * @param {Object} argv - The yargs `argv` object. `argv.sequence` or `argv._[1]` determines the action.
 * @throws {Error} Throws a formatted error if a sequence is not found or fails during execution.
 */
async function runWorkflow(argv) { 
  const { formatError } = require('../src/utils');
  try {
    const config = loadConfig();
    const workflow = require('../lib/workflow');

    // argv._ contains positional arguments not captured by named ones.
    // 'workflow list' -> argv._ = ['workflow', 'list']
    // 'workflow mysequence' -> argv._ = ['workflow', 'mysequence'], argv.sequence = 'mysequence'
    // 'workflow' -> argv._ = ['workflow'], argv.sequence = null (or default)
    
    const subCommand = argv._[1]; // e.g., 'list' or a sequence name if not using named positional

    if (subCommand === 'list' || (argv._[0] === 'workflow' && argv.sequence === 'list')) { // Handling 'workflow list'
      workflow.listSequences(config); // Assuming this is synchronous and prints output
                                      // If it can fail, it should throw.
    } else {
      // Use argv.sequence which is defined by yargs positional argument
      const sequenceName = argv.sequence; 
      const success = await workflow.runSequence(config, sequenceName); // Assuming runSequence is async
      if (!success) {
        // runSequence should ideally throw an error with details.
        // If it just returns false, we create a generic error.
        throw new Error(`Workflow sequence '${sequenceName || 'default'}' failed.`);
      }
    }
    // Success
  } catch (err) {
    if (err.isFormatted) throw err;
    throw formatError('Error in workflow command', { originalError: err });
  }
}

// runExecutionCommand function is being removed as its logic is moved to lib/commands/execution.js
// runMiniPrdCommand function is being removed as its logic is moved to lib/commands/mini-prd.js

function showVersion() {
  try {
    const packageJsonPath = normalizePath(__dirname, '..', 'package.json');
    const packageJson = require(packageJsonPath);
    console.log(`jaw-tools v${packageJson.version}`);
  } catch (err) {
    console.error(`❌ Error getting version: ${err.message}`);
    console.log('jaw-tools (version unknown)');
  }
}

function showHelp() {
  console.log(`
🛠️ jaw-tools - AI Development Utilities

Usage: jaw-tools <command> [arguments]

Commands:
  setup                   Initialize and configure jaw-tools in your project
  scaffold [--force]      Scaffold standard documentation and files to your project
  doctor                  Check jaw-tools setup status
  
  repomix <subcommand>    Manage and run repomix profiles
    list                  Show available profiles
    run <profile>         Generate a snapshot with the specified profile
    add <profile>         Add a new profile
    delete <profile>      Delete a profile
    generate-from-prd     Generate a profile from a Mini-PRD file
  
  refresh [options]       Refresh templates from latest version (placed in _docs directory)
    --force               Force overwrite all files
    --yes                 Non-interactive mode (no prompts)
    --pattern=<glob>      Only refresh files matching pattern
  
  refresh-profiles        Add new repomix profiles without changing existing ones
  
  compile <prompt-file>   Compile a prompt template
  
  workflow [sequence]     Run command sequences
    list                  Show available command sequences
    <sequence-name>       Run the specified sequence
    
  mini-prd <subcommand>   Manage Mini-PRDs
    create <n>            Create a new Mini-PRD
    update <id>           Update an existing Mini-PRD
    snapshot <id>         Generate a snapshot for a Mini-PRD
    list                  Show all Mini-PRDs
  
  execution <subcommand>  Manage AI-assisted execution workflow
    init                  Initialize execution tracking for a Mini-PRD
    bundle                Bundle context for an execution stage
    record-step           Record execution step results and generate summary
  
  version                 Show jaw-tools version
  help                    Show this help
  
Aliases:
  r = repomix
  c = compile
  w = workflow
  mprd = mini-prd
  e = execution
  v = version
  h = help
`);
}

// Utility function to run the refresh command
async function runRefresh(argv) { // argv from yargs
  // lib/refresh.js#refreshTemplates was adapted to take (config, argv)
  return executeCommandModule('refresh', 'refreshTemplates', argv, {
    requiresConfig: true, // refreshTemplates loads config internally, but executeCommandModule can do it
    passConfig: true,
    passArgv: true
  });
}

// Utility function to run the refresh-profiles command
async function runRefreshProfiles(argv) { // argv from yargs
  // lib/refresh.js#refreshRepomixProfiles was adapted to take (config, argv)
  return executeCommandModule('refresh', 'refreshRepomixProfiles', argv, {
    requiresConfig: true, // refreshRepomixProfiles loads config internally
    passConfig: true,
    passArgv: true 
  });
}

// Utility function to load the config file
function loadConfig() {
  try {
    // getConfig from configManager should throw if critical errors occur (e.g., unparsable config)
    return configManager.getConfig(); 
  } catch (err) {
    // Re-throw the error to be caught by the command's try...catch or yargs .fail()
    // This makes loadConfig consistent in its error handling.
    const { formatError } = require('../src/utils'); // Ensure utils is loaded for formatError
    throw formatError('Failed to load jaw-tools configuration', { originalError: err, suggestion: "Ensure 'jaw-tools.config.js' is valid or run 'jaw-tools setup'." });
  }
}

// Utility function to convert kebab-case to camelCase
function camelCase(str) {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

// The old findClosestCommand and levenshteinDistance can be removed as yargs handles suggestions.

// Initialize yargs
yargs(hideBin(process.argv))
  .command('setup', 'Initialize and configure jaw-tools in your project', 
    () => {}, // No builder function needed for options
    async (argv) => { // Made handler async
      try {
        // No config check needed for setup itself
        await runSetup(argv);
        // console.log('Setup command completed successfully.'); // Optional success message
      } catch (error) {
        throw error; // Re-throw to be caught by .fail()
      }
    }
  )
  .command('init', 'Alias for setup command', // Alias for setup
    () => {}, 
    async (argv) => { // Made handler async
      try {
        await runSetup(argv); // Delegate to runSetup
        // console.log('Init command completed successfully.');
      } catch (error) {
        throw error;
      }
    }
  )
  .command('scaffold', 'Scaffold standard documentation and files to your project', 
    (yargs) => {
      yargs.option('force', {
        alias: 'f',
        type: 'boolean',
        description: 'Force overwrite existing files',
        default: false
      });
    }, 
    async (argv) => { // Made handler async
      try {
        ensureConfigExists('scaffold');
        await runScaffold(argv); // Pass full argv
        // console.log('Scaffold command completed successfully.');
      } catch (error) {
        throw error;
      }
    }
  )
  .command('doctor', 'Check jaw-tools setup status', 
    () => {}, 
    async (argv) => { // Made handler async
      try {
        ensureConfigExists('doctor');
        await runDoctor(argv); // Pass full argv
        // console.log('Doctor command completed successfully.');
      } catch (error) {
        throw error;
      }
    }
  )
  .alias('status', 'doctor') // Alias for doctor

  .command('repomix', 'Manage and run repomix profiles', (yargs) => {
    yargs
      .command('list', 'Show available profiles', () => {}, async (argv) => { 
        try {
          ensureConfigExists('repomix list');
          await runRepomixCommand(argv); 
        } catch (error) {
          throw error; // Propagate to .fail()
        }
      })
      .command('run <profile>', 'Generate a snapshot with the specified profile', (yargsBuilder) => { 
        yargsBuilder.positional('profile', {
          describe: 'Name of the profile to run',
          type: 'string'
        });
      }, async (argv) => { 
        try {
          ensureConfigExists('repomix run');
          await runRepomixCommand(argv); 
        } catch (error) {
          throw error;
        }
      })
      .command('add <profile>', 'Add a new profile', (yargsBuilder) => {
        yargsBuilder.positional('profile', {
          describe: 'Name of the profile to add',
          type: 'string'
        });
        // Add options for include, ignore etc. for the 'add' command if needed
        // yargsBuilder.option('include', { type: 'string', description: 'Include patterns' });
        // yargsBuilder.option('ignore', { type: 'string', description: 'Ignore patterns' });
      }, async (argv) => { 
        try {
          ensureConfigExists('repomix add');
          await runRepomixCommand(argv); 
        } catch (error) {
          throw error;
        }
      })
      .command('delete <profile>', 'Delete a profile', (yargsBuilder) => {
        yargsBuilder.positional('profile', {
          describe: 'Name of the profile to delete',
          type: 'string'
        });
      }, async (argv) => { 
        try {
          ensureConfigExists('repomix delete');
          await runRepomixCommand(argv); 
        } catch (error) {
          throw error;
        }
      })
      .command('generate-from-prd', 'Generate a profile from a Mini-PRD file', (yargsBuilder) => {
        yargsBuilder.option('prd-file', {
          describe: 'Path to the PRD file',
          type: 'string',
          demandOption: true 
        });
      }, async (argv) => { 
        try {
          ensureConfigExists('repomix generate-from-prd');
          await runRepomixGenerateFromPrd(argv); 
        } catch (error) {
          throw error;
        }
      })
      .demandCommand(1, 'You need to specify a subcommand for repomix. Valid options: list, run, add, delete, generate-from-prd.')
      .help();
  }, (argv) => { // This handler is for the base 'repomix' command without a subcommand
    if (argv._.length <= 1 && !argv.profile) { 
        // If only 'repomix' is typed, or 'repomix --some-global-option'
        // yargs.help() shows global help. We want help for 'repomix' command.
        // yargs.getCommandInstance().showHelp(); // This might not be standard yargs API
        // A common practice is to have yargs itself handle this if no subcommand handler is matched
        // by ensuring the main command has a handler that shows help or by yargs default behavior.
        // For now, if demandCommand is working, this might not be strictly necessary.
        // However, explicitly showing help for the command group can be useful.
        console.log("Please specify a subcommand for repomix. Use 'jaw-tools repomix --help' for details.");
    }
  })
  .alias('r', 'repomix')
  .alias('profile', 'repomix') 

  .command('compile <prompt-file>', 'Compile a prompt template', (yargs) => {
    yargs.positional('prompt-file', {
      describe: 'Path to the prompt file to compile',
      type: 'string'
    })
    // The old CLI parsed any other --option value, let's keep it simple for now
    // and can add specific options later if needed.
    // For now, pass all other options.
    .parserConfiguration({ 'parse-positional-numbers': false, 'parse-numbers': false })
    .strict(false); // Allow unknown options to be passed through
  }, async (argv) => { // Made handler async
    try {
      ensureConfigExists('compile');
      // runCompilePrompt now takes argv directly
      runCompilePrompt(argv); // This is synchronous but wrapped in try/catch
      // console.log('Compile command completed successfully.');
    } catch (error) {
      throw error; // Propagate to .fail()
    }
  })
  .alias('c', 'compile')
  .alias('compile-prompt', 'compile') // compile-prompt was an alias

  .command('workflow [sequence]', 'Run command sequences or list them', (yargs) => {
    yargs.positional('sequence', {
      describe: 'Name of the sequence to run (optional, defaults to configured default). Use "list" to see available sequences.',
      type: 'string',
      default: null 
    })
    // Removed explicit 'list' subcommand here, as 'workflow list' will be handled by the main handler
    // by checking the value of the 'sequence' positional argument.
    // If 'list' needs its own options later, it can be re-added.
    ;
  }, async (argv) => { // Made handler async
    try {
      ensureConfigExists('workflow'); // General config check
      await runWorkflow(argv); // Pass full argv
      // console.log('Workflow command completed successfully.');
    } catch (error) {
      throw error; // Propagate to .fail()
    }
  })
  .alias('w', 'workflow')
  .alias('wf', 'workflow')

  .command(require('../lib/commands/mini-prd')) // Use the mini-prd command module
  .command(require('../lib/commands/execution')) // Use the execution command module

  .command('refresh', 'Refresh templates from latest version', (yargs) => {
    yargs
      .option('force', { type: 'boolean', default: false, description: 'Force overwrite all files' })
      .option('yes', { type: 'boolean', default: false, description: 'Non-interactive mode (no prompts)' })
      .option('pattern', { type: 'string', description: 'Only refresh files matching pattern (glob)' });
  }, async (argv) => { // Made handler async
    try {
      ensureConfigExists('refresh');
      await runRefresh(argv); // Pass full argv
      // console.log('Refresh command completed successfully.');
    } catch (error) {
      throw error;
    }
  })
  .alias('update', 'refresh') // update was an alias

  .command('refresh-profiles', 'Add new repomix profiles without changing existing ones', () => {}, async (argv) => { // Made handler async
    try {
      ensureConfigExists('refresh-profiles');
      await runRefreshProfiles(argv); // Pass full argv, though it might not use them
      // console.log('Refresh profiles command completed successfully.');
    } catch (error) {
      throw error;
    }
  })
  .alias('update-profiles', 'refresh-profiles') // update-profiles was an alias

  // Custom command for meta-prompt error, as it was explicitly handled
  .command('meta-prompt', 
    'This command is deprecated and has been removed.', // Updated description
    () => {}, // No builder function needed
    (argv) => {
      const errorMessage = [
        `❌ The meta-prompt command is not available.`,
        `Use 'execution bundle' instead with the --meta-prompt option.`,
        `Example: npx jaw-tools execution bundle --prd-file <path> --stage-name <n> --meta-prompt <path>`
      ].join('\n');
      throw new Error(errorMessage); // Error will be caught and handled by .fail()
    }
  )
  
  .help() // Enable --help option. Keep this towards the end.
  .alias('h', 'help') // Also keep alias with help.
  .version() // Enable --version option, reads from package.json. Keep this towards the end.
  .alias('v', 'version') // Also keep alias with version.
  .demandCommand(1, 'You need at least one command before moving on. Use --help for available commands.')
  .strict() // Report unknown commands or options.
  .fail((msg, err, yargsInstance) => { // Renamed yargs to yargsInstance to avoid conflict
    // Custom failure handler
    if (err) {
      // Errors from command handlers will be caught here if they are not caught by process.on('uncaughtException')
      // or if they are intentionally thrown to be caught by yargs.fail
      console.error(`❌ Error during command execution: ${err.message}`);
      if (err.stack) {
        // console.error(`\nStack trace: ${err.stack}`); // Optionally log stack for debugging
      }
    } else if (msg) {
      // Yargs-generated messages (unknown command, missing argument, etc.)
      // Check if the message is a yargs generated one we want to suppress or rephrase
      if (msg.includes('Unknown argument') || 
          msg.includes('Not enough non-option arguments') || 
          msg.includes('Invalid values') ||
          msg.includes('Missing argument') ||
          msg.includes('command is required') ||
          msg.includes('subcommand is required')) {
           console.error(`❌ ${msg}`); 
      } else if (msg.includes('Did you mean')) {
          console.error(`❌ ${msg}`); // Yargs' suggestion
      } else {
          // For other custom messages passed to fail() or unexpected yargs messages
          console.error(`❌ An unexpected error occurred: ${msg}`);
      }
    }
    
    // Only show help if it's a yargs parsing error, not an error from the command's logic.
    // The presence of `msg` and absence of `err` usually indicates a yargs parsing/validation error.
    if (msg && !err) {
        console.log(yargsInstance.help()); // Show help output
    } else {
        console.log("\nRun 'jaw-tools --help' for a list of available commands.");
    }
    process.exit(1);
  })
  .scriptName("jaw-tools") // Sets the script name for help messages.
  .epilogue('For more information, find our documentation at https://github.com/jaw-tools') // Show this at the end of help.
  .wrap(yargs(hideBin(process.argv)).terminalWidth()) // Use full terminal width.
  .parse(); // Parse arguments and execute command handlers.


// Helper function to ensure config exists for commands that need it
function ensureConfigExists(commandName) {
  const projectRoot = configManager.findProjectRoot(); // This needs to be available
  const configPath = normalizePath(projectRoot, 'jaw-tools.config.js');
  if (!fs.existsSync(configPath)) {
    // Throw an error that will be caught by the .fail() handler
    throw new Error(`❌ jaw-tools configuration not found for command '${commandName}'.\nPlease run "jaw-tools setup" first to initialize your project.`);
  }
  // Additionally, you might want to try loading the config here to catch parsing errors early
  try {
    loadConfig(); // Attempt to load to validate
  } catch (err) {
    // If loadConfig() throws a formatted error, it might be better to just let that propagate.
    // However, ensureConfigExists can add specific context about *why* config is needed now.
    // err from loadConfig already contains good details, so just rethrow or wrap if more context is needed.
    // For now, let loadConfig's error be the primary one if it fails.
    // If loadConfig didn't throw but returned an empty/default object due to non-critical issues,
    // this function's purpose is primarily the existence check.
    // The modification to loadConfig() to throw on critical errors is key.
    if (err.message.includes("Failed to load jaw-tools configuration")) { // Check if it's from loadConfig
        throw err; // Rethrow if it's already a well-formatted error from loadConfig
    }
    // If it's a different error during loadConfig (less likely now), wrap it.
    const { formatError } = require('../src/utils');
    throw formatError(`Error validating jaw-tools configuration for command '${commandName}'.`, { originalError: err });
  }
}

module.exports = {
  loadConfig,
  ensureConfigExists,
  normalizePath, // Exporting normalizePath as it's used in MiniPrdManager and potentially other places
  camelCase // Exporting camelCase as it's used in runExecutionCommand and potentially other places
  // Do NOT export run<CommandName> functions that are being moved or CLI-specific yargs setups.
};