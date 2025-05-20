#!/usr/bin/env node

// Try to use fs-extra but fall back to native fs
let fs;
try {
  fs = require('fs-extra');
} catch (err) {
  console.warn('fs-extra not found, falling back to native fs module');
  fs = require('fs');
  // Add ensureDirSync method to match fs-extra API
  fs.ensureDirSync = (dirPath) => {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (err) {
      console.error(`Error creating directory ${dirPath}: ${err.message}`);
      throw err;
    }
  };
  
  // Add writeJsonSync method
  fs.writeJsonSync = (filePath, data, options) => {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, (options && options.spaces) || 2));
    } catch (err) {
      console.error(`Error writing JSON to ${filePath}: ${err.message}`);
      throw err;
    }
  };
  
  // Add copySync method
  fs.copySync = (src, dest) => {
    try {
      fs.copyFileSync(src, dest);
    } catch (err) {
      console.error(`Error copying file from ${src} to ${dest}: ${err.message}`);
      throw err;
    }
  };
  
  // Add readJsonSync method
  fs.readJsonSync = (filePath) => {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.error(`Error reading JSON from ${filePath}: ${err.message}`);
      throw err;
    }
  };
}

const path = require('path');
const readline = require('readline');

// Skip setup if this is not the root installation
if (process.env.npm_config_global || process.env.npm_config_ignore_scripts) {
  process.exit(0);
}

// Detect if running as part of npm install (postinstall script)
const isNpmInstall = !!process.env.npm_lifecycle_event && process.env.npm_lifecycle_event === 'postinstall';

// Define a timeout for preventing installation hang (5 minutes)
const SETUP_TIMEOUT = 5 * 60 * 1000;
let setupTimeoutId;

// Create readline interface only for interactive setup
let rl;
if (!isNpmInstall) {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Default configuration
const defaultConfig = {
  directories: {
    repomixProfiles: '.repomix-profiles',
    docs: '_docs',
    prompts: '_docs/prompts',
    compiledPrompts: '_docs/prompts-compiled'
  },
  repomix: {
    defaultProfiles: {
      'full-codebase': {
        include: '**',
        ignore: '.git/**,node_modules/**,.next/**,out/**,build/**,coverage/**',
        style: 'xml',
        compress: false
      },
      'docs-only': {
        include: '_docs/**',
        ignore: '_docs/prompts-compiled/**',
        style: 'xml',
        compress: false
      }
    },
    env: {}
  },
  promptCompiler: {
    variables: {},
    useNumberedOutputs: true
  },
  nextGen: {
    commands: [
      ['repomix-profile', ['run', 'full-codebase']],
      ['repomix-profile', ['run', 'docs-only']],
      ['compile-prompt', ['_docs/prompts/example.md']]
    ]
  }
};

async function askQuestion(query) {
  // If running as part of npm install, return default value (empty string)
  if (isNpmInstall) {
    return '';
  }
  return new Promise(resolve => rl.question(query, answer => resolve(answer)));
}

async function setup() {
  console.log('🛠️ Setting up jaw-tools in your project...');
  
  // Start timeout to prevent installation hang
  if (isNpmInstall) {
    setupTimeoutId = setTimeout(() => {
      console.error('⚠️ Setup is taking too long. Exiting to prevent installation hang.');
      process.exit(0); // Exit with success code to avoid npm install failure
    }, SETUP_TIMEOUT);
  }
  
  try {
    // Use __dirname instead of process.cwd() for more reliable path resolution
    const toolRoot = path.dirname(__dirname);
    const projectRoot = process.cwd();
    let config = { ...defaultConfig };
    
    // Check if config file already exists
    const configPath = path.join(projectRoot, 'jaw-tools.config.js');
    if (fs.existsSync(configPath)) {
      console.log('⚠️ jaw-tools.config.js already exists. Skipping configuration setup.');
      
      // If running as part of npm install, use existing config without prompting
      if (isNpmInstall) {
        console.log('Using existing configuration (running as part of npm install)');
        try {
          // Use try-catch for all file operations during non-interactive setup
          createDirectories(config, projectRoot, toolRoot);
          updatePackageJson(projectRoot);
          console.log('\n🚀 jaw-tools setup complete with existing configuration!');
          if (rl) rl.close();
          clearTimeout(setupTimeoutId);
          return;
        } catch (err) {
          console.error('❌ Error during setup:', err.message);
          if (rl) rl.close();
          clearTimeout(setupTimeoutId);
          // Exit with 0 during npm install to not block installation
          process.exit(isNpmInstall ? 0 : 1);
        }
      }
      
      const useExisting = await askQuestion('Would you like to continue with the existing configuration? (Y/n): ');
      if (useExisting.toLowerCase() !== 'n') {
        createDirectories(config, projectRoot, toolRoot);
        updatePackageJson(projectRoot);
        console.log('\n🚀 jaw-tools setup complete with existing configuration!');
        if (rl) rl.close();
        clearTimeout(setupTimeoutId);
        return;
      }
    }
    
    // For non-interactive postinstall, just use defaults
    if (isNpmInstall) {
      console.log('Using default configuration (non-interactive installation)');
      const configContent = `// jaw-tools configuration
module.exports = ${JSON.stringify(config, null, 2)};
`;
      try {
        fs.writeFileSync(configPath, configContent);
        console.log('✅ Created jaw-tools.config.js');
        createDirectories(config, projectRoot, toolRoot);
        updatePackageJson(projectRoot);
        createSamplePrompt(config, projectRoot);
        console.log('\n🚀 jaw-tools setup complete!');
        clearTimeout(setupTimeoutId);
        process.exit(0);
      } catch (err) {
        console.error('❌ Error during setup:', err.message);
        clearTimeout(setupTimeoutId);
        process.exit(0); // Still exit with 0 during npm install
      }
    }
    
    // Ask for directory paths (for interactive sessions only)
    console.log('\n📁 Directory Configuration:');
    config.directories.docs = await askQuestion(`Docs directory [${config.directories.docs}]: `) || config.directories.docs;
    config.directories.prompts = await askQuestion(`Prompts directory [${config.directories.prompts}]: `) || config.directories.prompts;
    config.directories.compiledPrompts = await askQuestion(`Compiled prompts directory [${config.directories.compiledPrompts}]: `) || config.directories.compiledPrompts;
    
    // Create the configuration file
    const configContent = `// jaw-tools configuration
module.exports = ${JSON.stringify(config, null, 2)};
`;

    fs.writeFileSync(configPath, configContent);
    console.log('✅ Created jaw-tools.config.js');
    
    createDirectories(config, projectRoot, toolRoot);
    updatePackageJson(projectRoot);
    createSamplePrompt(config, projectRoot);
    
    console.log('\n🚀 jaw-tools setup complete!');
    console.log('\nRun these commands to get started:');
    console.log('  npm run repomix list     - List available profiles');
    console.log('  npm run repomix run full-codebase - Generate a codebase snapshot');
    console.log('  npm run compile-prompt _docs/prompts/example.md - Compile a prompt');
    console.log('  npm run next-gen         - Run all configured commands in sequence');
    
  } catch (err) {
    console.error('❌ Setup failed:', err);
    process.exit(isNpmInstall ? 0 : 1); // Exit with success during npm install
  } finally {
    if (rl) rl.close();
    if (setupTimeoutId) clearTimeout(setupTimeoutId);
  }
}

function createDirectories(config, projectRoot, toolRoot) {
  // Create directories
  console.log('\n📂 Creating directories...');
  const repoProfilesDir = path.join(projectRoot, config.directories.repomixProfiles);
  const docsDir = path.join(projectRoot, config.directories.docs);
  const promptsDir = path.join(projectRoot, config.directories.prompts);
  const compiledPromptsDir = path.join(projectRoot, config.directories.compiledPrompts);
  
  try {
    fs.ensureDirSync(repoProfilesDir);
    fs.ensureDirSync(docsDir);
    fs.ensureDirSync(promptsDir);
    fs.ensureDirSync(compiledPromptsDir);
    console.log('✅ Created directory structure');
    
    // Copy .repo_ignore file if it doesn't exist
    // Use toolRoot if available, otherwise fall back to __dirname
    const repoIgnoreSrc = path.join(toolRoot || __dirname, 'templates', '.repo_ignore');
    const repoIgnoreDest = path.join(projectRoot, '.repo_ignore');
    if (fs.existsSync(repoIgnoreSrc) && !fs.existsSync(repoIgnoreDest)) {
      fs.copySync(repoIgnoreSrc, repoIgnoreDest);
      console.log('✅ Created .repo_ignore file');
    } else if (!fs.existsSync(repoIgnoreSrc)) {
      console.warn(`⚠️ Template file not found: ${repoIgnoreSrc}`);
    }
    
    // Create profiles.json if it doesn't exist
    const profilesJsonPath = path.join(repoProfilesDir, 'profiles.json');
    if (!fs.existsSync(profilesJsonPath)) {
      fs.writeJsonSync(profilesJsonPath, config.repomix.defaultProfiles, { spaces: 2 });
      console.log('✅ Created profiles.json with default profiles');
    }
    
    // Create a standalone profiles-manager.js that doesn't rely on external dependencies
    const profilesManagerDest = path.join(repoProfilesDir, 'profiles-manager.js');
    const profilesManagerContent = `#!/usr/bin/env node

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
const PROFILES_FILE = path.join(__dirname, 'profiles.json');
const OUTPUT_DIR = path.join(__dirname, 'outputs');

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
    console.error(\`Error reading profiles file: \${err.message}\`);
    // Create an empty file if it doesn't exist or is invalid
    fs.writeFileSync(PROFILES_FILE, '{}', 'utf8');
  }
}

// Parse command line arguments
const command = process.argv[2];
const profileName = process.argv[3];

// List available profiles
if (command === 'list') {
  console.log('\\n🔍 Available repomix profiles:');
  console.log('============================');
  
  if (Object.keys(profiles).length === 0) {
    console.log('No profiles found. Add a profile with: node profiles-manager.js add <profile-name>');
    process.exit(0);
  }
  
  Object.keys(profiles).forEach(name => {
    const profile = profiles[name];
    const outputPath = path.join(OUTPUT_DIR, \`\${name}.xml\`);
    const tokenCount = fs.existsSync(outputPath) ? \`(~\${getTokenCount(outputPath)} tokens)\` : '';
    
    console.log(\`\\n📋 \${name}\`);
    console.log('  - Include: ' + (profile.include || '(all files)'));
    console.log('  - Ignore: ' + (profile.ignore || '(none)'));
    console.log('  - Style: ' + (profile.style || 'xml'));
    if (profile.compress) console.log('  - Compression: Enabled');
    if (fs.existsSync(outputPath)) {
      console.log(\`  - Output: \${outputPath} \${tokenCount}\`);
    }
  });
  console.log('\\nRun a profile with: node profiles-manager.js run <profile-name>');
  process.exit(0);
}

// Run a profile
if (command === 'run' && profileName) {
  if (!profiles[profileName]) {
    console.error(\`❌ Profile "\${profileName}" not found\`);
    process.exit(1);
  }
  
  const profile = profiles[profileName];
  const outputFile = \`\${profileName}.xml\`;
  const outputPath = path.join(OUTPUT_DIR, outputFile);
  
  console.log(\`\\n🚀 Running profile: \${profileName}\`);
  console.log('============================');
  
  const args = ['repomix', '--output', outputPath];
  
  if (profile.include) args.push('--include', profile.include);
  if (profile.ignore) args.push('--ignore', profile.ignore);
  if (profile.style) args.push('--style', profile.style);
  if (profile.compress) args.push('--compress');
  
  console.log(\`\\n📦 Executing: npx \${args.join(' ')}\`);
  
  try {
    execSync(\`npx \${args.join(' ')}\`, { stdio: 'inherit' });
    
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      const fileSizeInKB = Math.round(stats.size / 1024);
      const tokenCount = getTokenCount(outputPath);
      
      console.log(\`\\n✅ Success! Output saved to: \${outputPath}\`);
      console.log(\`   File size: \${fileSizeInKB} KB\`);
      console.log(\`   Estimated tokens: ~\${tokenCount}\`);
    } else {
      console.error('❌ Failed to generate output file');
    }
  } catch (error) {
    console.error(\`\\n❌ Error running repomix: \${error.message}\`);
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
  
  console.log(\`\\n✅ Profile "\${profileName}" added/updated\`);
  console.log(\`Include patterns: \${include || '(all files)'}\`);
  console.log(\`Ignore patterns: \${ignore || '(none)'}\`);
  console.log(\`Style: \${style}\`);
  if (compress) console.log('Compression: Enabled');
  
  process.exit(0);
}

// Delete a profile
if (command === 'delete' && profileName) {
  if (!profiles[profileName]) {
    console.error(\`❌ Profile "\${profileName}" not found\`);
    process.exit(1);
  }
  
  delete profiles[profileName];
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
  
  const outputPath = path.join(OUTPUT_DIR, \`\${profileName}.xml\`);
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
    console.log(\`\\n🗑️ Deleted output file: \${outputPath}\`);
  }
  
  console.log(\`\\n✅ Profile "\${profileName}" deleted\`);
  process.exit(0);
}

// Show help if no valid command
console.log('\\n🔧 Repomix Profile Manager');
console.log('============================');
console.log('Usage:');
console.log('  list                             - List all profiles');
console.log('  run <profile>                    - Run a specific profile');
console.log('  add <profile> [include] [ignore] [style] [--compress] - Add/update a profile');
console.log('  delete <profile>                 - Delete a profile');
console.log('\\nExamples:');
console.log('  node profiles-manager.js add full-codebase');
console.log('  node profiles-manager.js add frontend-only "app/**,components/**" "actions/**,db/**" xml');
console.log('  node profiles-manager.js add core-compact "actions/db/**,db/schema/**,types/**" "" xml --compress');
console.log('  node profiles-manager.js run full-codebase');`;
  
    fs.writeFileSync(profilesManagerDest, profilesManagerContent);
    console.log('✅ Created profiles-manager.js');
  } catch (err) {
    console.error(`❌ Error creating directories: ${err.message}`);
    throw err; // Rethrow to be caught by the main setup function
  }
}

function updatePackageJson(projectRoot) {
  // Add scripts to package.json
  try {
    const pkgJsonPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      console.log('\n🔧 Updating package.json...');
      const pkgJson = fs.readJsonSync(pkgJsonPath);
      pkgJson.scripts = pkgJson.scripts || {};
      
      // Only add scripts if they don't exist
      if (!pkgJson.scripts['repomix']) {
        pkgJson.scripts['repomix'] = 'jaw-tools repomix';
      }
      if (!pkgJson.scripts['compile-prompt']) {
        pkgJson.scripts['compile-prompt'] = 'jaw-tools compile';
      }
      if (!pkgJson.scripts['next-gen']) {
        pkgJson.scripts['next-gen'] = 'jaw-tools next-gen';
      }
      
      fs.writeJsonSync(pkgJsonPath, pkgJson, { spaces: 2 });
      console.log('✅ Added npm scripts to package.json');
    }
  } catch (err) {
    console.warn('⚠️ Could not update package.json scripts:', err.message);
  }
}

function createSamplePrompt(config, projectRoot) {
  // Create a sample prompt
  const samplePromptDir = path.join(projectRoot, config.directories.prompts);
  const samplePromptPath = path.join(samplePromptDir, 'example.md');
  if (!fs.existsSync(samplePromptPath)) {
    const samplePrompt = `# Example Prompt

This is a sample prompt template that demonstrates how to use file includes.

## Project Structure

\`\`\`
{{ package.json }}
\`\`\`

## Configuration

\`\`\`js
{{ jaw-tools.config.js }}
\`\`\`

You can include any file using the \`{{ path/to/file }}\` syntax.
`;
    fs.writeFileSync(samplePromptPath, samplePrompt);
    console.log('✅ Created sample prompt at', path.relative(projectRoot, samplePromptPath));
  }
}

// Run setup
setup().catch(err => {
  console.error('❌ Setup failed:', err);
  process.exit(1);
}); 