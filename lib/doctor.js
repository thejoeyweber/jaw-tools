/**
 * jaw-tools Doctor
 * 
 * Checks the status of the jaw-tools setup and provides diagnostics
 */

const fs = require('fs');
const path = require('path');
const { checkCommandAvailability } = require('../src/utils');

/**
 * Checks if a directory exists and returns a status
 * @param {string} dir Directory path
 * @returns {Object} Status object with exists property and message
 */
function checkDirectory(dir) {
  const exists = fs.existsSync(dir);
  return {
    exists,
    message: exists ? `✅ Directory exists: ${dir}` : `❌ Directory not found: ${dir}`
  };
}

/**
 * Checks if a file exists and returns a status
 * @param {string} filePath File path
 * @returns {Object} Status object with exists property and message
 */
function checkFile(filePath) {
  const exists = fs.existsSync(filePath);
  return {
    exists,
    message: exists ? `✅ File exists: ${filePath}` : `❌ File not found: ${filePath}`
  };
}

/**
 * Run all diagnostic checks
 * @returns {Promise<Object>} Results of all checks
 */
async function runDiagnostics() {
  const projectRoot = process.cwd();
  const results = {
    config: { exists: false },
    directories: {},
    repomix: { available: false },
    profilesManager: { exists: false },
    overall: false
  };
  
  console.log('🩺 Running jaw-tools diagnostic checks...\n');
  
  // Check if config exists
  const configPath = path.join(projectRoot, 'jaw-tools.config.js');
  results.config = checkFile(configPath);
  console.log(results.config.message);
  
  // If config doesn't exist, can't check further directory-related items
  if (!results.config.exists) {
    console.log('❌ Cannot check directories: jaw-tools.config.js not found');
    console.log('\n❌ Overall health check failed. Run "npx jaw-tools setup" to fix.');
    return results;
  }
  
  // Load config
  try {
    const config = require(configPath);
    
    // Check directories
    const directoryKeys = Object.keys(config.directories || {});
    if (directoryKeys.length === 0) {
      console.log('⚠️ No directories configured in jaw-tools.config.js');
    } else {
      console.log('\n📁 Checking configured directories:');
      for (const key of directoryKeys) {
        if (key === 'miniPrdTemplatePath') continue; // Skip file path configs
        
        const dirPath = path.join(projectRoot, config.directories[key]);
        results.directories[key] = checkDirectory(dirPath);
        console.log(results.directories[key].message);
      }
    }
    
    // Check for repomix profiles directory and profiles-manager.js
    const repomixProfilesDir = path.join(
      projectRoot, 
      config.directories?.repomixProfiles || '.repomix-profiles'
    );
    const profilesManagerPath = path.join(repomixProfilesDir, 'profiles-manager.js');
    
    results.profilesManager = checkFile(profilesManagerPath);
    console.log('\n🔍 Checking repomix integration:');
    console.log(results.profilesManager.message);
    
    // Check if repomix is accessible
    results.repomix.available = await checkCommandAvailability('npx repomix --version');
    results.repomix.message = results.repomix.available 
      ? '✅ repomix is accessible via npx'
      : '❌ repomix is not accessible. Install with: npm install repomix';
    
    console.log(results.repomix.message);
  } catch (err) {
    console.error(`❌ Error loading config: ${err.message}`);
    results.configError = err.message;
  }
  
  // Overall health assessment
  const requiredPassing = [
    results.config.exists,
    Object.values(results.directories).some(d => d.exists),
    results.profilesManager.exists,
    results.repomix.available
  ];
  
  results.overall = requiredPassing.every(Boolean);
  
  console.log('\n📊 Overall health assessment:');
  if (results.overall) {
    console.log('✅ jaw-tools is properly set up and ready to use!');
  } else {
    console.log('⚠️ Some issues were detected. See recommendations below:');
    
    if (!results.config.exists) {
      console.log('- Run "npx jaw-tools setup" to create configuration');
    }
    
    if (Object.values(results.directories).some(d => !d.exists)) {
      console.log('- Run "npx jaw-tools scaffold" to create missing directories');
    }
    
    if (!results.profilesManager.exists) {
      console.log('- Run "npx jaw-tools repomix list" to initialize profiles-manager.js');
    }
    
    if (!results.repomix.available) {
      console.log('- Run "npm install repomix" to install the repomix package');
    }
  }
  
  return results;
}

module.exports = { 
  runDiagnostics 
}; 