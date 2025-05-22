/**
 * jaw-tools execution bundle
 * Bundle context and prepare a stage for AI-assisted execution
 */

const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const matter = require('gray-matter');
const { ensureDir, runCommand } = require('../../src/utils');
const { spawn } = require('child_process');

/**
 * Read file contents or return an error message
 * @param {string} filePath Path to the file
 * @returns {string} File contents or error message
 */
function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return `<!-- ERROR: Could not read file ${filePath} -->\n${error.message}`;
  }
}

/**
 * Generate a timestamp string in ISO format
 * @returns {string} Timestamp string
 */
function generateTimestamp() {
  return new Date().toISOString();
}

/**
 * Parse PRD info from a PRD file
 * @param {string} prdFilePath Path to the PRD file
 * @returns {Object} Parsed PRD info
 */
function parsePrdInfo(prdFilePath) {
  const prdContent = readFileContent(prdFilePath);
  const { data: frontMatter } = matter(prdContent);
  
  if (!frontMatter.prdId || !frontMatter.name) {
    throw new Error('PRD file must have prdId and name in front-matter');
  }
  
  return {
    id: frontMatter.prdId,
    name: frontMatter.name,
    sanitizedName: frontMatter.name.replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, '-').trim(),
    content: prdContent,
    frontMatter
  };
}

/**
 * Generate a Repomix code snapshot
 * @param {string} profileName Repomix profile name to use
 * @param {string} outputPath Path to save the snapshot
 * @param {Object} config The jaw-tools configuration
 * @returns {Promise<boolean>} Success status
 */
async function generateCodeSnapshot(profileName, outputPath, config) {
  return new Promise((resolve, reject) => {
    console.log(`Generating code snapshot using Repomix profile: ${profileName}`);
    
    // The repomix command to run
    const args = [
      'repomix', 
      'run', 
      profileName,
      '--output', 
      outputPath
    ];
    
    const proc = spawn('npx', args, { stdio: 'inherit', shell: true });
    
    proc.on('close', code => {
      if (code !== 0) {
        console.error(`❌ Error generating code snapshot with profile: ${profileName}`);
        resolve(false);
      } else {
        console.log(`✅ Code snapshot generated at: ${path.relative(process.cwd(), outputPath)}`);
        resolve(true);
      }
    });
    
    proc.on('error', err => {
      console.error(`❌ Failed to execute repomix command: ${err.message}`);
      resolve(false);
    });
  });
}

/**
 * Compile a template with context variables
 * @param {string} template Template string with handlebars-style placeholders
 * @param {Object} context Context object with values for placeholders
 * @returns {string} Compiled template
 */
function compileTemplate(template, context) {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    
    // Handle conditional blocks
    if (trimmedKey.startsWith('#if ')) {
      const conditionVar = trimmedKey.substring(4).trim();
      return context[conditionVar] ? '' : '<!-- Condition not met -->';
    }
    if (trimmedKey === '/if') {
      return '';
    }
    
    // Replace variables
    return context[trimmedKey] !== undefined ? context[trimmedKey] : match;
  });
}

/**
 * Create a task overview file for a stage
 * @param {string} stageDirPath Path to the stage directory
 * @param {Object} stageInfo Stage information
 * @param {Object} config The jaw-tools configuration
 * @returns {Promise<boolean>} Success status
 */
async function createTaskOverview(stageDirPath, stageInfo, config) {
  try {
    const projectRoot = config.__projectRoot;
    
    // Load the task_overview_template.md from jaw-tools templates
    const templatePath = path.join(__dirname, '..', '..', 'templates', 'execution', 'task_overview_template.md');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Task overview template not found at: ${templatePath}`);
    }
    
    const templateContent = readFileContent(templatePath);
    
    // Determine if this is a prep stage (contains 'prep' in the name)
    const isPrepStage = stageInfo.stageName.includes('prep');
    
    // Create context object for template variables
    const context = {
      timestamp: generateTimestamp(),
      stage_name: stageInfo.stageName,
      prd_id: stageInfo.prdInfo.id,
      prd_name: stageInfo.prdInfo.sanitizedName,
      prd_relative_path: path.relative(stageDirPath, stageInfo.prdFilePath),
      is_prep_stage: isPrepStage
    };
    
    // Add additional resources if available
    if (stageInfo.metaPromptPath) {
      context.central_meta_prompt = true;
      context.central_meta_prompt_name = path.basename(stageInfo.metaPromptPath);
      context.central_meta_prompt_relative_path = path.relative(stageDirPath, stageInfo.metaPromptPath);
    }
    
    if (stageInfo.compiledMetaPromptPath) {
      context.compiled_meta_prompt = true;
      context.compiled_meta_prompt_relative_path = path.relative(stageDirPath, stageInfo.compiledMetaPromptPath);
    }
    
    if (stageInfo.codeSnapshotPath) {
      context.code_snapshot = true;
      context.code_snapshot_relative_path = path.relative(stageDirPath, stageInfo.codeSnapshotPath);
    }
    
    if (stageInfo.prevStageSummaryPath) {
      context.prev_stage_summary = true;
      context.prev_stage_name = path.basename(path.dirname(stageInfo.prevStageSummaryPath));
      context.prev_stage_summary_relative_path = path.relative(stageDirPath, stageInfo.prevStageSummaryPath);
    }
    
    // Compile the template
    const compiledContent = compileTemplate(templateContent, context);
    
    // Write the task overview file
    const overviewPath = path.join(stageDirPath, 'task_overview.md');
    fs.writeFileSync(overviewPath, compiledContent);
    
    console.log(`✅ Created task overview at: ${path.relative(process.cwd(), overviewPath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating task overview: ${error.message}`);
    return false;
  }
}

/**
 * Bundle context and prepare a stage for AI-assisted execution
 * @param {Object} options Command options
 * @param {string} options.prdFile Path to the Mini-PRD file
 * @param {string} options.stageName Name of the stage
 * @param {string} options.metaPrompt Path to the central meta-prompt template
 * @param {string} options.repomixProfile Optional Repomix profile to use
 * @param {string} options.prevStageSummary Optional path to previous stage summary
 * @param {Object} config The jaw-tools configuration
 * @returns {Promise<Object>} Result of the operation
 */
async function bundleExecution(options, config) {
  try {
    const projectRoot = config.__projectRoot;
    
    // Validate required parameters
    if (!options.prdFile) {
      throw new Error('Missing required parameter: --prd-file');
    }
    if (!options.stageName) {
      throw new Error('Missing required parameter: --stage-name');
    }
    if (!options.metaPrompt) {
      throw new Error('Missing required parameter: --meta-prompt');
    }
    
    // Resolve file paths (support both absolute and relative paths)
    let prdFilePath = options.prdFile;
    if (!path.isAbsolute(prdFilePath)) {
      prdFilePath = path.resolve(process.cwd(), prdFilePath);
    }
    
    let metaPromptPath = options.metaPrompt;
    if (!path.isAbsolute(metaPromptPath)) {
      metaPromptPath = path.resolve(process.cwd(), metaPromptPath);
    }
    
    let prevStageSummaryPath = options.prevStageSummary;
    if (prevStageSummaryPath && !path.isAbsolute(prevStageSummaryPath)) {
      prevStageSummaryPath = path.resolve(process.cwd(), prevStageSummaryPath);
    }
    
    // Check if files exist
    if (!fs.existsSync(prdFilePath)) {
      throw new Error(`PRD file not found: ${prdFilePath}`);
    }
    if (!fs.existsSync(metaPromptPath)) {
      throw new Error(`Meta-prompt template not found: ${metaPromptPath}`);
    }
    if (prevStageSummaryPath && !fs.existsSync(prevStageSummaryPath)) {
      throw new Error(`Previous stage summary not found: ${prevStageSummaryPath}`);
    }
    
    // Parse PRD info
    const prdInfo = parsePrdInfo(prdFilePath);
    const executionDirName = `${prdInfo.id}-${prdInfo.sanitizedName}`;
    
    // Determine the execution directory paths
    const baseExecutionDir = path.join(projectRoot, config.executionWorkflow.baseDir);
    const prdExecutionDir = path.join(baseExecutionDir, executionDirName);
    
    // If the execution directory doesn't exist, suggest running init first
    if (!fs.existsSync(prdExecutionDir)) {
      throw new Error(`Execution directory not found for PRD ${prdInfo.id}. Run 'npx jaw-tools execution init --prd-file ${options.prdFile}' first.`);
    }
    
    // Create the stage directory
    const stageDirPath = path.join(prdExecutionDir, options.stageName);
    await fsExtra.ensureDir(stageDirPath);
    
    // Create temporary directories if they don't exist
    const codeSnapshotsDir = path.join(prdExecutionDir, config.executionWorkflow.tempSubDirs.codeSnapshots);
    const compiledPromptsDir = path.join(prdExecutionDir, config.executionWorkflow.tempSubDirs.compiledPrompts);
    
    await fsExtra.ensureDir(codeSnapshotsDir);
    await fsExtra.ensureDir(compiledPromptsDir);
    
    // Determine paths for generated files
    const codeSnapshotPath = path.join(codeSnapshotsDir, `${options.stageName}_code.xml`);
    const compiledMetaPromptPath = path.join(compiledPromptsDir, `${options.stageName}_meta.md`);
    
    // Determine Repomix profile to use
    let repomixProfile = options.repomixProfile;
    
    if (!repomixProfile) {
      // Check if PRD has a Repomix profile in front-matter
      if (prdInfo.frontMatter.repomixContext && prdInfo.frontMatter.repomixContext.profileName) {
        repomixProfile = prdInfo.frontMatter.repomixContext.profileName;
      } else {
        // Use the default profile from config
        repomixProfile = config.executionWorkflow.defaultRepomixProfile;
      }
    }
    
    // Generate code snapshot
    const snapshotSuccess = await generateCodeSnapshot(repomixProfile, codeSnapshotPath, config);
    
    if (!snapshotSuccess) {
      console.warn(`⚠️ Could not generate code snapshot. Using default empty snapshot.`);
      fs.writeFileSync(codeSnapshotPath, '<repomix-snapshot><files></files></repomix-snapshot>');
    }
    
    // Gather context for compilation
    const contextData = {
      mini_prd_content: prdInfo.content
    };
    
    // Add code snapshot content
    contextData.code_snapshot_xml = readFileContent(codeSnapshotPath);
    
    // Add core documents from config
    for (const [docKey, docPath] of Object.entries(config.executionWorkflow.coreDocsForBundling)) {
      const fullDocPath = path.join(projectRoot, docPath);
      if (fs.existsSync(fullDocPath)) {
        contextData[`${docKey}_content`] = readFileContent(fullDocPath);
      } else {
        contextData[`${docKey}_content`] = `<!-- Core document not found: ${docPath} -->`;
      }
    }
    
    // Add previous stage summary if provided
    if (prevStageSummaryPath && fs.existsSync(prevStageSummaryPath)) {
      contextData.prev_stage_summary_content = readFileContent(prevStageSummaryPath);
    }
    
    // Read the meta-prompt template
    const metaPromptTemplate = readFileContent(metaPromptPath);
    
    // Compile the meta-prompt with context
    const compiledMetaPrompt = compileTemplate(metaPromptTemplate, contextData);
    
    // Write the compiled meta-prompt
    fs.writeFileSync(compiledMetaPromptPath, compiledMetaPrompt);
    
    console.log(`✅ Compiled meta-prompt saved to: ${path.relative(process.cwd(), compiledMetaPromptPath)}`);
    
    // Create the task overview file
    const stageInfo = {
      stageName: options.stageName,
      prdInfo,
      prdFilePath,
      metaPromptPath,
      compiledMetaPromptPath,
      codeSnapshotPath,
      prevStageSummaryPath
    };
    
    const overviewSuccess = await createTaskOverview(stageDirPath, stageInfo, config);
    
    if (!overviewSuccess) {
      console.warn(`⚠️ Could not create task overview file.`);
    }
    
    return {
      success: true,
      stageDir: stageDirPath,
      compiledMetaPrompt: compiledMetaPromptPath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  bundleExecution
}; 