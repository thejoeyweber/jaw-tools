#!/usr/bin/env node
'use strict';

/**
 * Repomix Profile Manager
 * 
 * A tool to manage profiles for generating different views of the codebase
 * for AI analysis using repomix.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { execSync } = require('child_process');

// Helper function to get token count
function getTokenCount(file) {
  try {
    const stats = fs.statSync(file);
    const fileSizeInKB = stats.size / 1024;
    return Math.round(fileSizeInKB * 0.6 * 1024); // Rough estimate: ~0.6 tokens per byte
  } catch (err) {
    return "Error getting token count";
  }
}

// Try to load configuration
let config;
try {
  const configManager = require('../src/config-manager');
  config = configManager.getConfig();
} catch (err) {
  config = {
    directories: {
      repomixProfiles: '.repomix-profiles'
    },
    repomix: {
      defaultProfiles: {
        'full-codebase': {
          include: '**',
          ignore: '.git/**,node_modules/**,.next/**,out/**,build/**,coverage/**,package-lock.json,yarn.lock,pnpm-lock.yaml,**/*.min.js,**/*.min.css,**/dist/**,**/*.map',
          style: 'xml',
          compress: false
        }
      }
    }
  };
}

// Constants
const PROFILES_DIR = path.resolve(process.cwd(), config.directories.repomixProfiles || '.repomix-profiles');
const PROFILES_FILE = path.join(PROFILES_DIR, 'profiles.json');
const OUTPUT_DIR = path.join(PROFILES_DIR, 'outputs');

// Create directories if they don't exist
if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Initialize or load profiles
let profiles = {};
if (fs.existsSync(PROFILES_FILE)) {
  try {
    profiles = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
  } catch (err) {
    console.error(`Error reading profiles file: ${err.message}`);
    // Create an empty file if it doesn't exist or is invalid
    fs.writeFileSync(PROFILES_FILE, '{}', 'utf8');
  }
} else {
  // Load default profiles from config if available
  if (config.repomix && config.repomix.defaultProfiles) {
    profiles = { ...config.repomix.defaultProfiles };
    // Save default profiles to profiles.json
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf8');
    console.log('✅ Created profiles.json with default profiles from configuration');
  } else {
    // Create empty profiles file
    fs.writeFileSync(PROFILES_FILE, '{}', 'utf8');
  }
}

// Parse command line arguments
const command = process.argv[2];
const profileName = process.argv[3];

// List available profiles
if (command === 'list') {
  console.log('\n🔍 Available repomix profiles:');
  console.log('============================');
  
  if (Object.keys(profiles).length === 0) {
    console.log('No profiles found. Add a profile with: jaw-tools repomix add <profile-name>');
    // process.exit(0); // Let script exit normally
    return; // Explicitly return to end execution for this command
  }
  
  Object.keys(profiles).forEach(name => {
    const profile = profiles[name];
    const outputPath = path.join(OUTPUT_DIR, `${name}.xml`);
    const tokenCount = fs.existsSync(outputPath) ? `(~${getTokenCount(outputPath)} tokens)` : '';
    
    console.log(`\n📋 ${name}`);
    console.log('  - Include: ' + (profile.include || '(all files)'));
    console.log('  - Ignore: ' + (profile.ignore || '(none)'));
    console.log('  - Style: ' + (profile.style || 'xml'));
    if (profile.compress) console.log('  - Compression: Enabled');
    if (fs.existsSync(outputPath)) {
      console.log(`  - Output: ${outputPath} ${tokenCount}`);
    }
  });
  console.log('\nRun a profile with: jaw-tools repomix run <profile-name>');
  // process.exit(0); // Let script exit normally
  return; // Explicitly return
}

// Run a profile
if (command === 'run' && profileName) {
  if (!profiles[profileName]) {
    console.error(`❌ Profile "${profileName}" not found`);
    process.exitCode = 1; // Set exit code for error
    return; // Explicitly return
  }
  
  const profile = profiles[profileName];
  const outputFile = `${profileName}.xml`;
  const outputPath = path.join(OUTPUT_DIR, outputFile);
  
  console.log(`\n🚀 Running profile: ${profileName}`);
  console.log('============================');
  
  const args = ['repomix', '--output', outputPath];
  
  if (profile.include) args.push('--include', profile.include);
  if (profile.ignore) args.push('--ignore', profile.ignore);
  if (profile.style) args.push('--style', profile.style);
  if (profile.compress) args.push('--compress');
  
  console.log(`\n📦 Executing: npx ${args.join(' ')}`);
  
  try {
    execSync(`npx ${args.join(' ')}`, { stdio: 'inherit' });
    
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      const fileSizeInKB = Math.round(stats.size / 1024);
      const tokenCount = getTokenCount(outputPath);
      
      console.log(`\n✅ Success! Output saved to: ${outputPath}`);
      console.log(`   File size: ${fileSizeInKB} KB`);
      console.log(`   Estimated tokens: ~${tokenCount}`);
    } else {
      console.error('❌ Failed to generate output file');
    }
  } catch (error) {
    console.error(`\n❌ Error running repomix: ${error.message}`);
    process.exitCode = 1; // Set exit code for error
    return; // Explicitly return
  }
  
  // process.exit(0); // Let script exit normally
  return; // Explicitly return
}

// Add a new profile
if (command === 'add' && profileName) {
  const include = process.argv[4] || '';
  
  // Default ignore patterns to exclude large files
  const defaultIgnore = '.git/**,node_modules/**,.next/**,out/**,build/**,coverage/**,package-lock.json,yarn.lock,pnpm-lock.yaml,**/*.min.js,**/*.min.css,**/dist/**,**/*.map';
  const ignore = process.argv[5] || defaultIgnore;
  
  const style = process.argv[6] || 'xml';
  const compress = process.argv.includes('--compress');
  
  profiles[profileName] = { include, ignore, style, compress };
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
  
  console.log(`\n✅ Profile "${profileName}" added/updated`);
  console.log(`Include patterns: ${include || '(all files)'}`);
  console.log(`Ignore patterns: ${ignore || '(none)'}`);
  console.log(`Style: ${style}`);
  if (compress) console.log('Compression: Enabled');
  
  // process.exit(0); // Let script exit normally
  return; // Explicitly return
}

// Delete a profile
if (command === 'delete' && profileName) {
  if (!profiles[profileName]) {
    console.error(`❌ Profile "${profileName}" not found`);
    process.exitCode = 1; // Set exit code for error
    return; // Explicitly return
  }
  
  delete profiles[profileName];
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
  
  const outputPath = path.join(OUTPUT_DIR, `${profileName}.xml`);
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
    console.log(`\n🗑️ Deleted output file: ${outputPath}`);
  }
  
  console.log(`\n✅ Profile "${profileName}" deleted`);
  // process.exit(0); // Let script exit normally
  return; // Explicitly return
}

// Show help if no valid command is matched by above blocks
console.log('\n🔧 Repomix Profile Manager');
console.log('============================');
console.log('Usage:');
console.log('  list                             - List all profiles');
console.log('  run <profile>                    - Run a specific profile');
console.log('  add <profile> [include] [ignore] [style] [--compress] - Add/update a profile');
console.log('  delete <profile>                 - Delete a profile');
console.log('\nExamples:');
console.log('  jaw-tools repomix add full-codebase');
console.log('  jaw-tools repomix add frontend-only "app/**,components/**" "actions/**,db/**" xml');
console.log('  jaw-tools repomix add core-compact "actions/db/**,db/schema/**,types/**" "" xml --compress');
console.log('  jaw-tools repomix run full-codebase');

// If no command was matched, set exit code to 1 to indicate failure for the parent process.
if (!['list', 'run', 'add', 'delete'].includes(command) || (command === 'run' && !profileName) || (command === 'add' && !profileName) || (command === 'delete' && !profileName) ) {
    process.exitCode = 1;
}
// Script will now exit with 0 if a command ran successfully, or 1 if help was shown due to invalid command or an error occurred.