/**
 * Template Refresh Module
 * 
 * Handles refreshing project files from templates
 * Updates templates based on version information
 */

// Try to use fs-extra but fall back to native fs
let fs;
try {
  fs = require('fs-extra');
} catch (err) {
  console.warn('fs-extra not found, falling back to native fs module');
  fs = require('fs');
  // Add methods to match fs-extra API
  fs.ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  };
  
  fs.copySync = (src, dest) => {
    fs.copyFileSync(src, dest);
  };
}

const path = require('path');
const { createInterface } = require('../src/utils');
const VersionRegistry = require('./version-registry');
let matter;

try {
  matter = require('gray-matter');
} catch (err) {
  console.warn('gray-matter not found, version detection will be limited');
  // Simple fallback for gray-matter
  matter = {
    read: (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
        
        if (match) {
          const frontMatter = match[1];
          const content = match[2];
          
          // Simple YAML parsing for version
          const versionMatch = frontMatter.match(/version:\s*([^\s\n]+)/);
          const version = versionMatch ? versionMatch[1] : null;
          
          return {
            data: { version },
            content
          };
        }
        
        return { data: {}, content };
      } catch (err) {
        return { data: {}, content: '' };
      }
    }
  };
}

/**
 * Walk a directory recursively and process files
 * @param {string} dir Directory to walk
 * @param {Function} callback Function to call for each file
 * @param {string} basePath Base path for relative paths
 */
async function walkDirectory(dir, callback, basePath = dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      await walkDirectory(fullPath, callback, basePath);
    } else {
      const relativePath = path.relative(basePath, fullPath);
      await callback(fullPath, relativePath);
    }
  }
}

/**
 * Ask user for resolution on file conflict
 * @param {string} targetFile Path to target file
 * @param {string} sourceFile Path to source file
 * @param {object} rl Readline interface
 * @returns {string} Resolution action
 */
async function askForResolution(targetFile, sourceFile, rl) {
  const relativeTarget = path.relative(process.cwd(), targetFile);
  
  console.log(`\nFile exists: ${relativeTarget}`);
  console.log('Choose an action:');
  console.log('  [s]kip - Keep existing file');
  console.log('  [o]verwrite - Replace with template version');
  console.log('  [d]iff - Show differences');
  console.log('  [a]ll - Overwrite all conflicts');
  console.log('  [n]one - Skip all conflicts');
  console.log('  [q]uit - Abort refresh');
  
  const answer = await new Promise(resolve => {
    rl.question('Action? [s/o/d/a/n/q]: ', resolve);
  });
  
  const action = answer.toLowerCase().trim();
  
  if (action === 'd') {
    // Show diff
    try {
      const targetContent = fs.readFileSync(targetFile, 'utf8');
      const sourceContent = fs.readFileSync(sourceFile, 'utf8');
      
      console.log('\n--- Current version ---');
      console.log(targetContent);
      console.log('\n--- Template version ---');
      console.log(sourceContent);
      
      // Ask again after showing diff
      return askForResolution(targetFile, sourceFile, rl);
    } catch (err) {
      console.error(`Error showing diff: ${err.message}`);
      return askForResolution(targetFile, sourceFile, rl);
    }
  }
  
  // Return the action
  if (['s', 'o', 'a', 'n', 'q'].includes(action)) {
    return action;
  }
  
  // Default to skip if invalid input
  return 's';
}

/**
 * Copy a file, ensuring the target directory exists
 * @param {string} sourceFile Source file path
 * @param {string} targetFile Target file path
 */
async function copyFile(sourceFile, targetFile) {
  try {
    // Ensure target directory exists
    const targetDir = path.dirname(targetFile);
    fs.ensureDir(targetDir);
    
    // Copy the file
    fs.copySync(sourceFile, targetFile);
    
    console.log(`✅ Updated: ${path.relative(process.cwd(), targetFile)}`);
    return true;
  } catch (err) {
    console.error(`❌ Error copying file: ${err.message}`);
    return false;
  }
}

/**
 * Extract version from a file's front matter
 * @param {string} filePath Path to the file
 * @returns {string|null} Version string or null if not found
 */
function extractVersionFromFile(filePath) {
  try {
    const fileData = matter.read(filePath);
    return fileData.data.version || null;
  } catch (err) {
    console.warn(`⚠️ Error extracting version from ${filePath}: ${err.message}`);
    return null;
  }
}

/**
 * Refresh project templates from package templates
 * @param {object} options Refresh options
 * @returns {Promise<object>} Result object
 */
async function refreshTemplates(options = {}) {
  const packageDir = path.dirname(path.dirname(__filename)); // jaw-tools package root
  const projectRoot = process.cwd(); // User's project root
  
  // Try to load config
  let config;
  try {
    const configManager = require('../src/config-manager');
    config = configManager.getConfig();
  } catch (err) {
    console.error(`❌ Error loading config: ${err.message}`);
    return { success: false, error: err.message };
  }
  
  const scaffoldSourceRoot = path.join(packageDir, 'templates', 'scaffold_root');
  
  // Use the configured docs directory, not the scaffold target root
  // This ensures files are placed in the proper docs directory structure
  const docsDir = path.join(projectRoot, config.directories?.docs || '_docs');
  
  console.log(`\n🔄 Refreshing templates...`);
  console.log(`From: ${scaffoldSourceRoot}`);
  console.log(`To: ${docsDir}`);
  
  // Check if source directory exists
  if (!fs.existsSync(scaffoldSourceRoot)) {
    console.error(`❌ Template source directory not found: ${scaffoldSourceRoot}`);
    console.error(`This directory should contain template files for scaffolding your project.`);
    console.error(`Please run "npx jaw-tools doctor" to diagnose this issue.`);
    return { success: false, error: 'Source directory not found' };
  }
  
  // Initialize version registry
  const registry = new VersionRegistry();
  
  // Result tracking
  const result = {
    filesChecked: 0,
    filesUpdated: 0,
    filesSkipped: 0,
    conflicts: 0,
    success: true
  };
  
  // Interactive mode
  const interactive = options.interactive !== false;
  const rl = interactive ? createInterface() : null;
  let globalAction = null;
  
  // Process files based on pattern
  const pattern = options.pattern || '**';
  const matchesPattern = (filePath) => {
    // Simple pattern matching (could use minimatch in a real implementation)
    if (pattern === '**') return true;
    return filePath.startsWith(pattern.replace(/\*\*\/?/, ''));
  };
  
  try {
    // Walk the scaffold_root directory
    await walkDirectory(scaffoldSourceRoot, async (sourceFile, relativePath) => {
      if (!matchesPattern(relativePath)) {
        return; // Skip files that don't match pattern
      }
      
      result.filesChecked++;
      const targetFile = path.join(docsDir, relativePath);
      
      // Extract version from source file
      const sourceVersion = extractVersionFromFile(sourceFile);
      
      // Check if file exists
      if (!fs.existsSync(targetFile)) {
        // New file - copy it
        await copyFile(sourceFile, targetFile);
        if (sourceVersion) {
          registry.recordVersion(relativePath, sourceVersion);
        }
        result.filesUpdated++;
      } else if (options.force || globalAction === 'a') {
        // Force overwrite
        await copyFile(sourceFile, targetFile);
        if (sourceVersion) {
          registry.recordVersion(relativePath, sourceVersion);
        }
        result.filesUpdated++;
      } else if (globalAction === 'n') {
        // Skip all
        result.filesSkipped++;
      } else if (sourceVersion && registry.hasNewerVersion(relativePath, sourceVersion)) {
        // Newer version available - handle conflict
        result.conflicts++;
        
        if (interactive) {
          const action = await askForResolution(targetFile, sourceFile, rl);
          
          if (action === 'o') {
            // Overwrite
            await copyFile(sourceFile, targetFile);
            registry.recordVersion(relativePath, sourceVersion);
            result.filesUpdated++;
          } else if (action === 'a') {
            // Overwrite all
            globalAction = 'a';
            await copyFile(sourceFile, targetFile);
            registry.recordVersion(relativePath, sourceVersion);
            result.filesUpdated++;
          } else if (action === 'n') {
            // Skip all
            globalAction = 'n';
            result.filesSkipped++;
          } else if (action === 'q') {
            // Abort
            console.log('\n❌ Refresh aborted by user.');
            result.success = false;
            return { ...result, error: 'Aborted by user' };
          } else {
            // Skip this file
            result.filesSkipped++;
          }
        } else {
          // Non-interactive mode - skip conflicts
          result.filesSkipped++;
        }
      } else {
        // Same or older version - skip
        result.filesSkipped++;
      }
    });
    
    // Close readline interface
    if (rl) rl.close();
    
    // Print summary
    console.log('\n📊 Refresh Summary:');
    console.log(`Files checked: ${result.filesChecked}`);
    console.log(`Files updated: ${result.filesUpdated}`);
    console.log(`Files skipped: ${result.filesSkipped}`);
    console.log(`Conflicts encountered: ${result.conflicts}`);
    console.log('\n✅ Refresh complete!');
    
    return result;
  } catch (err) {
    console.error(`\n❌ Error during refresh: ${err.message}`);
    if (rl) rl.close();
    return { 
      ...result,
      success: false, 
      error: err.message
    };
  }
}

/**
 * Refresh Repomix profiles
 * @returns {Promise<object>} Result object
 */
async function refreshRepomixProfiles() {
  try {
    const packageDir = path.dirname(path.dirname(__filename));
    const projectRoot = process.cwd();
    
    // Try to load config
    let config;
    try {
      const configManager = require('../src/config-manager');
      config = configManager.getConfig();
    } catch (err) {
      console.error(`❌ Error loading config: ${err.message}`);
      return { success: false, error: err.message };
    }
    
    // Paths
    const profilesDir = path.join(projectRoot, config.directories?.repomixProfiles || '.repomix-profiles');
    const profilesFile = path.join(profilesDir, 'profiles.json');
    const templateProfilesDir = path.join(packageDir, 'templates', 'scaffold_root', '.repomix-profiles');
    const templateProfilesFile = path.join(templateProfilesDir, 'profiles.json');
    
    console.log('\n🔄 Refreshing repomix profiles...');
    
    // Create profiles directory if it doesn't exist
    if (!fs.existsSync(profilesDir)) {
      fs.ensureDir(profilesDir);
    }
    
    // Load existing profiles
    let existingProfiles = {};
    if (fs.existsSync(profilesFile)) {
      try {
        existingProfiles = JSON.parse(fs.readFileSync(profilesFile, 'utf8'));
      } catch (err) {
        console.warn(`⚠️ Error reading profiles: ${err.message}`);
      }
    }
    
    // Load template profiles
    let templateProfiles = {};
    if (fs.existsSync(templateProfilesFile)) {
      try {
        templateProfiles = JSON.parse(fs.readFileSync(templateProfilesFile, 'utf8'));
      } catch (err) {
        console.warn(`⚠️ Error reading template profiles: ${err.message}`);
      }
    } else {
      // Use default profiles from config
      templateProfiles = config.repomix?.defaultProfiles || {};
    }
    
    // Initialize counters
    const result = {
      total: Object.keys(existingProfiles).length,
      added: 0,
      updated: 0,
      unchanged: 0
    };
    
    // Merge profiles
    const mergedProfiles = { ...existingProfiles };
    
    // For each template profile
    for (const [name, profile] of Object.entries(templateProfiles)) {
      if (!existingProfiles[name]) {
        // New profile
        mergedProfiles[name] = profile;
        console.log(`✅ Added new profile: ${name}`);
        result.added++;
      } else {
        // Existing profile - don't update to preserve customizations
        result.unchanged++;
      }
    }
    
    // Save merged profiles
    fs.writeFileSync(profilesFile, JSON.stringify(mergedProfiles, null, 2));
    
    // Result
    console.log('\n📊 Repomix Profiles Summary:');
    console.log(`Total profiles: ${Object.keys(mergedProfiles).length}`);
    console.log(`New profiles added: ${result.added}`);
    console.log(`Profiles unchanged: ${result.unchanged}`);
    console.log('\n✅ Repomix profiles refresh complete!');
    
    return { success: true, ...result };
  } catch (err) {
    console.error(`❌ Error refreshing repomix profiles: ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = {
  refreshTemplates,
  refreshRepomixProfiles
}; 