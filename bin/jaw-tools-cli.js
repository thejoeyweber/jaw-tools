#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const [,, command, ...args] = process.argv;

// Path to the setup script
const setupPath = path.join(__dirname, '..', 'setup.js');

// Initialize if not already done
const projectRoot = process.cwd();
const configPath = path.join(projectRoot, 'jaw-tools.config.js');
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
  const setup = spawn('node', [setupPath], { stdio: 'inherit' });
  setup.on('close', code => process.exit(code));
}

function runRepomixCommand(args) {
  // Check if profiles-manager.js exists in the project
  const config = require(configPath);
  const repoProfilesDir = path.join(projectRoot, config.directories?.repomixProfiles || '.repomix-profiles');
  const profileManagerPath = path.join(repoProfilesDir, 'profiles-manager.js');
  
  // If it doesn't exist, copy our version
  if (!fs.existsSync(profileManagerPath)) {
    const sourceProfileManager = path.join(__dirname, '..', 'lib', 'profiles-manager.js');
    if (!fs.existsSync(repoProfilesDir)) {
      fs.mkdirSync(repoProfilesDir, { recursive: true });
    }
    fs.copyFileSync(sourceProfileManager, profileManagerPath);
    console.log(`✅ Created profiles-manager.js in ${repoProfilesDir}`);
  }
  
  const profileMgr = spawn('node', [profileManagerPath, ...args], { 
    stdio: 'inherit', 
    shell: true 
  });
  profileMgr.on('close', code => process.exit(code));
}

function runCompilePrompt(args) {
  const compilePromptPath = path.join(__dirname, '..', 'lib', 'compile-prompt.js');
  const compiler = spawn('node', [compilePromptPath, ...args], { 
    stdio: 'inherit', 
    shell: true 
  });
  compiler.on('close', code => process.exit(code));
}

function runNextGen() {
  const nextGenPath = path.join(__dirname, '..', 'lib', 'next-gen.js');
  const nextGen = spawn('node', [nextGenPath], { 
    stdio: 'inherit', 
    shell: true 
  });
  nextGen.on('close', code => process.exit(code));
}

function showVersion() {
  const packageJson = require(path.join(__dirname, '..', 'package.json'));
  console.log(`jaw-tools v${packageJson.version}`);
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