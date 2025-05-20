#!/usr/bin/env node

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

// Constants
const PROFILES_FILE = path.join(__dirname, '..', 'profiles.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'outputs');

// Create output directory if it doesn't exist
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
}

// Parse command line arguments
const command = process.argv[2];
const profileName = process.argv[3];

// List available profiles
if (command === 'list') {
  console.log('\n🔍 Available repomix profiles:');
  console.log('============================');
  
  if (Object.keys(profiles).length === 0) {
    console.log('No profiles found. Add a profile with: node profiles-manager.js add <profile-name>');
    process.exit(0);
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
  console.log('\nRun a profile with: node profiles-manager.js run <profile-name>');
  process.exit(0);
}

// Run a profile
if (command === 'run' && profileName) {
  if (!profiles[profileName]) {
    console.error(`❌ Profile "${profileName}" not found`);
    process.exit(1);
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
    process.exit(1);
  }
  
  process.exit(0);
}

// Add a new profile
if (command === 'add' && profileName) {
  const include = process.argv[4] || '';
  const ignore = process.argv[5] || '';
  const style = process.argv[6] || 'xml';
  const compress = process.argv.includes('--compress');
  
  profiles[profileName] = { include, ignore, style, compress };
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
  
  console.log(`\n✅ Profile "${profileName}" added/updated`);
  console.log(`Include patterns: ${include || '(all files)'}`);
  console.log(`Ignore patterns: ${ignore || '(none)'}`);
  console.log(`Style: ${style}`);
  if (compress) console.log('Compression: Enabled');
  
  process.exit(0);
}

// Delete a profile
if (command === 'delete' && profileName) {
  if (!profiles[profileName]) {
    console.error(`❌ Profile "${profileName}" not found`);
    process.exit(1);
  }
  
  delete profiles[profileName];
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
  
  const outputPath = path.join(OUTPUT_DIR, `${profileName}.xml`);
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
    console.log(`\n🗑️ Deleted output file: ${outputPath}`);
  }
  
  console.log(`\n✅ Profile "${profileName}" deleted`);
  process.exit(0);
}

// Show help if no valid command
console.log('\n🔧 Repomix Profile Manager');
console.log('============================');
console.log('Usage:');
console.log('  list                             - List all profiles');
console.log('  run <profile>                    - Run a specific profile');
console.log('  add <profile> [include] [ignore] [style] [--compress] - Add/update a profile');
console.log('  delete <profile>                 - Delete a profile');
console.log('\nExamples:');
console.log('  node profiles-manager.js add full-codebase');
console.log('  node profiles-manager.js add frontend-only "app/**,components/**" "actions/**,db/**" xml');
console.log('  node profiles-manager.js add core-compact "actions/db/**,db/schema/**,types/**" "" xml --compress');
console.log('  node profiles-manager.js run full-codebase'); 