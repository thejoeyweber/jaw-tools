#!/usr/bin/env node
/**
 * Test script for debugging installation issues
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Register reliable exit message
process.on('exit', () => {
  console.log('\n\n✅ TEST INSTALLATION COMPLETE!\n');
});

// Find the setup.js script
let setupPath;
try {
  // First try to find it in current directory or one level up
  const localPath = path.join(__dirname, 'setup.js');
  const parentPath = path.join(__dirname, '..', 'setup.js');
  
  if (fs.existsSync(localPath)) {
    setupPath = localPath;
  } else if (fs.existsSync(parentPath)) {
    setupPath = parentPath;
  } else {
    // Try to resolve it from node_modules
    setupPath = require.resolve('jaw-tools/setup.js');
  }
} catch (err) {
  console.error('Could not find setup.js script. Make sure jaw-tools is installed.');
  process.exit(1);
}

console.log('🧪 Running test installation of jaw-tools setup...');
console.log(`Using setup script at: ${setupPath}`);

const setupProcess = spawn('node', [setupPath, '--postinstall'], { 
  stdio: 'inherit',
  shell: true
});

setupProcess.on('error', (err) => {
  console.error(`Error running setup: ${err.message}`);
});

setupProcess.on('close', (code) => {
  console.log(`Setup process exited with code ${code}`);
  // Final message will be displayed by exit handler
});

// Display package.json scripts
try {
  const packageJson = require('./package.json');
  console.log('Package scripts:');
  console.log(packageJson.scripts);
} catch (err) {
  console.error(`Error reading package.json: ${err.message}`);
} 