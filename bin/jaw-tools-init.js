#!/usr/bin/env node
'use strict';

/**
 * jaw-tools-init.js
 * 
 * A single command to perform complete jaw-tools installation, 
 * including setup, scaffolding, and verification.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Simple way to prompt the user
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

// Run a command and return a promise
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${command} ${args.join(' ')}`);
    
    const proc = spawn(command, args, { 
      stdio: options.silent ? 'ignore' : 'inherit',
      shell: true 
    });
    
    proc.on('close', code => {
      if (code !== 0 && !options.ignoreErrors) {
        reject(new Error(`Command failed with exit code ${code}`));
      } else {
        resolve();
      }
    });
    
    proc.on('error', err => {
      if (!options.ignoreErrors) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Main function
async function init() {
  console.log('\n🛠️  JAW-TOOLS COMPLETE INITIALIZATION\n');
  console.log('This utility will:');
  console.log('1. Set up jaw-tools in your project');
  console.log('2. Scaffold standard documentation files');
  console.log('3. Verify the installation\n');
  
  const shouldContinue = await askQuestion('Do you want to proceed? (Y/n): ');
  if (shouldContinue.toLowerCase() === 'n') {
    console.log('\n🛑 Initialization cancelled.');
    rl.close();
    return;
  }
  
  try {
    // 1. Run setup (jaw-tools setup)
    console.log('\n📋 STEP 1: Running jaw-tools setup');
    await runCommand('npx', ['jaw-tools', 'setup']);
    
    // 2. Scaffold documentation (jaw-tools scaffold)
    console.log('\n📋 STEP 2: Scaffolding documentation');
    const useForce = await askQuestion('Force overwrite of existing files? (y/N): ');
    
    if (useForce.toLowerCase() === 'y') {
      await runCommand('npx', ['jaw-tools', 'scaffold', '--force']);
    } else {
      await runCommand('npx', ['jaw-tools', 'scaffold']);
    }
    
    // 3. Check installation status (jaw-tools doctor)
    console.log('\n📋 STEP 3: Verifying installation');
    await runCommand('npx', ['jaw-tools', 'doctor']);
    
    console.log('\n✅ JAW-TOOLS INITIALIZATION COMPLETE!');
    console.log('Your project is now fully set up and ready to use jaw-tools.');
    console.log('Run "npx jaw-tools help" to see available commands.\n');
    
  } catch (err) {
    console.error(`\n❌ Error during initialization: ${err.message}`);
    console.log('Please try running the steps manually:');
    console.log('1. npx jaw-tools setup');
    console.log('2. npx jaw-tools scaffold');
    console.log('3. npx jaw-tools doctor\n');
  } finally {
    rl.close();
  }
}

// Run the init function
init().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
}); 