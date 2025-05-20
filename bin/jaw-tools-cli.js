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
  version, v                Show version
  help, h                   Show this help message

Examples:
  jaw-tools setup
  jaw-tools repomix list
  jaw-tools repomix run full-codebase
  jaw-tools compile _docs/prompts/example.md
  jaw-tools next-gen

Documentation:
  https://github.com/thejoeyweber/jaw-tools
`);
} 