/**
 * jaw-tools execution record-step
 * Record execution step results and generate a task summary
 */

const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const matter = require('gray-matter');
const { ensureDir, createInterface, askQuestion } = require('../../src/utils');

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
  const prdContent = fs.readFileSync(prdFilePath, 'utf8');
  const { data: frontMatter } = matter(prdContent);
  
  if (!frontMatter.prdId || !frontMatter.name) {
    throw new Error('PRD file must have prdId and name in front-matter');
  }
  
  return {
    id: frontMatter.prdId,
    name: frontMatter.name,
    sanitizedName: frontMatter.name.replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, '-').trim()
  };
}

/**
 * Copy a file to the stage directory
 * @param {string} sourcePath Source file path
 * @param {string} stageDirPath Stage directory path
 * @param {string} targetFileName Target file name
 * @returns {boolean} Success status
 */
function copyFileToStage(sourcePath, stageDirPath, targetFileName) {
  try {
    if (!fs.existsSync(sourcePath)) {
      console.warn(`⚠️ Source file not found: ${sourcePath}`);
      return false;
    }
    
    const targetPath = path.join(stageDirPath, targetFileName);
    fsExtra.copySync(sourcePath, targetPath);
    
    console.log(`✅ Copied ${path.basename(sourcePath)} to ${path.relative(process.cwd(), targetPath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error copying file: ${error.message}`);
    return false;
  }
}

/**
 * Generate a suggested name for the next stage
 * @param {string} currentStage Current stage name
 * @param {string} status Status of the current stage
 * @returns {string} Suggested next stage name
 */
function suggestNextStage(currentStage, status) {
  // Extract the number prefix if available
  const numberMatch = currentStage.match(/^(\d+)_/);
  let nextNumber = '001';
  
  if (numberMatch) {
    const currentNumber = parseInt(numberMatch[1], 10);
    nextNumber = String(currentNumber + 1).padStart(3, '0');
  }
  
  // Determine if this is a prep or run stage
  const isPrepStage = currentStage.includes('prep');
  const needsReview = status.includes('issues') || status.includes('failed');
  
  if (isPrepStage) {
    // After prep, suggest a run stage
    return `${nextNumber}_run_${currentStage.replace(/^\d+_prep_/, '')}`;
  } else if (needsReview) {
    // After a run with issues, suggest a review stage
    return `${nextNumber}_prep_review_and_fix`;
  } else {
    // After a successful run, suggest completion or polish
    return `${nextNumber}_prep_final_polish`;
  }
}

/**
 * Create a task summary file for a stage
 * @param {string} stageDirPath Path to the stage directory
 * @param {Object} stageInfo Stage information
 * @param {Object} config The jaw-tools configuration
 * @returns {Promise<boolean>} Success status
 */
async function createTaskSummary(stageDirPath, stageInfo, config) {
  try {
    // Load the task_summary_template.md from jaw-tools templates
    const templatePath = path.join(__dirname, '..', '..', 'templates', 'execution', 'task_summary_template.md');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Task summary template not found at: ${templatePath}`);
    }
    
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    
    // Determine if this is a prep stage (contains 'prep' in the name)
    const isPrepStage = stageInfo.stageName.includes('prep');
    
    // Check which files exist in the stage directory
    const hasTaskOverview = fs.existsSync(path.join(stageDirPath, 'task_overview.md'));
    const hasGeneratedInstructions = fs.existsSync(path.join(stageDirPath, 'generated_instructions.md'));
    const hasExecutionLog = fs.existsSync(path.join(stageDirPath, 'execution_log.txt'));
    const hasUserFeedback = fs.existsSync(path.join(stageDirPath, 'user_feedback.md'));
    
    // Determine if this implementation needs review based on status
    const needsReview = stageInfo.status.includes('issues') || stageInfo.status.includes('failed');
    
    // Suggest the next stage name
    const nextStageSuggestion = suggestNextStage(stageInfo.stageName, stageInfo.status);
    
    // Prompt for user notes if this is an execution stage
    let userNotes = '';
    if (!isPrepStage) {
      const rl = createInterface();
      console.log('\nPlease provide any additional notes for this execution stage (press Enter twice to finish):');
      
      const lines = [];
      let emptyLineCount = 0;
      
      while (emptyLineCount < 1) {
        const line = await askQuestion('> ', rl);
        if (line.trim() === '') {
          emptyLineCount++;
        } else {
          emptyLineCount = 0;
          lines.push(line);
        }
      }
      
      userNotes = lines.join('\n');
      rl.close();
    }
    
    // Create context object for template variables
    const context = {
      timestamp: generateTimestamp(),
      stage_name: stageInfo.stageName,
      prd_id: stageInfo.prdInfo.id,
      prd_name: stageInfo.prdInfo.sanitizedName,
      prd_relative_path: path.relative(stageDirPath, stageInfo.prdFilePath),
      status: stageInfo.status,
      is_prep_stage: isPrepStage,
      has_task_overview: hasTaskOverview,
      has_generated_instructions: hasGeneratedInstructions,
      has_execution_log: hasExecutionLog,
      has_user_feedback: hasUserFeedback,
      needs_review: needsReview,
      next_stage_suggestion: nextStageSuggestion,
      stage_dir: path.relative(process.cwd(), stageDirPath),
      user_notes: userNotes
    };
    
    // Compile the template
    const compiledContent = templateContent.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
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
    
    // Write the task summary file
    const summaryPath = path.join(stageDirPath, 'task_summary.md');
    fs.writeFileSync(summaryPath, compiledContent);
    
    console.log(`✅ Created task summary at: ${path.relative(process.cwd(), summaryPath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating task summary: ${error.message}`);
    return false;
  }
}

/**
 * Record execution step results and generate a task summary
 * @param {Object} options Command options
 * @param {string} options.prdFile Path to the Mini-PRD file
 * @param {string} options.stageName Name of the stage
 * @param {string} options.instructionsFile Optional path to the generated instructions file
 * @param {string} options.logFile Optional path to the execution log file
 * @param {string} options.feedbackFile Optional path to the user feedback file
 * @param {string} options.status Status of the execution step
 * @param {Object} config The jaw-tools configuration
 * @returns {Promise<Object>} Result of the operation
 */
async function recordExecutionStep(options, config) {
  try {
    const projectRoot = config.__projectRoot;
    
    // Validate required parameters
    if (!options.prdFile) {
      throw new Error('Missing required parameter: --prd-file');
    }
    if (!options.stageName) {
      throw new Error('Missing required parameter: --stage-name');
    }
    if (!options.status) {
      throw new Error('Missing required parameter: --status');
    }
    
    // Resolve file paths (support both absolute and relative paths)
    let prdFilePath = options.prdFile;
    if (!path.isAbsolute(prdFilePath)) {
      prdFilePath = path.resolve(process.cwd(), prdFilePath);
    }
    
    // Optional files
    const fileOptions = {
      instructionsFile: options.instructionsFile ? (path.isAbsolute(options.instructionsFile) ? options.instructionsFile : path.resolve(process.cwd(), options.instructionsFile)) : null,
      logFile: options.logFile ? (path.isAbsolute(options.logFile) ? options.logFile : path.resolve(process.cwd(), options.logFile)) : null,
      feedbackFile: options.feedbackFile ? (path.isAbsolute(options.feedbackFile) ? options.feedbackFile : path.resolve(process.cwd(), options.feedbackFile)) : null
    };
    
    // Check if PRD file exists
    if (!fs.existsSync(prdFilePath)) {
      throw new Error(`PRD file not found: ${prdFilePath}`);
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
    
    // Ensure the stage directory exists
    const stageDirPath = path.join(prdExecutionDir, options.stageName);
    await fsExtra.ensureDir(stageDirPath);
    
    // Copy files if provided
    let filesCopied = false;
    
    if (fileOptions.instructionsFile) {
      filesCopied = copyFileToStage(fileOptions.instructionsFile, stageDirPath, 'generated_instructions.md') || filesCopied;
    }
    
    if (fileOptions.logFile) {
      filesCopied = copyFileToStage(fileOptions.logFile, stageDirPath, 'execution_log.txt') || filesCopied;
    }
    
    if (fileOptions.feedbackFile) {
      filesCopied = copyFileToStage(fileOptions.feedbackFile, stageDirPath, 'user_feedback.md') || filesCopied;
    }
    
    // Create task_overview.md if it doesn't exist (in case bundle was skipped)
    const overviewPath = path.join(stageDirPath, 'task_overview.md');
    if (!fs.existsSync(overviewPath)) {
      console.log(`No task_overview.md found in ${options.stageName}, creating a basic one...`);
      
      const basicOverview = `---
generatedTimestamp: "${generateTimestamp()}"
stage: "${options.stageName}"
prdId: "${prdInfo.id}"
prdName: "${prdInfo.sanitizedName}"
---

# Task Overview: ${options.stageName}

**Execution Stage:** ${options.stageName}  
**PRD:** [${prdInfo.id} - ${prdInfo.sanitizedName}](${path.relative(stageDirPath, prdFilePath)})  
**Generated:** ${generateTimestamp()}

This stage was created directly with \`jaw-tools execution record-step\` without going through the \`bundle\` command.
`;
      fs.writeFileSync(overviewPath, basicOverview);
    }
    
    // Create the task summary file
    const stageInfo = {
      stageName: options.stageName,
      prdInfo,
      prdFilePath,
      status: options.status
    };
    
    const summarySuccess = await createTaskSummary(stageDirPath, stageInfo, config);
    
    if (!summarySuccess) {
      console.warn(`⚠️ Could not create task summary file.`);
    }
    
    return {
      success: true,
      stageDir: stageDirPath,
      status: options.status,
      filesCopied
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  recordExecutionStep
}; 