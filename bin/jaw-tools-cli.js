#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Normalize path for cross-platform compatibility
function normalizePath(...pathSegments) {
  return path.normalize(path.join(...pathSegments));
}

// Parse command line arguments
const [,, command, ...args] = process.argv;

// Path to the setup script
const setupPath = normalizePath(__dirname, '..', 'setup.js');

// Initialize if not already done
const projectRoot = process.cwd();
const configPath = normalizePath(projectRoot, 'jaw-tools.config.js');
if (!fs.existsSync(configPath) && command !== 'init' && command !== 'setup' && command !== 'help' && command !== 'h' && command !== 'version' && command !== 'v') {
  console.log('⚠️ jaw-tools configuration not found. Running setup...');
  runSetup();
  return;
}

// Main command switch
switch (command) {
  case 'init':
  case 'setup':
    runSetup();
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
    
  case 'next-gen':
  case 'seq':
  case 'n':
    runNextGen();
    break;
    
  case 'mini-prd':
  case 'mprd':
    runMiniPrdCommand(args);
    break;
    
  case 'version':
  case 'v':
    showVersion();
    break;
    
  case 'help':
  case 'h':
  default:
    showHelp();
    break;
}

// Helper Functions
function runSetup() {
  try {
    if (!fs.existsSync(setupPath)) {
      console.error(`❌ Setup script not found at: ${setupPath}`);
      process.exit(1);
    }
    
    const setup = spawn('node', [setupPath], { stdio: 'inherit' });
    setup.on('error', err => {
      console.error(`❌ Error running setup: ${err.message}`);
      process.exit(1);
    });
    setup.on('close', code => process.exit(code || 0));
  } catch (err) {
    console.error(`❌ Failed to run setup: ${err.message}`);
    process.exit(1);
  }
}

function runRepomixCommand(args) {
  try {
    // Check if config exists
    let config;
    try {
      config = require(configPath);
    } catch (err) {
      console.error(`❌ Error loading config: ${err.message}`);
      console.log('⚠️ Using default config instead.');
      config = { directories: { repomixProfiles: '.repomix-profiles' } };
    }
    
    // Check if profiles-manager.js exists in the project
    const repoProfilesDir = normalizePath(projectRoot, config.directories?.repomixProfiles || '.repomix-profiles');
    const profileManagerPath = normalizePath(repoProfilesDir, 'profiles-manager.js');
    
    // If it doesn't exist, copy our version
    if (!fs.existsSync(profileManagerPath)) {
      const sourceProfileManager = normalizePath(__dirname, '..', 'lib', 'profiles-manager.js');
      if (!fs.existsSync(sourceProfileManager)) {
        console.error(`❌ Source profile manager not found at: ${sourceProfileManager}`);
        process.exit(1);
      }
      
      try {
        if (!fs.existsSync(repoProfilesDir)) {
          fs.mkdirSync(repoProfilesDir, { recursive: true });
        }
        fs.copyFileSync(sourceProfileManager, profileManagerPath);
        console.log(`✅ Created profiles-manager.js in ${repoProfilesDir}`);
      } catch (err) {
        console.error(`❌ Error copying profile manager: ${err.message}`);
        process.exit(1);
      }
    }
    
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
          console.log(`📝 Markdown file: _docs/mini-prds/${filename}`);
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
        
      case 'sync':
        try {
          const result = manager.syncFromMarkdown();
          console.log(`✅ Synced Mini-PRDs from markdown files`);
          console.log(`📊 Created: ${result.created}, Updated: ${result.updated}`);
        } catch (err) {
          console.error(`❌ Error syncing Mini-PRDs: ${err.message}`);
          process.exit(1);
        }
        break;
        
      case 'status':
        // Check for PRD ID
        const statusId = subArgs[0];
        if (!statusId) {
          console.error('❌ Error: Mini-PRD ID is required');
          process.exit(1);
        }
        
        try {
          const status = manager.checkFileStatus(statusId);
          const prd = manager.getPrd(statusId);
          
          console.log(`\nMini-PRD ${statusId}: ${prd.description}`);
          console.log(`--------------------------`);
          console.log(`Matching Files: ${status.existingFiles.length + status.plannedFiles.length} total (${status.existingFiles.length} existing, ${status.plannedFiles.length} planned)\n`);
          
          if (status.existingFiles.length > 0) {
            console.log(`Existing Files:`);
            status.existingFiles.forEach(file => {
              console.log(`✓ ${file}`);
            });
            console.log('');
          }
          
          if (status.plannedFiles.length > 0) {
            console.log(`Planned Files:`);
            status.plannedFiles.forEach(({ file, exists }) => {
              console.log(`${exists ? '✓' : '✗'} ${file} - ${exists ? 'CREATED' : 'NOT CREATED'}`);
            });
          }
        } catch (err) {
          console.error(`❌ Error checking file status: ${err.message}`);
          process.exit(1);
        }
        break;
        
      case 'history':
        // Check for PRD ID
        const historyId = subArgs[0];
        if (!historyId) {
          console.error('❌ Error: Mini-PRD ID is required');
          process.exit(1);
        }
        
        try {
          const history = manager.getHistory(historyId);
          const prd = manager.getPrd(historyId);
          
          console.log(`\nMini-PRD ${historyId}: ${prd.description}`);
          console.log(`--------------------------`);
          console.log(`Version History: ${history.length} versions\n`);
          
          history.forEach((version, i) => {
            const date = new Date(version.timestamp).toLocaleString();
            console.log(`[${i}] ${date}${version.isCurrent ? ' (current)' : ''}`);
            console.log(`  Includes: ${version.includes.join(', ')}`);
            console.log(`  Excludes: ${version.excludes.join(', ') || 'none'}`);
            console.log(`  Planned Files: ${version.plannedFiles.length} files`);
            console.log('');
          });
        } catch (err) {
          console.error(`❌ Error retrieving history: ${err.message}`);
          process.exit(1);
        }
        break;
        
      case 'list':
      default:
        try {
          const prds = manager.getAllPrds();
          
          if (prds.length === 0) {
            console.log('No Mini-PRDs found. Create one with:');
            console.log('  npx jaw-tools mini-prd create "Feature Name"');
            break;
          }
          
          console.log('\n📋 Mini-PRDs:');
          console.log('=============');
          
          prds.forEach(prd => {
            console.log(`\n[${prd.id}] ${prd.description}`);
            console.log(`  - Created: ${new Date(prd.createdAt).toLocaleDateString()}`);
            console.log(`  - Files: ${prd.includes.join(', ')}`);
            console.log(`  - Planned: ${prd.plannedFiles.length} files`);
          });
          
          console.log('\nCommands:');
          console.log('  npx jaw-tools mini-prd create "Feature Name"  - Create a new Mini-PRD');
          console.log('  npx jaw-tools mini-prd update <id> --add "<patterns>"  - Update a Mini-PRD');
          console.log('  npx jaw-tools mini-prd snapshot <id>  - Generate a snapshot');
          console.log('  npx jaw-tools mini-prd status <id>  - Check file status');
          console.log('  npx jaw-tools mini-prd history <id>  - View change history');
        } catch (err) {
          console.error(`❌ Error listing Mini-PRDs: ${err.message}`);
          process.exit(1);
        }
        break;
    }
  } catch (err) {
    console.error(`❌ Error in mini-prd command: ${err.message}`);
    process.exit(1);
  }
}

function runCompilePrompt(args) {
  try {
    const compilePromptPath = normalizePath(__dirname, '..', 'lib', 'compile-prompt.js');
    if (!fs.existsSync(compilePromptPath)) {
      console.error(`❌ Compile prompt script not found at: ${compilePromptPath}`);
      process.exit(1);
    }
    
    const compiler = spawn('node', [compilePromptPath, ...args], { 
      stdio: 'inherit', 
      shell: true 
    });
    compiler.on('error', err => {
      console.error(`❌ Error running compile prompt: ${err.message}`);
      process.exit(1);
    });
    compiler.on('close', code => process.exit(code || 0));
  } catch (err) {
    console.error(`❌ Error in compile prompt command: ${err.message}`);
    process.exit(1);
  }
}

function runNextGen() {
  try {
    const nextGenPath = normalizePath(__dirname, '..', 'lib', 'next-gen.js');
    if (!fs.existsSync(nextGenPath)) {
      console.error(`❌ Next-gen script not found at: ${nextGenPath}`);
      process.exit(1);
    }
    
    const nextGen = spawn('node', [nextGenPath], { 
      stdio: 'inherit', 
      shell: true 
    });
    nextGen.on('error', err => {
      console.error(`❌ Error running next-gen: ${err.message}`);
      process.exit(1);
    });
    nextGen.on('close', code => process.exit(code || 0));
  } catch (err) {
    console.error(`❌ Error in next-gen command: ${err.message}`);
    process.exit(1);
  }
}

function showVersion() {
  try {
    const packageJsonPath = normalizePath(__dirname, '..', 'package.json');
    const packageJson = require(packageJsonPath);
    console.log(`jaw-tools v${packageJson.version}`);
  } catch (err) {
    console.error(`❌ Error showing version: ${err.message}`);
    console.log('jaw-tools v1.0.0'); // Fallback version
  }
}

function showHelp() {
  console.log(`
🛠️ jaw-tools - AI Development Utilities

Usage:
  jaw-tools <command> [options]

Commands:
  init, setup               Setup jaw-tools in your project
  repomix, profile, r       Manage and run Repomix profiles
  compile, c <template>     Compile a prompt template
  next-gen, seq, n          Run the sequence of commands
  mini-prd, mprd            Manage mini-PRDs for feature slices
  version, v                Show version
  help, h                   Show this help message

Examples:
  jaw-tools setup
  jaw-tools repomix list
  jaw-tools repomix run full-codebase
  jaw-tools compile _docs/prompts/example.md
  jaw-tools next-gen
  jaw-tools mini-prd create "Feature Name"
  jaw-tools mini-prd snapshot 001

Documentation:
  https://github.com/thejoeyweber/jaw-tools
`);
} 