#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

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
const { ensureDir } = require('../src/utils');

// Normalize path for cross-platform compatibility
function normalizePath(...pathSegments) {
  return path.normalize(path.join(...pathSegments));
}

// Parse command line arguments
const [,, command, ...args] = process.argv;

// Path to the setup script
const setupPath = normalizePath(__dirname, '..', 'setup.js');

// List of valid commands for better error messages
const validCommands = [
  'init', 'setup', 'scaffold', 'doctor', 'status', 
  'repomix', 'profile', 'r', 
  'compile', 'compile-prompt', 'c',
  'workflow', 'wf', 'w',
  'mini-prd', 'mprd',
  'refresh', 'update',
  'refresh-profiles', 'update-profiles',
  'execution', 'e',
  'version', 'v',
  'help', 'h',
  'ci'
];

// Initialize if not already done
const projectRoot = configManager.findProjectRoot();
const configPath = normalizePath(projectRoot, 'jaw-tools.config.js');
if (!fs.existsSync(configPath) && command !== 'init' && command !== 'setup' && command !== 'help' && command !== 'h' && command !== 'version' && command !== 'v') {
  console.log('⚠️ jaw-tools configuration not found. Running setup...');
  runSetup();
  
  // Only exit if there are no additional commands to run (e.g., execution init)
  if (command !== 'execution' && command !== 'e') {
    return;
  }
}

// Main command switch
switch (command) {
  case 'ci':
    runCiCommand(args);
    break;
    
  case 'init':
  case 'setup':
    runSetup();
    break;
    
  case 'scaffold':
    runScaffold(args.includes('--force'));
    break;
    
  case 'doctor':
  case 'status':
    runDoctor();
    break;
    
  case 'repomix':
  case 'profile':
  case 'r':
    runRepomixCommand(args);
    break;
    
  case 'compile':
  case 'compile-prompt':
  case 'c':
    runCompilePrompt(args);
    break;
    
  case 'workflow':
  case 'wf':
  case 'w':
    runWorkflow(args);
    break;
    
  case 'mini-prd':
  case 'mprd':
    runMiniPrdCommand(args);
    break;
    
  case 'refresh':
  case 'update':
    runRefresh(args);
    break;
    
  case 'refresh-profiles':
  case 'update-profiles':
    runRefreshProfiles(args);
    break;
    
  case 'execution':
  case 'e':
    runExecutionCommand(args);
    break;
    
  case 'version':
  case 'v':
    showVersion();
    break;
    
  case 'meta-prompt':
    console.error(`❌ The meta-prompt command is not available. Use 'execution bundle' instead with the --meta-prompt option.`);
    console.log(`Example: npx jaw-tools execution bundle --prd-file <path> --stage-name <n> --meta-prompt <path>`);
    process.exit(1);
    break;
    
  case 'help':
  case 'h':
    showHelp();
    break;
    
  case undefined:
  case '':
    console.error(`❌ No command specified. Run 'npx jaw-tools help' to see available commands.`);
    process.exit(1);
    break;
    
  default:
    // Check if it's close to a valid command and suggest alternatives
    const closest = findClosestCommand(command);
    if (closest) {
      console.error(`❌ Unknown command: '${command}'. Did you mean '${closest}'?`);
    } else {
      console.error(`❌ Unknown command: '${command}'`);
    }
    console.log(`Run 'npx jaw-tools help' to see available commands.`);
    process.exit(1);
}

// CI Command
function runCiCommand(args) {
  const ciArgs = args.slice(); // All arguments after 'ci'
  const ciSubCommand = ciArgs.shift(); // Expect 'config'

  if (ciSubCommand === 'config') {
    const options = {
      provider: undefined,
      out: undefined,
      dryRun: false
    };
    for (let i = 0; i < ciArgs.length; i++) {
      if (ciArgs[i] === '--provider' && ciArgs[i+1] && !ciArgs[i+1].startsWith('--')) {
        options.provider = ciArgs[i+1];
        i++;
      } else if (ciArgs[i] === '--out' && ciArgs[i+1] && !ciArgs[i+1].startsWith('--')) {
        options.out = ciArgs[i+1];
        i++;
      } else if (ciArgs[i] === '--dry-run') {
        options.dryRun = true;
      } else if (ciArgs[i].startsWith('--')) {
        // Allow unknown options for now, generateCIConfig might handle them or ignore
        // console.warn(`⚠️ Unknown or malformed option for 'ci config': ${ciArgs[i]}`);
      }
    }
    
    // Dynamically require to avoid loading if not used
    const { generateCIConfig } = require('../lib/ci-config'); 
    generateCIConfig(options)
      .then(result => {
        if (!result.success) {
          console.error(`❌ CI Config generation failed: ${result.error || 'Unknown error'}`);
          process.exit(1);
        }
        // Success message is handled by generateCIConfig itself
        process.exit(0);
      })
      .catch(err => {
        console.error(`❌ Fatal error during CI config generation: ${err.message}`);
        if (process.env.DEBUG && err.stack) {
          console.error(err.stack);
        }
        process.exit(1);
      });
  } else if (ciSubCommand === undefined) {
    console.error(`❌ Missing subcommand for 'ci'. Available: config`);
    showCiHelp(); // Placeholder for now
    process.exit(1);
  } 
  else {
    console.error(`❌ Unknown 'ci' subcommand: '${ciSubCommand}'. Available: config`);
    showCiHelp(); // Placeholder for now
    process.exit(1);
  }
}

// Helper Functions
function runSetup() {
  try {
    if (!fs.existsSync(setupPath)) {
      console.error(`❌ Setup script not found at: ${setupPath}`);
      process.exit(1);
    }
    
    const setup = require(setupPath);
    setup().then(result => {
      if (!result.success) {
        process.exit(1);
      }
      process.exit(0);
    }).catch(err => {
      console.error(`❌ Error running setup: ${err.message}`);
      process.exit(1);
    });
  } catch (err) {
    console.error(`❌ Failed to run setup: ${err.message}`);
    process.exit(1);
  }
}

function runScaffold(force = false) {
  try {
    // Load config
    const config = loadConfig();
    
    // Get scaffold module
    const scaffold = require('../lib/scaffold');
    
    // Run scaffolding
    scaffold.scaffold(config, force)
      .then(result => {
        if (!result.success) {
          console.error(`❌ Scaffolding failed: ${result.error}`);
          process.exit(1);
        }
        process.exit(0);
      })
      .catch(err => {
        console.error(`❌ Error during scaffolding: ${err.message}`);
        process.exit(1);
      });
  } catch (err) {
    console.error(`❌ Failed to run scaffolding: ${err.message}`);
    process.exit(1);
  }
}

function runDoctor() {
  try {
    // Get doctor module
    const doctor = require('../lib/doctor');
    
    // Run diagnostics
    doctor.runDiagnostics()
      .then(results => {
        // Exit with code 1 if overall health check failed
        process.exit(results.overall ? 0 : 1);
      })
      .catch(err => {
        console.error(`❌ Error running diagnostics: ${err.message}`);
        process.exit(1);
      });
  } catch (err) {
    console.error(`❌ Failed to run doctor: ${err.message}`);
    process.exit(1);
  }
}

function runRepomixCommand(args) {
  try {
    // Load config
    const config = loadConfig();
    
    // Check if this is the generate-from-prd command
    if (args[0] === 'generate-from-prd') {
      runRepomixGenerateFromPrd(args.slice(1));
      return;
    }
    
    // Check if .repomix-profiles directory exists
    const repoProfilesDir = normalizePath(projectRoot, config.directories?.repomixProfiles || '.repomix-profiles');
    
    // Ensure the directory exists
    ensureDir(repoProfilesDir);
    
    // Check if profiles-manager.js exists in the project's .repomix-profiles directory
    const profileManagerPath = normalizePath(repoProfilesDir, 'profiles-manager.js');
    
    // If it doesn't exist, copy our version
    if (!fs.existsSync(profileManagerPath)) {
      const sourceProfileManager = normalizePath(__dirname, '..', 'lib', 'profiles-manager.js');
      if (!fs.existsSync(sourceProfileManager)) {
        console.error(`❌ Source profile manager not found at: ${sourceProfileManager}`);
        process.exit(1);
      }
      
      try {
        fs.copyFileSync(sourceProfileManager, profileManagerPath);
        console.log(`✅ Created profiles-manager.js in ${repoProfilesDir}`);
      } catch (err) {
        console.error(`❌ Error copying profile manager: ${err.message}`);
        process.exit(1);
      }
    }
    
    // Run the profiles-manager.js script with the provided arguments
    const { spawn } = require('child_process');
    const profileMgr = spawn('node', [profileManagerPath, ...args], { 
      stdio: 'inherit', 
      shell: true 
    });
    
    profileMgr.on('error', err => {
      console.error(`❌ Error running profile manager: ${err.message}`);
      process.exit(1);
    });
    
    profileMgr.on('close', code => process.exit(code || 0));
  } catch (err) {
    console.error(`❌ Error in repomix command: ${err.message}`);
    process.exit(1);
  }
}

function runRepomixGenerateFromPrd(args) {
  try {
    // Load config
    const config = loadConfig();
    
    // Get the repomix module
    const repomix = require('../lib/repomix');
    
    // Parse arguments
    let prdFile = null;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--prd-file' && i + 1 < args.length) {
        prdFile = args[i + 1];
        i++; // Skip the value in the next iteration
      }
    }
    
    if (!prdFile) {
      // Check if the first argument is a file path and not an option
      if (args.length > 0 && !args[0].startsWith('--')) {
        prdFile = args[0];
      } else {
        console.error('❌ Error: No PRD file specified. Usage: jaw-tools repomix generate-from-prd --prd-file <path>');
        process.exit(1);
      }
    }
    
    // Run the generate-from-prd function
    repomix.generateProfileFromPrd({ prdFile }, config)
      .then(result => {
        if (!result.success) {
          console.error(`❌ Error generating profile: ${result.error}`);
          process.exit(1);
        }
        process.exit(0);
      })
      .catch(err => {
        console.error(`❌ Error generating profile: ${err.message}`);
        process.exit(1);
      });
  } catch (err) {
    console.error(`❌ Error in repomix generate-from-prd command: ${err.message}`);
    process.exit(1);
  }
}

function runCompilePrompt(args) {
  try {
    // Load config
    const config = loadConfig();
    
    // Load compile-prompt module
    const compilePromptPath = normalizePath(__dirname, '..', 'lib', 'compile-prompt.js');
    const compilePrompt = require(compilePromptPath);
    
    // Parse arguments
    if (args.length === 0) {
      console.error('❌ Error: No prompt file specified. Usage: jaw-tools compile <prompt-file>');
      process.exit(1);
    }
    
    const promptFile = args[0];
    const options = {};
    
    // Extract options
    for (let i = 1; i < args.length; i++) {
      if (args[i].startsWith('--')) {
        const optionName = args[i].substring(2);
        const optionValue = args[i+1] && !args[i+1].startsWith('--') ? args[i+1] : true;
        options[optionName] = optionValue;
        if (optionValue !== true) i++; // Skip the value in the next iteration
      }
    }
    
    // Compile the prompt using the function with proper parameters
    const result = compilePrompt.compile(promptFile, options, config);
    
    // Handle the result
    if (!result || !result.success) {
      console.error(`❌ Compilation failed: ${result?.error || 'Unknown error'}`);
      process.exit(1);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(`❌ Error in compile command: ${err.message}`);
    process.exit(1);
  }
}

function runWorkflow(args) {
  try {
    // Load config
    const config = loadConfig();
    
    // Get workflow module
    const workflow = require('../lib/workflow');
    
    // Determine the subcommand
    const subCommand = args[0];
    
    if (subCommand === 'list') {
      // List available sequences
      workflow.listSequences(config);
    } else {
      // Run sequence (either specified sequence or default)
      const sequenceName = (subCommand && !subCommand.startsWith('--')) ? subCommand : null;
      workflow.runSequence(config, sequenceName)
        .then(success => {
          process.exit(success ? 0 : 1);
        })
        .catch(err => {
          console.error(`Error running sequence: ${err.message}`);
          process.exit(1);
        });
    }
  } catch (err) {
    console.error(`❌ Error in workflow command: ${err.message}`);
    process.exit(1);
  }
}

function runExecutionCommand(args) {
  try {
    // Parse and process the execution command arguments
    const [subCommand, ...subArgs] = args;
    
    // Load config
    const config = loadConfig();
    
    // Load execution module
    const execution = require('../lib/execution');
    
    switch (subCommand) {
      case 'init':
        // Parse init command parameters
        let prdFile = null;
        
        for (let i = 0; i < subArgs.length; i++) {
          if (subArgs[i] === '--prd-file' && i + 1 < subArgs.length) {
            prdFile = subArgs[i + 1];
            i++; // Skip the value in the next iteration
          }
        }
        
        if (!prdFile) {
          console.error('❌ Error: No PRD file specified. Usage: jaw-tools execution init --prd-file <path>');
          process.exit(1);
        }
        
        // Run the init function
        execution.initExecution({ prdFile }, config)
          .then(result => {
            if (!result.success) {
              console.error(`❌ Error initializing execution: ${result.error}`);
              process.exit(1);
            }
            
            console.log(`✅ Execution tracking initialized for PRD ${result.prdId}: ${result.prdName}`);
            process.exit(0);
          })
          .catch(err => {
            console.error(`❌ Error initializing execution: ${err.message}`);
            process.exit(1);
          });
        break;
        
      case 'bundle':
        // Parse bundle command parameters
        let bundleOptions = {
          prdFile: null,
          stageName: null,
          metaPrompt: null,
          repomixProfile: null,
          prevStageSummary: null
        };
        
        for (let i = 0; i < subArgs.length; i++) {
          if (subArgs[i].startsWith('--')) {
            const optionName = subArgs[i].substring(2);
            if (i + 1 < subArgs.length && !subArgs[i+1].startsWith('--')) {
              bundleOptions[camelCase(optionName)] = subArgs[i+1];
              i++; // Skip the value in the next iteration
            } else {
              bundleOptions[camelCase(optionName)] = true;
            }
          }
        }
        
        // Validate required parameters
        if (!bundleOptions.prdFile || !bundleOptions.stageName || !bundleOptions.metaPrompt) {
          console.error('❌ Error: Missing required parameters. Usage: jaw-tools execution bundle --prd-file <path> --stage-name <name> --meta-prompt <path> [--repomix-profile <name>] [--prev-stage-summary <path>]');
          process.exit(1);
        }
        
        // Run the bundle function
        execution.bundleExecution(bundleOptions, config)
          .then(result => {
            if (!result.success) {
              console.error(`❌ Error bundling execution: ${result.error}`);
              process.exit(1);
            }
            
            console.log(`✅ Execution bundle prepared for stage: ${bundleOptions.stageName}`);
            console.log(`📁 Stage directory: ${path.relative(process.cwd(), result.stageDir)}`);
            console.log(`📄 Compiled meta-prompt: ${path.relative(process.cwd(), result.compiledMetaPrompt)}`);
            process.exit(0);
          })
          .catch(err => {
            console.error(`❌ Error bundling execution: ${err.message}`);
            process.exit(1);
          });
        break;
        
      case 'record-step':
        // Parse record-step command parameters
        let recordOptions = {
          prdFile: null,
          stageName: null,
          instructionsFile: null,
          logFile: null,
          feedbackFile: null,
          status: null
        };
        
        for (let i = 0; i < subArgs.length; i++) {
          if (subArgs[i].startsWith('--')) {
            const optionName = subArgs[i].substring(2);
            if (i + 1 < subArgs.length && !subArgs[i+1].startsWith('--')) {
              recordOptions[camelCase(optionName)] = subArgs[i+1];
              i++; // Skip the value in the next iteration
            } else {
              recordOptions[camelCase(optionName)] = true;
            }
          }
        }
        
        // Validate required parameters
        if (!recordOptions.prdFile || !recordOptions.stageName || !recordOptions.status) {
          console.error('❌ Error: Missing required parameters. Usage: jaw-tools execution record-step --prd-file <path> --stage-name <name> --status <status> [--instructions-file <path>] [--log-file <path>] [--feedback-file <path>]');
          process.exit(1);
        }
        
        // Run the record-step function
        execution.recordExecutionStep(recordOptions, config)
          .then(result => {
            if (!result.success) {
              console.error(`❌ Error recording execution step: ${result.error}`);
              process.exit(1);
            }
            
            console.log(`✅ Execution step recorded for stage: ${recordOptions.stageName}`);
            console.log(`📁 Stage directory: ${path.relative(process.cwd(), result.stageDir)}`);
            console.log(`🔖 Status: ${result.status}`);
            process.exit(0);
          })
          .catch(err => {
            console.error(`❌ Error recording execution step: ${err.message}`);
            process.exit(1);
          });
        break;
        
      default:
        console.log('🔍 Execution Commands:');
        console.log('  jaw-tools execution init --prd-file <path>');
        console.log('  jaw-tools execution bundle --prd-file <path> --stage-name <name> --meta-prompt <path> [--repomix-profile <name>] [--prev-stage-summary <path>]');
        console.log('  jaw-tools execution record-step --prd-file <path> --stage-name <name> --status <status> [--instructions-file <path>] [--log-file <path>] [--feedback-file <path>]');
        break;
    }
  } catch (err) {
    console.error(`❌ Error in execution command: ${err.message}`);
    process.exit(1);
  }
}

function runMiniPrdCommand(args) {
  try {
    // Parse and process the mini-prd command arguments
    const [subCommand, ...subArgs] = args;
    
    // Check if the MiniPrdManager exists
    const miniPrdManagerPath = normalizePath(__dirname, '..', 'lib', 'mini-prd', 'manager.js');
    if (!fs.existsSync(miniPrdManagerPath)) {
      console.error(`❌ Mini-PRD manager not found at: ${miniPrdManagerPath}`);
      process.exit(1);
    }
    
    // Load the MiniPrdManager class
    const MiniPrdManager = require(miniPrdManagerPath);
    const manager = new MiniPrdManager(projectRoot);
    
    switch (subCommand) {
      case 'create':
        // Parse create command parameters
        const name = subArgs[0];
        if (!name) {
          console.error('❌ Error: Mini-PRD name is required');
          process.exit(1);
        }
        
        // Parse options
        const options = {};
        for (let i = 1; i < subArgs.length; i++) {
          if (subArgs[i].startsWith('--')) {
            const option = subArgs[i].substring(2);
            const value = subArgs[i+1];
            if (value && !value.startsWith('--')) {
              if (option === 'includes' || option === 'excludes' || option === 'plannedFiles') {
                options[option] = value.split(',');
              } else {
                options[option] = value;
              }
              i++; // Skip the value in the next iteration
            } else {
              options[option] = true;
            }
          }
        }
        
        try {
          const id = manager.createPrd(name, options);
          console.log(`✅ Created Mini-PRD ${id}: ${name}`);
          const filename = `${id}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
          console.log(`📝 Markdown file: _docs/project-docs/prds/${filename}`);
        } catch (err) {
          console.error(`❌ Error creating Mini-PRD: ${err.message}`);
          process.exit(1);
        }
        break;
        
      case 'update':
        // Check for PRD ID
        const updateId = subArgs[0];
        if (!updateId) {
          console.error('❌ Error: Mini-PRD ID is required');
          process.exit(1);
        }
        
        // Parse update options
        const updateOptions = {};
        for (let i = 1; i < subArgs.length; i++) {
          if (subArgs[i].startsWith('--')) {
            const option = subArgs[i].substring(2);
            const value = subArgs[i+1];
            if (value && !value.startsWith('--')) {
              if (option === 'add' || option === 'include') {
                updateOptions.includes = value.split(',');
              } else if (option === 'exclude') {
                updateOptions.excludes = value.split(',');
              } else if (option === 'plannedFiles' || option === 'planned') {
                updateOptions.plannedFiles = value.split(',');
              } else {
                updateOptions[option] = value;
              }
              i++; // Skip the value in the next iteration
            }
          }
        }
        
        try {
          const result = manager.updatePrd(updateId, updateOptions);
          console.log(`✅ Updated Mini-PRD ${updateId}`);
          console.log(`🔄 Updated: ${Object.keys(updateOptions).join(', ')}`);
        } catch (err) {
          console.error(`❌ Error updating Mini-PRD: ${err.message}`);
          process.exit(1);
        }
        break;
        
      case 'snapshot':
        // Check for PRD ID
        const snapshotId = subArgs[0];
        if (!snapshotId) {
          console.error('❌ Error: Mini-PRD ID is required');
          process.exit(1);
        }
        
        try {
          const result = manager.generateSnapshot(snapshotId);
          if (result.success) {
            console.log(`✅ Generated snapshot for Mini-PRD ${snapshotId}`);
            console.log(`📁 Profile: ${result.profileName}`);
          } else {
            console.error(`❌ Error generating snapshot: ${result.error}`);
            process.exit(1);
          }
        } catch (err) {
          console.error(`❌ Error generating snapshot: ${err.message}`);
          process.exit(1);
        }
        break;
        
      case 'list':
        try {
          const prds = manager.listPrds();
          if (prds.length === 0) {
            console.log('No Mini-PRDs found.');
          } else {
            console.log('📋 Mini-PRDs:');
            prds.forEach(prd => {
              console.log(`  - ${prd.id}: ${prd.name} (${prd.status})`);
            });
          }
        } catch (err) {
          console.error(`❌ Error listing Mini-PRDs: ${err.message}`);
          process.exit(1);
        }
        break;
        
      default:
        console.log('🔍 Mini-PRD Commands:');
        console.log('  jaw-tools mini-prd create <n> [--options]');
        console.log('  jaw-tools mini-prd update <id> [--options]');
        console.log('  jaw-tools mini-prd snapshot <id>');
        console.log('  jaw-tools mini-prd list');
        break;
    }
  } catch (err) {
    console.error(`❌ Error in mini-prd command: ${err.message}`);
    process.exit(1);
  }
}

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

  ci <subcommand>         Manage CI/CD configurations
    config [options]      Scaffold CI workflow YAML
      --provider <name>   Specify CI provider (e.g., github, gitlab; default: github)
      --out <path>        Output path for the CI workflow file (default from config)
      --dry-run           Print the generated YAML to console without writing to file
  
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

function showCiHelp() {
  console.log(`
  ci <subcommand>         Manage CI/CD configurations
    config [options]      Scaffold CI workflow YAML
      --provider <name>   Specify CI provider (e.g., github, gitlab; default: github)
      --out <path>        Output path for the CI workflow file (default from config)
      --dry-run           Print the generated YAML to console without writing to file
`);
}

// Utility function to run the refresh command
function runRefresh(args) {
  try {
    // Parse options
    const options = {
      force: args.includes('--force'),
      interactive: !args.includes('--yes'),
      pattern: args.find(arg => arg.startsWith('--pattern='))?.split('=')[1]
    };
    
    // Get refresh module
    const refresh = require('../lib/refresh');
    
    // Run refresh
    refresh.refreshTemplates(options)
      .then(result => {
        if (!result.success) {
          console.error(`❌ Refresh failed: ${result.error || 'Unknown error'}`);
          process.exit(1);
        }
        process.exit(0);
      })
      .catch(err => {
        console.error(`❌ Error during refresh: ${err.message}`);
        process.exit(1);
      });
  } catch (err) {
    console.error(`❌ Failed to run refresh: ${err.message}`);
    process.exit(1);
  }
}

// Utility function to run the refresh-profiles command
function runRefreshProfiles(args) {
  try {
    // Get refresh module
    const refresh = require('../lib/refresh');
    
    // Run profile refresh
    refresh.refreshRepomixProfiles()
      .then(result => {
        if (!result.success) {
          console.error(`❌ Profile refresh failed: ${result.error || 'Unknown error'}`);
          process.exit(1);
        }
        process.exit(0);
      })
      .catch(err => {
        console.error(`❌ Error refreshing profiles: ${err.message}`);
        process.exit(1);
      });
  } catch (err) {
    console.error(`❌ Failed to refresh profiles: ${err.message}`);
    process.exit(1);
  }
}

// Utility function to load the config file
function loadConfig() {
  try {
    return configManager.getConfig();
  } catch (err) {
    console.error(`❌ Error loading config: ${err.message}`);
    return {};
  }
}

// Utility function to convert kebab-case to camelCase
function camelCase(str) {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

// Helper function to find the closest valid command
function findClosestCommand(input) {
  const closest = validCommands.reduce((a, b) => {
    const distanceA = levenshteinDistance(a, input);
    const distanceB = levenshteinDistance(b, input);
    return distanceA < distanceB ? a : b;
  });
  return closest;
}

// Helper function to calculate levenshtein distance
function levenshteinDistance(a, b) {
  const matrix = [];

  // Initialize the matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1) // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
} 