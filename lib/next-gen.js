#!/usr/bin/env node

/**
 * Sequential Command Runner
 * 
 * Runs a sequence of commands defined in the configuration.
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

/**
 * Runs a command with proper error handling
 * @param {Array} command Command and args array, e.g. ['node', ['file.js']]
 * @param {number} index Optional index for step numbering
 * @returns {Promise} Promise that resolves when command completes
 */
function runCommand([cmd, args], index) {
  return new Promise((resolve, reject) => {
    const stepNum = typeof index === 'number' ? `[Step ${index + 1}] ` : '';
    console.log(`\n${stepNum}Running: ${cmd} ${args.join(' ')}`);
    
    const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });
    
    proc.on('close', code => {
      if (code !== 0) {
        reject(new Error(`Command failed: ${cmd} ${args.join(' ')}`));
      } else {
        resolve();
      }
    });
  });
}

// Try to load configuration
let config;
try {
  const configManager = require('../src/config-manager');
  config = configManager.getConfig();
} catch (err) {
  config = {
    nextGen: {
      commands: [
        ['repomix-profile', ['run', 'full-codebase']]
      ]
    }
  };
}

// Try to load a project-specific configuration
const projectConfigPath = path.join(process.cwd(), 'next-gen.config.js');
let commands = config.nextGen.commands;

if (fs.existsSync(projectConfigPath)) {
  try {
    // Use the project's custom config if available
    const projectConfig = require(projectConfigPath);
    if (projectConfig.commands && Array.isArray(projectConfig.commands)) {
      commands = projectConfig.commands;
      console.log('Using custom commands from next-gen.config.js');
    }
  } catch (err) {
    console.warn(`Warning: Error loading next-gen.config.js: ${err.message}`);
    console.warn('Falling back to commands from jaw-tools.config.js');
  }
}

if (!commands || commands.length === 0) {
  console.error('No commands defined in configuration.');
  console.log('Please define commands in jaw-tools.config.js or next-gen.config.js');
  process.exit(1);
}

// Display the plan
console.log('\n🚀 Sequential Command Runner');
console.log('============================');
console.log('Will run these commands in sequence:');
commands.forEach(([cmd, args], i) => {
  console.log(`${i + 1}. ${cmd} ${args.join(' ')}`);
});

// Run commands in sequence
(async () => {
  for (let i = 0; i < commands.length; i++) {
    try {
      await runCommand(commands[i], i);
    } catch (err) {
      console.error(`\n❌ Error in command ${i + 1}: ${err.message}`);
      
      const shouldContinue = process.argv.includes('--continue-on-error');
      if (!shouldContinue) {
        console.error('Stopping execution. Use --continue-on-error to proceed despite errors.');
        process.exit(1);
      } else {
        console.warn('Continuing to next command due to --continue-on-error flag.');
      }
    }
  }
  console.log('\n✅ All steps completed!');
})(); 