#!/usr/bin/env node
'use strict';

/**
 * Unix wrapper for the repomix profile manager
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const configManager = require('../src/config-manager');

// Get configuration
let config;
try {
  config = configManager.getConfig();
} catch (err) {
  config = configManager.defaultConfig;
}

const projectRoot = process.cwd();
const profilesDir = path.join(projectRoot, config.directories.repomixProfiles);
const profilesManagerPath = path.join(profilesDir, 'profiles-manager.js');
const args = process.argv.slice(2);

// Check if profiles-manager.js exists
if (!fs.existsSync(profilesManagerPath)) {
  // Create profiles directory if it doesn't exist
  if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
  }
  
  // Create a basic profiles-manager.js
  const sourceProfileManager = path.join(__dirname, '..', 'lib', 'profiles-manager.js');
  if (fs.existsSync(sourceProfileManager)) {
    fs.copyFileSync(sourceProfileManager, profilesManagerPath);
    console.log(`Created profiles-manager.js in ${profilesDir}`);
  } else {
    console.error(`Error: Could not find profiles-manager.js in ${path.join(__dirname, '..', 'lib')}`);
    process.exit(1);
  }
}

// Forward to the profiles manager
const profileMgr = spawn('node', [profilesManagerPath, ...args], { 
  stdio: 'inherit', 
  shell: true,
  env: { ...process.env, ...config.repomix.env }  // Pass any configured environment variables
});

profileMgr.on('close', code => {
  process.exit(code);
}); 