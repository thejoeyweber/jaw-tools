/**
 * jaw-tools repomix generate-from-prd
 * Generate a Repomix profile from a Mini-PRD file
 */

const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const matter = require('gray-matter');
const { ensureDir } = require('../../src/utils');

/**
 * Sanitize a string for use as a profile name
 * @param {string} name The string to sanitize
 * @returns {string} Sanitized string safe for use as a profile name
 */
function sanitizeForProfileName(name) {
  return name
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .toLowerCase()
    .trim();
}

/**
 * Generate a Repomix profile from a Mini-PRD file
 * @param {Object} options Command options
 * @param {string} options.prdFile Path to the Mini-PRD file
 * @param {Object} config The jaw-tools configuration
 * @returns {Promise<Object>} Result of the operation
 */
async function generateProfileFromPrd(options, config) {
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
    
    // Ensure Repomix profiles directory exists
    const repomixProfilesDir = path.join(projectRoot, config.directories.repomixProfiles || '.repomix-profiles');
    await fsExtra.ensureDir(repomixProfilesDir);
    
    // Check if the PRD has a repomixContext section
    if (!frontMatter.repomixContext) {
      console.log(`⚠️ No repomixContext found in PRD front-matter. Using includes/excludes from the PRD.`);
      frontMatter.repomixContext = {};
    }
    
    // Generate profile name if not provided
    if (!frontMatter.repomixContext.profileName) {
      const sanitizedName = sanitizeForProfileName(frontMatter.name);
      frontMatter.repomixContext.profileName = `prd-${frontMatter.prdId}-${sanitizedName}`;
    }
    
    // Use includes/excludes from PRD if not provided in repomixContext
    if (!frontMatter.repomixContext.include || frontMatter.repomixContext.include.length === 0) {
      if (!frontMatter.includes || frontMatter.includes.length === 0) {
        throw new Error('No include patterns found in PRD. Add includes to the PRD front-matter or repomixContext.include.');
      }
      frontMatter.repomixContext.include = frontMatter.includes;
    }
    
    if (!frontMatter.repomixContext.ignore || frontMatter.repomixContext.ignore.length === 0) {
      if (frontMatter.excludes && frontMatter.excludes.length > 0) {
        frontMatter.repomixContext.ignore = frontMatter.excludes;
      }
    }
    
    // Add description if not provided
    if (!frontMatter.repomixContext.description) {
      frontMatter.repomixContext.description = `Files relevant to ${frontMatter.prdId} - ${frontMatter.name}`;
    }
    
    // Format the patterns as comma-separated strings if they're arrays
    const includePattern = Array.isArray(frontMatter.repomixContext.include) 
      ? frontMatter.repomixContext.include.join(',')
      : frontMatter.repomixContext.include;
      
    const ignorePattern = Array.isArray(frontMatter.repomixContext.ignore) 
      ? frontMatter.repomixContext.ignore.join(',')
      : frontMatter.repomixContext.ignore || '';
    
    // Create the profile object
    const profileName = frontMatter.repomixContext.profileName;
    const profile = {
      include: includePattern,
      ignore: ignorePattern,
      style: 'xml',
      compress: false,
      description: frontMatter.repomixContext.description
    };
    
    // Create the profiles directory if it doesn't exist
    const profilesJsonPath = path.join(repomixProfilesDir, 'profiles.json');
    let profiles = {};
    
    // Load existing profiles if the file exists
    if (fs.existsSync(profilesJsonPath)) {
      try {
        profiles = JSON.parse(fs.readFileSync(profilesJsonPath, 'utf8'));
      } catch (error) {
        console.warn(`⚠️ Could not parse existing profiles.json: ${error.message}`);
        profiles = {};
      }
    }
    
    // Add or update the profile
    profiles[profileName] = profile;
    
    // Write the updated profiles.json
    fs.writeFileSync(profilesJsonPath, JSON.stringify(profiles, null, 2));
    
    console.log(`✅ Generated Repomix profile: ${profileName}`);
    console.log(`📁 Profile saved to: ${path.relative(process.cwd(), profilesJsonPath)}`);
    console.log(`🔍 Include: ${includePattern}`);
    if (ignorePattern) {
      console.log(`🚫 Ignore: ${ignorePattern}`);
    }
    
    // Optionally update the PRD's front-matter with the profile name
    if (!frontMatter.repomixContext.profileName || frontMatter.repomixContext.profileName !== profileName) {
      const { createInterface, askQuestion } = require('../../src/utils');
      const rl = createInterface();
      
      const updatePrd = await askQuestion(`Would you like to update the Mini-PRD file with the profile name? (y/n) `, rl);
      
      if (updatePrd.toLowerCase() === 'y') {
        // Ensure repomixContext exists
        if (!frontMatter.repomixContext) {
          frontMatter.repomixContext = {};
        }
        
        // Update the front-matter with the profile name
        frontMatter.repomixContext.profileName = profileName;
        
        // Rewrite the Mini-PRD file with the updated front-matter
        const updatedPrdContent = matter.stringify(matter(prdContent).content, frontMatter);
        fs.writeFileSync(prdFilePath, updatedPrdContent);
        
        console.log(`✅ Updated Mini-PRD file with profile name: ${profileName}`);
      }
      
      rl.close();
    }
    
    return {
      success: true,
      profileName,
      profilePath: profilesJsonPath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateProfileFromPrd
}; 