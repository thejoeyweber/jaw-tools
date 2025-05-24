// lib/prompt-auditor.js
const fs = require('fs-extra'); // Using fs-extra for copyFileSync and writeFileSync
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');
const { spawnSync } = require('child_process'); 
const os = require('os'); 

/**
 * Scans a given path (file or directory) for .md files and parses their front-matter.
 * @param {string} scanPath - The path to the file or directory to scan.
 * @returns {Array<object>} An array of objects, each containing filepath, content, data (front-matter), and body.
 *                          Returns empty array on error.
 */
function scanPromptFiles(scanPath) {
  let filesToProcess = [];

  try {
    const stats = fs.statSync(scanPath);
    if (stats.isFile()) {
      if (scanPath.endsWith('.md')) {
        filesToProcess.push(path.resolve(scanPath));
      } else {
        console.warn(`Warning: Provided path is a file but not an .md file: ${scanPath}`);
        return [];
      }
    } else if (stats.isDirectory()) {
      filesToProcess = glob.sync('**/*.md', { cwd: scanPath, absolute: true });
    } else {
      console.error(`Error: Provided path is not a file or directory: ${scanPath}`);
      return [];
    }
  } catch (e) {
    // Handles errors like path does not exist from fs.statSync or glob.sync issues
    console.error(`Error accessing path ${scanPath}: ${e.message}`);
    return [];
  }

  const results = [];
  for (const filepath of filesToProcess) {
    try {
      const fileContent = fs.readFileSync(filepath, 'utf8');
      const { data, content: body } = matter(fileContent);
      results.push({
        filepath: filepath,
        originalContent: fileContent,
        frontMatter: data || {},
        body: body,
        issues: [],
        variablesUsed: [],
        fixesAppliedCount: 0 
      });
    } catch (e) {
      console.warn(`Warning: Could not read or parse file ${filepath}: ${e.message}`);
      results.push({
        filepath: filepath,
        originalContent: null,
        frontMatter: {},
        body: '',
        issues: [{ type: 'parsing_error', message: `Could not read or parse file: ${e.message}`, severity: 'critical' }],
        variablesUsed: [],
        fixesAppliedCount: 0
      });
    }
  }
  return results;
}

/**
 * Checks for required front-matter fields.
 */
function checkFrontMatter(fileObject, requiredFields) {
  requiredFields.forEach(field => {
    if (!fileObject.frontMatter.hasOwnProperty(field) || fileObject.frontMatter[field] === null || fileObject.frontMatter[field] === '') {
      fileObject.issues.push({
        type: 'front_matter_missing',
        message: `Front-matter field '${field}' is missing or empty.`,
        field: field,
        severity: 'critical'
      });
    }
  });
}

/**
 * Detects variables in the prompt body.
 */
function detectVariables(fileObject) {
  const variableRegex = /\{\{(?:\$)?\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match;
  const uniqueVariables = new Set();
  while ((match = variableRegex.exec(fileObject.body)) !== null) {
    uniqueVariables.add(match[1]);
  }
  fileObject.variablesUsed = Array.from(uniqueVariables);
  fileObject.variablesUsed.forEach(variableName => {
    fileObject.issues.push({
      type: 'variable_detected',
      message: `Detected variable: ${variableName}`,
      variable: variableName,
      severity: 'info'
    });
  });
}

/**
 * Checks for test plan inclusion if code generation keywords are present.
 */
function checkCodeGenTestPlan(fileObject, codeGenKeywords, testPlanKeywords) {
  const lowerBody = fileObject.body.toLowerCase();
  const hasCodeGenKeyword = codeGenKeywords.some(keyword => lowerBody.includes(keyword.toLowerCase()));
  if (hasCodeGenKeyword) {
    const hasTestPlanKeyword = testPlanKeywords.some(keyword => lowerBody.includes(keyword.toLowerCase()));
    if (!hasTestPlanKeyword) {
      fileObject.issues.push({
        type: 'missing_test_plan',
        message: 'Prompt seems to generate code but does not request a test plan.',
        severity: 'critical'
      });
    }
  }
}

/**
 * Attempts to fix missing front-matter fields.
 */
function fixMissingFrontMatter(fileObject, fixableFields) {
  let frontMatterChanged = false;
  const today = new Date().toISOString().split('T')[0];

  fileObject.issues.forEach(issue => {
    if (issue.type === 'front_matter_missing' && fixableFields.includes(issue.field) && !issue.fixed) {
      let defaultValue = '';
      switch (issue.field) {
        case 'docType':
          defaultValue = 'prompt'; 
          break;
        case 'version':
          defaultValue = '1.0.0'; 
          break;
        case 'lastUpdated':
          defaultValue = today; 
          break;
        default:
          defaultValue = `PLEASE_FILL_${issue.field.toUpperCase()}`;
      }
      fileObject.frontMatter[issue.field] = defaultValue;
      issue.fixed = true;
      issue.status = `Fixed (added ${issue.field}=${defaultValue})`;
      fileObject.fixesAppliedCount = (fileObject.fixesAppliedCount || 0) + 1;
      frontMatterChanged = true;
    }
  });
  return frontMatterChanged;
}

/**
 * Attempts to fix missing test plan instructions.
 */
function fixMissingTestPlan(fileObject, testPlanFixText) {
  let bodyChanged = false;
  const issueToFix = fileObject.issues.find(issue => issue.type === 'missing_test_plan' && !issue.fixed);

  if (issueToFix) {
    if (fileObject.body.length > 0 && !fileObject.body.endsWith('\n')) {
        fileObject.body += '\n';
    }
    fileObject.body += testPlanFixText; 
    issueToFix.fixed = true;
    issueToFix.status = 'Fixed (appended test plan instructions)';
    fileObject.fixesAppliedCount = (fileObject.fixesAppliedCount || 0) + 1;
    bodyChanged = true;
  }
  return bodyChanged;
}

/**
 * Runs an LLM-based audit on a single prompt file using an external command.
 */
function runLlmAudit(fileObject, llmAuditConfig) {
  if (!llmAuditConfig || !llmAuditConfig.enabled || !llmAuditConfig.command) {
    fileObject.issues.push({
      type: 'llm_audit_skipped',
      message: 'LLM audit was not run (disabled or command not configured).',
      severity: 'info'
    });
    return;
  }

  console.log(`  INFO: Starting LLM audit for ${path.basename(fileObject.filepath)}...`);
  const fullPromptForLlm = llmAuditConfig.auditPromptTemplate.replace('{RAW_PROMPT_CONTENT}', fileObject.originalContent);
  const tempFileName = `jaw_llm_audit_temp_${path.basename(fileObject.filepath)}.md`;
  const tempPromptFilePath = path.join(os.tmpdir(), tempFileName);

  try {
    fs.writeFileSync(tempPromptFilePath, fullPromptForLlm, 'utf8');
    
    const commandToExecute = llmAuditConfig.command.replace('{PROMPT_FILE}', `"${tempPromptFilePath}"`); // Quoted for paths with spaces
    const cmdParts = commandToExecute.split(' ');
    const command = cmdParts[0];
    const args = cmdParts.slice(1);

    const result = spawnSync(command, args, { 
      timeout: llmAuditConfig.timeoutMs || 30000,
      encoding: 'utf8',
      shell: process.platform === 'win32' 
    });

    if (result.error || result.status !== 0 || result.signal) {
      let errorMessage = 'LLM audit command failed or timed out.';
      if (result.error) errorMessage += ` Error: ${result.error.message}.`;
      if (result.signal) errorMessage += ` Signal: ${result.signal}.`;
      if (result.status !== 0) errorMessage += ` Exit code: ${result.status}.`;
      
      fileObject.issues.push({
        type: 'llm_audit_failed',
        message: errorMessage,
        severity: 'warning',
        details: result.stderr ? result.stderr.trim() : ''
      });
    } else {
      fileObject.issues.push({
        type: 'llm_audit_feedback',
        message: 'LLM Audit Feedback: ' + (result.stdout ? result.stdout.trim() : '(No output from LLM command)'),
        severity: 'info'
      });
    }
  } catch (e) {
    fileObject.issues.push({
      type: 'llm_audit_exception',
      message: `Exception during LLM audit execution: ${e.message}`,
      severity: 'warning'
    });
  } finally {
    try {
      if (fs.existsSync(tempPromptFilePath)) {
        fs.unlinkSync(tempPromptFilePath);
      }
    } catch (e) {
      console.warn(`Warning: Could not delete temporary LLM audit file ${tempPromptFilePath}: ${e.message}`);
    }
  }
}


// Main audit function
function auditPrompts(options, promptAuditConfigFromUser) {
  const internalDefaults = {
    defaultPromptPath: '_docs/prompts/',
    requiredFields: ['docType', 'version', 'lastUpdated'],
    requireTestInstructions: true,
    codeGenKeywords: ['write code', 'generate function', 'scaffold', 'create a class', 'export code', 'implement method'],
    testPlanKeywords: ['include test cases', 'generate unit tests', 'write test plan', 'ensure tests are included', 'testing instructions'],
    fixableFields: ['docType', 'version', 'lastUpdated'], 
    testPlanFixText: "\n\n---\nPlease conclude your output with a detailed test plan or include unit tests to validate the generated code.",
    llmAudit: { 
      enabled: false,
      command: '',
      timeoutMs: 30000,
      auditPromptTemplate: `Please audit the following LLM prompt for clarity and completeness:\n\n- Are all variables clearly defined and unambiguous?\n- Does it provide enough structure for reliable output?\n- If it asks the LLM to generate code, does it also require a test plan?\n\n---\n{RAW_PROMPT_CONTENT}`
    }
  };

  let effectiveConfig = { ...internalDefaults, ...(promptAuditConfigFromUser || {}) };
  if (promptAuditConfigFromUser && promptAuditConfigFromUser.llmAudit) {
    effectiveConfig.llmAudit = { ...internalDefaults.llmAudit, ...promptAuditConfigFromUser.llmAudit };
  } else {
    effectiveConfig.llmAudit = { ...internalDefaults.llmAudit }; 
  }
  
  const pathToScan = options.path || effectiveConfig.defaultPromptPath; // Use a different var name from 'path' module
  const resolvedPathToScan = path.resolve(pathToScan);

  if (!fs.existsSync(resolvedPathToScan)) {
    const errorMessage = `Error: Target path not found - ${resolvedPathToScan}`;
    console.error(errorMessage);
    return { summary: { scanned: 0, passed: 0, issues: 0, fixed: 0, error: `Path not found: ${resolvedPathToScan}` }, details: [] };
  }
  
  console.log(`Scanning path: ${resolvedPathToScan} (using config for rules)`);
  const parsedFiles = scanPromptFiles(resolvedPathToScan); // scanPromptFiles now handles file or dir

  if (parsedFiles.length === 0) { 
    console.log('No .md files found or accessible in the target path.');
    return { summary: { scanned: 0, passed: 0, issues: 0, fixed: 0 }, details: [] };
  }
  
  console.log(`Found ${parsedFiles.length} file(s) to audit.`);
  let totalFixedIssuesInSession = 0;

  for (const file of parsedFiles) { 
    file.fixesAppliedCount = 0; 
    if (file.issues.some(issue => issue.type === 'parsing_error')) continue;

    checkFrontMatter(file, effectiveConfig.requiredFields);
    detectVariables(file);
    if (effectiveConfig.requireTestInstructions) {
      checkCodeGenTestPlan(file, effectiveConfig.codeGenKeywords, effectiveConfig.testPlanKeywords);
    }

    // LLM Audit Pass - Always call runLlmAudit; it will check its own 'enabled' status
    // and add a 'skipped' message if not enabled or not configured.
    runLlmAudit(file, effectiveConfig.llmAudit); 

    let frontMatterChangedByFixer = false;
    let bodyChangedByFixer = false;

    if (options.fix) {
      if (file.issues.some(iss => iss.type === 'front_matter_missing' && iss.severity === 'critical' && !iss.fixed)) {
        if (fixMissingFrontMatter(file, effectiveConfig.fixableFields)) {
          frontMatterChangedByFixer = true;
        }
      }
      if (effectiveConfig.requireTestInstructions && file.issues.some(iss => iss.type === 'missing_test_plan' && iss.severity === 'critical' && !iss.fixed)) {
        if (fixMissingTestPlan(file, effectiveConfig.testPlanFixText)) {
          bodyChangedByFixer = true;
        }
      }
    }
    
    if (frontMatterChangedByFixer || bodyChangedByFixer) {
      if (!options.dryRun) {
        try {
          fs.copyFileSync(file.filepath, file.filepath + '.bak');
          console.log(`  INFO: Backup created for ${path.basename(file.filepath)} at ${path.basename(file.filepath)}.bak`);
          const newFileContent = matter.stringify(file.body, file.frontMatter);
          fs.writeFileSync(file.filepath, newFileContent, 'utf8');
          console.log(`  FIXED: ${path.basename(file.filepath)} (${file.fixesAppliedCount} issue(s) addressed).`);
        } catch (e) {
          console.error(`  ERROR: Could not write fixes to ${path.basename(file.filepath)}: ${e.message}`);
        }
      } else {
        console.log(`  DRY RUN: Would fix ${path.basename(file.filepath)} (${file.fixesAppliedCount} issue(s) addressed).`);
      }
    }
    totalFixedIssuesInSession += file.fixesAppliedCount;
  }

  let passedCount = 0;
  let issuesCount = 0; 
  parsedFiles.forEach(file => {
    const remainingCriticalIssues = file.issues.filter(iss => iss.severity === 'critical' && !iss.fixed);
    if (remainingCriticalIssues.length === 0) { 
      passedCount++;
    }
    issuesCount += remainingCriticalIssues.length;
  });

  return {
    summary: {
      scanned: parsedFiles.length,
      passed: passedCount,
      issues: issuesCount, 
      fixed: totalFixedIssuesInSession
    },
    details: parsedFiles.map(f => ({
      filepath: f.filepath,
      issues: f.issues, 
      fixedCount: f.fixesAppliedCount 
    }))
  };
}

module.exports = {
  scanPromptFiles,
  auditPrompts,
  checkFrontMatter,
  detectVariables,
  checkCodeGenTestPlan,
  fixMissingFrontMatter,
  fixMissingTestPlan,
  runLlmAudit 
};
