/**
 * jaw-tools execution init
 * Initialize execution tracking for a Mini-PRD
 */

const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const matter = require('gray-matter');
const { ensureDir } = require('../../src/utils');

/**
 * Sanitize a string for use as a directory name
 * @param {string} name The string to sanitize
 * @returns {string} Sanitized string safe for use as a directory name
 */
function sanitizeForFileName(name) {
  // Replace characters that are problematic in file/directory names
  return name
    .replace(/[\/\\:*?"<>|]/g, '-') // Replace invalid chars with hyphens
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/--+/g, '-')          // Replace multiple hyphens with single hyphen
    .trim();
}

/**
 * Check if the temp directories pattern is in .gitignore
 * @param {string} projectRoot The project root path
 * @param {string} pattern The pattern to check for
 * @returns {boolean} True if the pattern is found in .gitignore
 */
function checkGitignorePattern(projectRoot, pattern) {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return false;
  }
  
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  const lines = gitignoreContent.split('\n');
  
  return lines.some(line => {
    const trimmedLine = line.trim();
    return trimmedLine === pattern && !trimmedLine.startsWith('#');
  });
}

/**
 * Initialize execution tracking for a Mini-PRD
 * @param {Object} options Command options
 * @param {string} options.prdFile Path to the Mini-PRD file
 * @param {Object} config The jaw-tools configuration
 * @returns {Promise<Object>} Result of the operation
 */
async function initExecution(options, config) {
  try {
    const projectRoot = config.__projectRoot;
    
    if (!options.prdFile) {
      throw new Error('Missing required parameter: --prd-file');
    }
    
    // Resolve the PRD file path (support both absolute and relative paths)
    let prdFilePath = options.prdFile;
    if (!path.isAbsolute(prdFilePath)) {
      prdFilePath = path.resolve(process.cwd(), prdFilePath);
    }
    
    if (!fs.existsSync(prdFilePath)) {
      throw new Error(`PRD file not found: ${prdFilePath}`);
    }
    
    // Read the Mini-PRD file and parse its front-matter
    const prdContent = fs.readFileSync(prdFilePath, 'utf8');
    const { data: frontMatter } = matter(prdContent);
    
    if (!frontMatter.prdId || !frontMatter.name) {
      throw new Error('PRD file must have prdId and name in front-matter');
    }
    
    const prdId = frontMatter.prdId;
    const sanitizedPrdName = sanitizeForFileName(frontMatter.name);
    const executionDirName = `${prdId}-${sanitizedPrdName}`;
    
    // Create the base execution directory
    const baseExecutionDir = path.join(projectRoot, config.executionWorkflow.baseDir);
    const prdExecutionDir = path.join(baseExecutionDir, executionDirName);
    
    console.log(`Creating execution directory: ${path.relative(process.cwd(), prdExecutionDir)}`);
    await fsExtra.ensureDir(prdExecutionDir);
    
    // Create the temporary subdirectories
    const codeSnapshotsDir = path.join(prdExecutionDir, config.executionWorkflow.tempSubDirs.codeSnapshots);
    const compiledPromptsDir = path.join(prdExecutionDir, config.executionWorkflow.tempSubDirs.compiledPrompts);
    
    await fsExtra.ensureDir(codeSnapshotsDir);
    await fsExtra.ensureDir(compiledPromptsDir);
    
    console.log(`✅ Created temp directories for code snapshots and compiled prompts`);
    
    // Check if the temp directories are in .gitignore
    const gitignorePattern = `${config.executionWorkflow.baseDir}/**/temp_*/`;
    const isInGitignore = checkGitignorePattern(projectRoot, gitignorePattern);
    
    if (!isInGitignore) {
      console.log(`⚠️ Warning: ${gitignorePattern} is not in .gitignore`);
      console.log(`To avoid committing large temporary files, add this pattern to your .gitignore file:\n${gitignorePattern}`);
    }
    
    // Update the Mini-PRD file with the execution tracking folder path (relative to Project Root)
    const relativePrdExecutionDir = path.relative(projectRoot, prdExecutionDir);
    
    // Only offer to update if the execution tracking folder is not already set or is different
    if (!frontMatter.executionTrackingFolder || frontMatter.executionTrackingFolder !== relativePrdExecutionDir) {
      const { createInterface, askQuestion } = require('../../src/utils');
      const rl = createInterface();
      
      const updatePrd = await askQuestion(`Would you like to update the Mini-PRD file with the execution tracking folder path? (y/n) `, rl);
      
      if (updatePrd.toLowerCase() === 'y') {
        // Update the front-matter with the execution tracking folder
        frontMatter.executionTrackingFolder = relativePrdExecutionDir;
        
        // Rewrite the Mini-PRD file with the updated front-matter
        const updatedPrdContent = matter.stringify(prdContent, frontMatter);
        fs.writeFileSync(prdFilePath, updatedPrdContent);
        
        console.log(`✅ Updated Mini-PRD file with execution tracking folder path`);
      }
      
      rl.close();
    }
    
    return {
      success: true,
      executionDir: prdExecutionDir,
      prdId,
      prdName: sanitizedPrdName
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  initExecution
}; 