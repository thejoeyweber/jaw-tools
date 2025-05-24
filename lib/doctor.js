/**
 * jaw-tools Doctor
 * 
 * Checks the status of the jaw-tools setup and provides diagnostics
 */

const fs = require('fs');
const path = require('path');
const { checkCommandAvailability } = require('../src/utils');
const VersionRegistry = require('./version-registry');

// Import gray-matter with a fallback
let matter;
try {
  matter = require('gray-matter');
} catch (err) {
  // Simple fallback
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
 * Checks an optional dependency
 * @param {string} moduleName Name of the module
 * @param {string} purpose Description of the module's purpose
 * @returns {Object} Status object
 */
function checkOptionalDependency(moduleName, purpose) {
  try {
    require(moduleName);
    return {
      name: moduleName,
      available: true,
      message: `✅ ${moduleName} is available (${purpose}).`
    };
  } catch (err) {
    return {
      name: moduleName,
      available: false,
      message: `⚠️ ${moduleName} is not available. ${purpose}. Install with: npm install ${moduleName}`
    };
  }
}

/**
 * Walk a directory recursively and process files
 * @param {string} dir Directory to walk
 * @param {Function} callback Function to call for each file
 * @param {string} basePath Base path for relative paths
 */
async function walkDirectory(dir, callback, basePath = dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    try {
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        await walkDirectory(fullPath, callback, basePath);
      } else {
        const relativePath = path.relative(basePath, fullPath);
        await callback(fullPath, relativePath);
      }
    } catch (err) {
      // Skip files that can't be accessed
      continue;
    }
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
    return null;
  }
}

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
 * Check for outdated template files
 * @returns {Promise<Object>} Results of the check
 */
async function checkTemplateVersions() {
  const packageDir = path.dirname(path.dirname(__filename)); // jaw-tools package root
  const projectRoot = process.cwd(); // User's project root
  const scaffoldSourceRoot = path.join(packageDir, 'templates', 'scaffold_root');
  
  // Try to load config
  let config;
  try {
    const configManager = require('../src/config-manager');
    config = configManager.getConfig();
  } catch (err) {
    return {
      checkPerformed: false,
      message: `❌ Could not check template versions: ${err.message}`
    };
  }
  
  const targetRoot = path.join(projectRoot, config.directories?.docs || '_docs');
  
  // Check if source directory exists
  if (!fs.existsSync(scaffoldSourceRoot)) {
    return {
      checkPerformed: false,
      message: '❌ Template source directory not found'
    };
  }
  
  // Initialize version registry
  const registry = new VersionRegistry();
  const outdatedFiles = [];
  
  // Scan for versioned files
  await walkDirectory(scaffoldSourceRoot, async (sourceFile, relativePath) => {
    const targetFile = path.join(targetRoot, relativePath);
    
    if (fs.existsSync(targetFile)) {
      const sourceVersion = extractVersionFromFile(sourceFile);
      
      if (sourceVersion) {
        const targetVersion = extractVersionFromFile(targetFile);
        
        if (!targetVersion || registry.hasNewerVersion(relativePath, sourceVersion)) {
          outdatedFiles.push({
            path: relativePath,
            currentVersion: targetVersion || 'unknown',
            newVersion: sourceVersion
          });
        }
      }
    }
  });
  
  return {
    checkPerformed: true,
    hasOutdatedFiles: outdatedFiles.length > 0,
    outdatedFiles,
    message: outdatedFiles.length > 0 
      ? `⚠️ ${outdatedFiles.length} template files are outdated. Run "npx jaw-tools refresh" to update.` 
      : '✅ All template files are up to date.'
  };
}

/**
 * Run all diagnostic checks
 * @returns {Promise<Object>} Results of all checks
 */
async function runDiagnostics() {
  const projectRoot = process.cwd();
  const packageDir = path.dirname(path.dirname(__filename)); // jaw-tools package root
  
  const results = {
    config: { exists: false },
    directories: {},
    scaffoldRoot: { exists: false },
    repomix: { available: false },
    profilesManager: { exists: false },
    templateVersions: { checkPerformed: false },
    fsExtra: { available: false },
    glob: { available: false },
    overall: false
  };
  
  console.log('🩺 Running jaw-tools diagnostic checks...\n');
  
  // Check if config exists
  const configPath = path.join(projectRoot, 'jaw-tools.config.js');
  results.config = checkFile(configPath);
  console.log(results.config.message);
  
  // Check scaffold_root directory
  const scaffoldRootPath = path.join(packageDir, 'templates', 'scaffold_root');
  results.scaffoldRoot = checkDirectory(scaffoldRootPath);
  console.log('\n📁 Checking scaffold templates:');
  console.log(results.scaffoldRoot.message);
  
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

    // Check optional dependencies
    console.log('\n⚙️ Checking optional dependencies:');
    results.fsExtra = checkOptionalDependency('fs-extra', 'provides advanced file system operations, enhancing robustness and speed of some commands');
    console.log(results.fsExtra.message);
    results.glob = checkOptionalDependency('glob', 'enables powerful file pattern matching for commands like prompt compilation');
    console.log(results.glob.message);
    
    // Check for outdated template files
    results.templateVersions = await checkTemplateVersions();
    if (results.templateVersions.checkPerformed) {
      console.log('\n🔄 Checking template versions:');
      console.log(results.templateVersions.message);
      
      if (results.templateVersions.hasOutdatedFiles) {
        console.log('   Outdated files:');
        results.templateVersions.outdatedFiles.slice(0, 5).forEach(file => {
          console.log(`   - ${file.path} (current: ${file.currentVersion}, new: ${file.newVersion})`);
        });
        
        if (results.templateVersions.outdatedFiles.length > 5) {
          console.log(`   ... and ${results.templateVersions.outdatedFiles.length - 5} more`);
        }
      }
    }
  } catch (err) {
    console.error(`❌ Error loading config: ${err.message}`);
    results.configError = err.message;
  }
  
  // Overall health assessment
  const requiredPassing = [
    results.config.exists,
    Object.values(results.directories).some(d => d.exists),
    results.profilesManager.exists,
    results.repomix.available,
    results.scaffoldRoot.exists
  ];
  
  results.overall = requiredPassing.every(Boolean);
  
  console.log('\n📊 Overall health assessment:');
  if (results.overall) {
    console.log('✅ jaw-tools is properly set up and ready to use!');
    
    if (results.templateVersions.hasOutdatedFiles) {
      console.log('⚠️ Some template files need to be updated. Run "npx jaw-tools refresh" to update them.');
    }
      if (!results.fsExtra.available) {
        console.log(`- Install fs-extra for improved file operations: npm install fs-extra`);
      }
      if (!results.glob.available) {
        console.log(`- Install glob for powerful file pattern matching: npm install glob`);
      }
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
    
    if (!results.scaffoldRoot.exists) {
      console.log('- The scaffold_root directory is missing in jaw-tools templates. This will cause the scaffold command to fail.');
    }
    if (!results.fsExtra.available) {
      console.log(`- Install fs-extra for improved file operations: npm install fs-extra`);
    }
    if (!results.glob.available) {
      console.log(`- Install glob for powerful file pattern matching: npm install glob`);
    }
  }
  
  return results;
}

module.exports = { 
  runDiagnostics 
}; 