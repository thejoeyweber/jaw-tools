#!/usr/bin/env node

/**
 * DEBUG INFO - This will help diagnose postinstall issues
 */
console.log('\n******** JAW-TOOLS SETUP SCRIPT STARTING ********');
console.log('Current directory:', process.cwd());
console.log('Script path:', __filename);
console.log('Environment variables:');
console.log('- npm_lifecycle_event:', process.env.npm_lifecycle_event);
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- Command line args:', process.argv);
console.log('*************************************************\n');

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
const { spawn } = require('child_process');

// Import utility functions explicitly since we're running at package install time
let ensureDir, askQuestion, checkCommandAvailability;
try {
  const utils = require('./src/utils');
  ensureDir = utils.ensureDir;
  askQuestion = utils.askQuestion;
  checkCommandAvailability = utils.checkCommandAvailability;
} catch (err) {
  // Define functions inline if module not found during installation
  ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  };
  
  askQuestion = (question, rl) => {
    const interface = rl || readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    return new Promise(resolve => {
      interface.question(question, answer => {
        if (!rl) interface.close();
        resolve(answer);
      });
    });
  };
  
  checkCommandAvailability = (command) => {
    const { exec } = require('child_process');
    return new Promise(resolve => {
      exec(`${command} --version`, { shell: true }, (error) => {
        resolve(!error);
      });
    });
  };
}

// Determine if this is being run as a postinstall script
// Detect various possible install scenarios
const isPostInstall = process.env.npm_lifecycle_event === 'postinstall' || 
                      process.env.npm_config_argv?.includes('install') ||
                      process.argv.includes('--postinstall');

// Create readline interface only for interactive setup
let rl;
if (!isPostInstall) {
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
    compiledPrompts: '_docs/prompts-compiled',
    miniPrdTemplatePath: '_docs/project-docs/templates/mini-prd-template.md'
  },
  repomix: {
    defaultProfiles: {
      'full-codebase': {
        include: '**',
        ignore: '.git/**,node_modules/**,.next/**,out/**,build/**,coverage/**,package-lock.json,yarn.lock,pnpm-lock.yaml,**/*.min.js,**/*.min.css,**/dist/**,**/*.map',
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
  workflow: {
    sequences: {
      'default': [
        ['repomix-profile', ['run', 'full-codebase']],
        ['repomix-profile', ['run', 'docs-only']],
        ['compile-prompt', ['_docs/prompts/example.md']]
      ]
    },
    defaultSequence: 'default'
  },
  projectScaffolding: {
    scaffoldTargetRootDir: '.',
    userGuide: {
      destinationFileName: 'jaw-tools-guide.md'
    }
  }
};

/**
 * Main setup function
 */
async function setup() {
  const toolRoot = path.dirname(require.resolve('./package.json'));
  const projectRoot = process.cwd();
  let config = { ...defaultConfig };
  
  // Check if running as part of npm install (postinstall)
  if (isPostInstall) {
    console.log('\n🛠️ Performing minimal jaw-tools setup (postinstall)...');
    
    // Use setTimeout to ensure this message appears
    setTimeout(() => {
      console.log('\n✨ jaw-tools is being installed...');
    }, 100);
    
    return await handlePostInstall(config, projectRoot, toolRoot);
  } else {
    console.log('🛠️ Setting up jaw-tools in your project...');
    return await handleManualSetup(config, projectRoot, toolRoot);
  }
}

/**
 * Handle minimal setup during postinstall
 */
async function handlePostInstall(config, projectRoot, toolRoot) {
  try {
    // Add exit event listener for reliable completion message
    process.on('exit', () => {
      const installCompleteMsg = '\n\n✅ JAW-TOOLS SETUP COMPLETE! For full project scaffolding, dependency checks, and guided configuration, please run: npx jaw-tools setup\n';
      console.log(installCompleteMsg);
    });
    
    // IMPORTANT: When installed as a dependency, we need to handle
    // creating files in the parent project directory
    let targetRoot = projectRoot;
    
    // Check if we're in node_modules
    if (projectRoot.includes('node_modules')) {
      // Try to get parent project directory
      targetRoot = projectRoot.split('node_modules')[0].replace(/[\\/]$/, '');
      console.log(`Detected installation as dependency. Target project root: ${targetRoot}`);
    }
    
    // Check if config file already exists
    const configPath = path.join(targetRoot, 'jaw-tools.config.js');
    if (!fs.existsSync(configPath)) {
      // Copy template config file
      const templateConfigPath = path.join(toolRoot, 'templates', 'jaw-tools.config.js');
      if (fs.existsSync(templateConfigPath)) {
        try {
          fs.copyFileSync(templateConfigPath, configPath);
          console.log(`✅ Created jaw-tools.config.js in ${targetRoot}`);
        } catch (err) {
          console.error(`⚠️ Error creating config file: ${err.message}`);
        }
      } else {
        // Fallback to creating config from default if template not found
        const configContent = `// jaw-tools configuration
module.exports = ${JSON.stringify(config, null, 2)};
`;
        try {
          fs.writeFileSync(configPath, configContent);
          console.log(`✅ Created jaw-tools.config.js from defaults in ${targetRoot}`);
        } catch (err) {
          console.error(`⚠️ Error creating config file: ${err.message}`);
        }
      }
    } else {
      try {
        // Use existing config
        config = require(configPath);
        console.log(`✅ Using existing config file: ${configPath}`);
      } catch (err) {
        console.error(`⚠️ Error loading existing config: ${err.message}`);
      }
    }

    // Create essential directories
    const repoProfilesDir = path.join(targetRoot, config.directories?.repomixProfiles || '.repomix-profiles');
    const docsDir = path.join(targetRoot, config.directories?.docs || '_docs');
    const promptsDir = path.join(targetRoot, config.directories?.prompts || '_docs/prompts');
    const compiledPromptsDir = path.join(targetRoot, config.directories?.compiledPrompts || '_docs/prompts-compiled');

    try {
      ensureDir(repoProfilesDir);
      ensureDir(docsDir);
      ensureDir(promptsDir);
      ensureDir(compiledPromptsDir);
      console.log(`✅ Essential directories created in ${targetRoot}`);
    } catch (err) {
      console.error(`⚠️ Error creating directories: ${err.message}`);
    }
    
    // Create example prompt if it doesn't exist
    const examplePromptPath = path.join(promptsDir, 'example.md');
    if (!fs.existsSync(examplePromptPath)) {
      const templatePromptPath = path.join(toolRoot, 'templates', 'scaffold_root', '_docs', 'prompts', 'example.md');
      if (fs.existsSync(templatePromptPath)) {
        try {
          fs.copyFileSync(templatePromptPath, examplePromptPath);
          console.log(`✅ Created example prompt in ${examplePromptPath}`);
        } catch (err) {
          console.error(`⚠️ Error creating example prompt: ${err.message}`);
        }
      }
    }
    
    // We've moved the completion message to the process.on('exit') handler
    // No need for the multiple output methods here anymore
    
    return { success: true };
  } catch (err) {
    console.error(`❌ Error during postinstall setup: ${err.message}`);
    // Still exit with success to avoid stopping npm install
    return { success: false, error: err.message };
  }
}

/**
 * Handle interactive setup when run manually
 */
async function handleManualSetup(config, projectRoot, toolRoot) {
  try {
    // Add exit event listener for reliable completion message
    process.on('exit', () => {
      const setupCompleteMsg = '\n\n✅ JAW-TOOLS SETUP COMPLETE! Run "npx jaw-tools help" for available commands.\n';
      console.log(setupCompleteMsg);
    });
    
    // Check if config file already exists
    const configPath = path.join(projectRoot, 'jaw-tools.config.js');
    if (fs.existsSync(configPath)) {
      console.log('⚠️ jaw-tools.config.js already exists.');
      
      const useExisting = await askQuestion('Would you like to continue with the existing configuration? (Y/n): ', rl);
      if (useExisting.toLowerCase() !== 'n') {
        try {
          config = require(configPath);
        } catch (err) {
          console.error(`❌ Error loading existing config: ${err.message}`);
          console.log('Using default configuration instead.');
        }
      } else {
        // Ask for directory paths
        console.log('\n📁 Directory Configuration:');
        config.directories.docs = await askQuestion(`Docs directory [${config.directories.docs}]: `, rl) || config.directories.docs;
        config.directories.prompts = await askQuestion(`Prompts directory [${config.directories.prompts}]: `, rl) || config.directories.prompts;
        config.directories.compiledPrompts = await askQuestion(`Compiled prompts directory [${config.directories.compiledPrompts}]: `, rl) || config.directories.compiledPrompts;
        
        // Create the configuration file
        const configContent = `// jaw-tools configuration
module.exports = ${JSON.stringify(config, null, 2)};
`;
        fs.writeFileSync(configPath, configContent);
        console.log('✅ Created jaw-tools.config.js');
      }
    } else {
      // Copy template config file
      const templateConfigPath = path.join(toolRoot, 'templates', 'jaw-tools.config.js');
      if (fs.existsSync(templateConfigPath)) {
        fs.copyFileSync(templateConfigPath, configPath);
        console.log('✅ Created jaw-tools.config.js from template');
      } else {
        // Fallback to creating config from default if template not found
        const configContent = `// jaw-tools configuration
module.exports = ${JSON.stringify(config, null, 2)};
`;
        fs.writeFileSync(configPath, configContent);
        console.log('✅ Created jaw-tools.config.js from defaults');
      }
    }
    
    // Create essential directories
    const repoProfilesDir = path.join(projectRoot, config.directories?.repomixProfiles || '.repomix-profiles');
    const docsDir = path.join(projectRoot, config.directories?.docs || '_docs');
    const promptsDir = path.join(projectRoot, config.directories?.prompts || '_docs/prompts');
    const compiledPromptsDir = path.join(projectRoot, config.directories?.compiledPrompts || '_docs/prompts-compiled');

    console.log('\n📂 Creating directories...');
    ensureDir(repoProfilesDir);
    ensureDir(docsDir);
    ensureDir(promptsDir);
    ensureDir(compiledPromptsDir);
    console.log('✅ Directory structure created');
    
    // Check for repomix
    console.log('\n🔍 Checking for repomix...');
    const hasRepomix = await checkCommandAvailability('npx repomix --version');
    if (!hasRepomix) {
      const packageJson = require('./package.json');
      const repomixVersion = packageJson.peerDependencies?.repomix || '>=0.3.0';
      console.warn(`⚠️ repomix not found. This tool works best with repomix ${repomixVersion}`);
      
      const shouldInstall = await askQuestion('Would you like to install repomix now? (Y/n): ', rl);
      if (shouldInstall.toLowerCase() !== 'n') {
        // Try to update package.json
        await updatePackageJson(projectRoot);
        
        // Install repomix
        console.log('\n📦 Installing repomix...');
        
        const installProcess = spawn('npm', ['install', `repomix@${repomixVersion}`], {
          stdio: 'inherit',
          shell: true
        });
        
        await new Promise((resolve, reject) => {
          installProcess.on('close', code => {
            if (code === 0) {
              console.log('✅ repomix installed successfully');
              resolve();
            } else {
              console.error('❌ Failed to install repomix. You may need to install it manually.');
              resolve(); // Resolve anyway to continue setup
            }
          });
          
          installProcess.on('error', err => {
            console.error(`❌ Error installing repomix: ${err.message}`);
            resolve(); // Resolve anyway to continue setup
          });
        });
      }
    } else {
      console.log('✅ repomix is already installed');
    }
    
    // Create sample prompt
    await createSamplePrompt(config, projectRoot);
    
    // Initialize repomix profiles
    const profilesDir = path.join(projectRoot, config.directories.repomixProfiles);
    const profilesFile = path.join(profilesDir, 'profiles.json');
    
    if (!fs.existsSync(profilesFile) && config.repomix && config.repomix.defaultProfiles) {
      console.log('\n📝 Creating default repomix profiles...');
      fs.writeJsonSync(profilesFile, config.repomix.defaultProfiles, { spaces: 2 });
      console.log(`✅ Created default profiles in ${path.relative(projectRoot, profilesFile)}`);
    }
    
    // We've moved the completion message to the process.on('exit') handler
    
    if (rl) rl.close();
    return { success: true };
  } catch (err) {
    console.error(`\n❌ Error during setup: ${err.message}`);
    if (rl) rl.close();
    return { success: false, error: err.message };
  }
}

/**
 * Update package.json to include repomix as a dependency
 */
async function updatePackageJson(projectRoot) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.warn('⚠️ No package.json found in project root. Skipping dependency update.');
    return;
  }
  
  try {
    const packageJson = fs.readJsonSync(packageJsonPath);
    const jawToolsPackageJson = require('./package.json');
    const repomixVersion = jawToolsPackageJson.peerDependencies?.repomix || '>=0.3.0';
    
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    
    if (!packageJson.dependencies.repomix) {
      packageJson.dependencies.repomix = repomixVersion;
      fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
      console.log('✅ Added repomix to package.json dependencies');
    }
  } catch (err) {
    console.error(`❌ Error updating package.json: ${err.message}`);
  }
}

/**
 * Create a sample prompt for the user
 */
async function createSamplePrompt(config, projectRoot) {
  const promptsDir = path.join(projectRoot, config.directories.prompts);
  const samplePromptPath = path.join(promptsDir, 'example.md');
  
  if (!fs.existsSync(samplePromptPath)) {
    console.log('\n📝 Creating a sample prompt template...');
    
    const samplePrompt = `# Example Prompt Template

This is an example prompt template that you can compile with jaw-tools.
You can include file contents with the {{file-path}} syntax.

For example:

## Package.json
\`\`\`json
{{package.json}}
\`\`\`

## Configuration
\`\`\`javascript
{{jaw-tools.config.js}}
\`\`\`

You can also use glob patterns:
\`\`\`javascript
{{src/**/*.js}}
\`\`\`
`;
    
    fs.writeFileSync(samplePromptPath, samplePrompt);
    console.log(`✅ Created sample prompt at ${path.relative(projectRoot, samplePromptPath)}`);
  }
}

// Make the setup function available for import
module.exports = setup;

// Run setup if called directly
if (require.main === module) {
  setup()
    .then(result => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch(err => {
      console.error(`Fatal error during setup: ${err.message}`);
      process.exit(1);
    });
} 