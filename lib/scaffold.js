/**
 * Project Scaffolding Module
 * 
 * Handles scaffolding of standard project files and directories
 * Provides interactive conflict resolution when target files exist
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
const { 
  ensureDir, 
  resolveFileConflict, 
  getRenameSuffix, 
  createInterface 
} = require('../src/utils');

/**
 * Recursively copy files from source to destination
 * @param {string} source Source directory
 * @param {string} destination Destination directory
 * @param {boolean} force Whether to force overwrite
 * @param {readline.Interface} rl Readline interface
 * @returns {Promise<Object>} Result with counts and aborted status
 */
async function copyFilesRecursively(source, destination, force, rl) {
  const result = {
    filesProcessed: 0,
    filesCopied: 0,
    filesSkipped: 0,
    filesRenamed: 0,
    aborted: false
  };

  // Create the destination directory if it doesn't exist
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  // Get all items in the source directory
  const items = fs.readdirSync(source);

  for (const item of items) {
    if (result.aborted) break;

    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    
    const stats = fs.statSync(sourcePath);
    
    if (stats.isDirectory()) {
      // For directories, recursively copy contents
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      
      const subResult = await copyFilesRecursively(sourcePath, destPath, force, rl);
      
      // Update counts
      result.filesProcessed += subResult.filesProcessed;
      result.filesCopied += subResult.filesCopied;
      result.filesSkipped += subResult.filesSkipped;
      result.filesRenamed += subResult.filesRenamed;
      
      if (subResult.aborted) {
        result.aborted = true;
        break;
      }
    } else {
      // For files, handle conflict resolution
      result.filesProcessed++;
      
      if (fs.existsSync(destPath)) {
        if (force) {
          // Force mode: overwrite without asking
          fs.copyFileSync(sourcePath, destPath);
          result.filesCopied++;
          console.log(`Overwritten: ${path.relative(process.cwd(), destPath)}`);
        } else {
          // Interactive mode: ask for resolution
          const action = await resolveFileConflict(destPath, rl);
          
          if (action === 'skip') {
            console.log(`Skipped: ${path.relative(process.cwd(), destPath)}`);
            result.filesSkipped++;
          } else if (action === 'overwrite') {
            fs.copyFileSync(sourcePath, destPath);
            result.filesCopied++;
            console.log(`Overwritten: ${path.relative(process.cwd(), destPath)}`);
          } else if (action === 'rename') {
            // Get the new name for the existing file
            const newPath = await getRenameSuffix(destPath, rl);
            
            // First, rename the existing file
            fs.renameSync(destPath, newPath);
            
            // Then copy the source file to the original destination
            fs.copyFileSync(sourcePath, destPath);
            
            result.filesRenamed++;
            result.filesCopied++;
            console.log(`Renamed existing to: ${path.relative(process.cwd(), newPath)}`);
            console.log(`Created new: ${path.relative(process.cwd(), destPath)}`);
          } else if (action === 'abort') {
            console.log('Scaffolding aborted by user.');
            result.aborted = true;
            break;
          }
        }
      } else {
        // No conflict, simply copy
        fs.copyFileSync(sourcePath, destPath);
        result.filesCopied++;
        console.log(`Created: ${path.relative(process.cwd(), destPath)}`);
      }
    }
  }
  
  return result;
}

/**
 * Scaffold files from templates to project
 * @param {Object} config jaw-tools configuration
 * @param {boolean} force Whether to force overwrite existing files
 * @returns {Promise<Object>} Result object
 */
async function scaffold(config, force = false) {
  const packageDir = path.dirname(path.dirname(__filename)); // jaw-tools package root
  const projectRoot = process.cwd(); // User's project root
  
  const scaffoldSourceRoot = path.join(packageDir, 'templates', 'scaffold_root');
  const scaffoldTargetRoot = path.join(projectRoot, config.projectScaffolding?.scaffoldTargetRootDir || '.');
  
  const userGuideSource = path.join(packageDir, 'templates', 'README.md');
  const userGuideDestDir = path.join(
    projectRoot, 
    config.directories?.docs || '_docs'
  );
  const userGuideDestFile = path.join(
    userGuideDestDir, 
    config.projectScaffolding?.userGuide?.destinationFileName || 'jaw-tools-guide.md'
  );
  
  console.log(`\n🚀 Scaffolding project files...`);
  console.log(`From: ${scaffoldSourceRoot}`);
  console.log(`To: ${scaffoldTargetRoot}`);
  
  // Check if source directory exists
  if (!fs.existsSync(scaffoldSourceRoot)) {
    console.error(`❌ Scaffold source directory not found: ${scaffoldSourceRoot}`);
    console.error(`This directory should contain template files for scaffolding your project.`);
    console.error(`Please run "npx jaw-tools doctor" to diagnose this issue.`);
    return { success: false, error: 'Source directory not found' };
  }
  
  // Create readline interface for interactive mode
  const rl = force ? null : createInterface();
  
  try {
    // Copy scaffold_root contents to target
    const result = await copyFilesRecursively(
      scaffoldSourceRoot, 
      scaffoldTargetRoot, 
      force, 
      rl
    );
    
    // If aborted, return early
    if (result.aborted) {
      if (rl) rl.close();
      return { 
        success: false, 
        error: 'Aborted by user',
        ...result
      };
    }
    
    // Copy user guide if it exists
    if (fs.existsSync(userGuideSource)) {
      // Ensure docs directory exists
      ensureDir(userGuideDestDir);
      
      // Handle user guide copy with conflict resolution
      if (fs.existsSync(userGuideDestFile)) {
        if (force) {
          fs.copyFileSync(userGuideSource, userGuideDestFile);
          console.log(`\n✅ Overwritten user guide: ${path.relative(projectRoot, userGuideDestFile)}`);
          result.filesCopied++;
        } else {
          const action = await resolveFileConflict(userGuideDestFile, rl);
          
          if (action === 'skip') {
            console.log(`\n✅ Skipped user guide: ${path.relative(projectRoot, userGuideDestFile)}`);
            result.filesSkipped++;
          } else if (action === 'overwrite') {
            fs.copyFileSync(userGuideSource, userGuideDestFile);
            console.log(`\n✅ Overwritten user guide: ${path.relative(projectRoot, userGuideDestFile)}`);
            result.filesCopied++;
          } else if (action === 'rename') {
            const newPath = await getRenameSuffix(userGuideDestFile, rl);
            
            // First, rename the existing file
            fs.renameSync(userGuideDestFile, newPath);
            
            // Then copy the source file to the original destination
            fs.copyFileSync(userGuideSource, userGuideDestFile);
            
            console.log(`\n✅ Renamed existing user guide to: ${path.relative(projectRoot, newPath)}`);
            console.log(`Created new user guide: ${path.relative(projectRoot, userGuideDestFile)}`);
            result.filesRenamed++;
            result.filesCopied++;
          } else if (action === 'abort') {
            console.log('\n❌ User guide copy aborted by user.');
            if (rl) rl.close();
            return { 
              success: false, 
              error: 'Aborted by user during user guide copy',
              ...result
            };
          }
        }
      } else {
        fs.copyFileSync(userGuideSource, userGuideDestFile);
        console.log(`\n✅ Created user guide: ${path.relative(projectRoot, userGuideDestFile)}`);
        result.filesCopied++;
      }
    }
    
    // Print summary
    console.log('\n📊 Scaffolding Summary:');
    console.log(`Files processed: ${result.filesProcessed + 1}`); // +1 for user guide
    console.log(`Files created/copied: ${result.filesCopied}`);
    console.log(`Files skipped: ${result.filesSkipped}`);
    console.log(`Files renamed: ${result.filesRenamed}`);
    console.log('\n✅ Scaffolding complete!');
    
    if (rl) rl.close();
    return { 
      success: true,
      ...result
    };
  } catch (err) {
    console.error(`\n❌ Error during scaffolding: ${err.message}`);
    if (rl) rl.close();
    return { 
      success: false, 
      error: err.message
    };
  }
}

module.exports = { scaffold }; 