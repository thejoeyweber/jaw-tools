#!/usr/bin/env node

/**
 * Sequential Command Runner
 * 
 * Runs a sequence of commands defined in the configuration.
 */

const path = require('path');
const fs = require('fs');
const { runCommand } = require('../src/utils');

/**
 * Lists all available sequences from the configuration
 * @param {Object} config Configuration object
 */
function listSequences(config) {
  const sequences = config?.workflow?.sequences || {};
  const defaultSequence = config?.workflow?.defaultSequence || 'default';
  
  console.log('\n🔄 Available command sequences:');
  console.log('=============================');
  
  if (Object.keys(sequences).length === 0) {
    console.log('No sequences defined in configuration.');
    console.log('Add sequences to the workflow.sequences object in jaw-tools.config.js');
    return;
  }
  
  for (const [name, commands] of Object.entries(sequences)) {
    const isDefault = name === defaultSequence;
    console.log(`${isDefault ? '* ' : '  '}${name}${isDefault ? ' (default)' : ''}:`);
    
    if (!commands || commands.length === 0) {
      console.log('    (Empty sequence)');
    } else {
      commands.forEach(([cmd, args], i) => {
        console.log(`    ${i + 1}. ${cmd} ${args.join(' ')}`);
      });
    }
    console.log();
  }
  
  console.log(`Run a sequence with: npx jaw-tools workflow <sequence-name>`);
  console.log(`Omit sequence name to run the default sequence: "${defaultSequence}"`);
}

/**
 * Runs a sequence of commands
 * @param {Object} config Configuration object
 * @param {string} sequenceName Name of the sequence to run
 * @returns {Promise<boolean>} Whether the sequence ran successfully
 */
async function runSequence(config, sequenceName) {
  const sequences = config?.workflow?.sequences || {};
  const defaultSequence = config?.workflow?.defaultSequence || 'default';
  
  // If no sequence name provided, use default
  const targetSequence = sequenceName || defaultSequence;
  
  // Check if the specified sequence exists
  if (!sequences[targetSequence]) {
    console.error(`❌ Sequence "${targetSequence}" not found in configuration.`);
    console.log('Available sequences:');
    Object.keys(sequences).forEach(name => console.log(`- ${name}${name === defaultSequence ? ' (default)' : ''}`));
    return false;
  }
  
  const commands = sequences[targetSequence];
  
  if (!commands || commands.length === 0) {
    console.error(`❌ No commands defined in sequence "${targetSequence}".`);
    return false;
  }
  
  // Display the plan
  console.log(`\n🚀 Running command sequence: ${targetSequence}`);
  console.log('============================');
  console.log('Will run these commands in sequence:');
  commands.forEach(([cmd, args], i) => {
    console.log(`${i + 1}. ${cmd} ${args.join(' ')}`);
  });
  
  // Run commands in sequence
  for (let i = 0; i < commands.length; i++) {
    try {
      await runCommand(commands[i], i);
    } catch (err) {
      console.error(`\n❌ Error in command ${i + 1}: ${err.message}`);
      
      const shouldContinue = process.argv.includes('--continue-on-error');
      if (!shouldContinue) {
        console.error('Stopping execution. Use --continue-on-error to proceed despite errors.');
        return false;
      } else {
        console.warn('Continuing to next command due to --continue-on-error flag.');
      }
    }
  }
  
  console.log('\n✅ All steps completed!');
  return true;
}

// Try to load configuration
let config;
try {
  const configManager = require('../src/config-manager');
  config = configManager.getConfig();
} catch (err) {
  // Fallback to basic config
  config = {
    workflow: {
      sequences: {
        'default': [
          ['repomix-profile', ['run', 'full-codebase']]
        ]
      },
      defaultSequence: 'default'
    }
  };
}

module.exports = {
  listSequences,
  runSequence
}; 