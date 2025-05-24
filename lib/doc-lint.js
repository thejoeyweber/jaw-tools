/**
 * @fileoverview Document linting utilities.
 */

const glob = require('glob');
const path = require('path');
const fs = require('fs');
const matter = require('gray-matter');

/**
 * Parses command line arguments for path, ignore patterns, fix mode, and verbose mode.
 * @param {string[]} argsArray - Array of command line arguments.
 * @returns {{searchPath: string, ignorePatterns: string[], fixMode: boolean, verboseMode: boolean}}
 */
function parseDocLintArgs(argsArray) {
  let searchPath = path.join('_docs', '**', '*.md'); // Default path
  let ignorePatterns = [];
  let fixMode = false;
  let verboseMode = false;

  for (let i = 0; i < argsArray.length; i++) {
    if (argsArray[i] === '--path' && i + 1 < argsArray.length) {
      let customPath = argsArray[i + 1];
      if (!customPath.endsWith('.md')) {
        customPath = path.join(customPath, '**', '*.md');
      }
      searchPath = customPath;
      i++; 
    } else if (argsArray[i] === '--ignore' && i + 1 < argsArray.length) {
      ignorePatterns = argsArray[i + 1].split(',');
      i++;
    } else if (argsArray[i] === '--fix') {
      fixMode = true;
    } else if (argsArray[i] === '--verbose') {
      verboseMode = true;
    }
  }
  return { searchPath, ignorePatterns, fixMode, verboseMode };
}

/**
 * Runs documentation linting.
 * @param {string[]} cliArgs - Command line arguments passed from the CLI.
 * @param {object} config - The jaw-tools configuration.
 */
function runDocLint(cliArgs, config) {
  const { searchPath, ignorePatterns, fixMode, verboseMode } = parseDocLintArgs(cliArgs);

  if (fixMode) console.log('🛠️ Auto-fix mode enabled.');
  if (verboseMode) console.log('🗣️ Verbose mode enabled.');

  const projectRoot = config.projectRoot || process.cwd();
  
  // Get docLint settings from config, with fallbacks for safety (though config-manager should provide them)
  const docLintConfig = config.docLint || {};
  const requiredFields = docLintConfig.requiredFields || ['docType', 'version', 'lastUpdated'];
  const autoFixFields = docLintConfig.autoFixFields || ['lastUpdated'];
  let configuredValidDocTypes = docLintConfig.validDocTypes || ['mini-prd', 'adr', 'sppg', 'prompt', 'reference'];

  // If 'docType' is auto-fixable and 'unknown' isn't a standard valid type, add it for the purpose of fixing.
  // This ensures that if we auto-add 'docType: unknown', it's not immediately flagged as invalid.
  const isDocTypeAutoFixable = autoFixFields.includes('docType');
  if (isDocTypeAutoFixable && !configuredValidDocTypes.includes('unknown')) {
    configuredValidDocTypes = [...configuredValidDocTypes, 'unknown'];
  }

  const semVerRegex = /^\d+\.\d+\.\d+$/;
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const todayISO = new Date().toISOString().split('T')[0];

  // --- Lint Rules Definition ---
  const lintRules = [
    checkTitleConsistency,
    // Future rules can be added here
  ];

  console.log(`Searching for Markdown files in: ${path.join(projectRoot, searchPath)}`);
  if (ignorePatterns.length > 0) {
    console.log(`Ignoring patterns: ${ignorePatterns.join(', ')}`);
  }

  // Summary counters and detailed messages store
  let filesProcessed = 0;
  let filesPassed = 0;
  let filesActuallyFixed = 0; // Renamed from filesFixed to avoid confusion with fixMode
  let filesFailed = 0;
  const detailedMessages = [];

  try {
    const files = glob.sync(searchPath, {
      ignore: ignorePatterns,
      nodir: true,
      cwd: projectRoot,
    });

    filesProcessed = files.length;

    if (filesProcessed === 0) {
      console.log('No Markdown files found matching the criteria.');
      // Still print summary for consistency, though it will be all zeros.
    } else {
      console.log(`Found ${filesProcessed} Markdown file(s). Linting...`);
    }

    files.forEach(file => {
      const filePath = path.join(projectRoot, file); // Relative path for reporting
      const fileReport = {
        filepath: file, // Store relative path
        status: 'passed', // Default status
        errors: [],
        fixes: [],
        warnings: [],
      };

      let fileHasErrors = false;
      let frontMatterWasModifiedInFixMode = false; // Tracks if fixes were applied
      let localFrontMatter;

      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsedFile = matter(fileContent);
        localFrontMatter = { ...parsedFile.data };
        const bodyContent = parsedFile.content;

        // --- Auto-fixing logic for front-matter ---
        if (fixMode) {
          if (autoFixFields.includes('docType') && !localFrontMatter.hasOwnProperty('docType')) {
            localFrontMatter.docType = 'unknown'; // Default fix for docType
            const fixMsg = "Added missing docType: 'unknown'";
            fileReport.fixes.push(fixMsg);
            frontMatterWasModifiedInFixMode = true;
          }
          if (autoFixFields.includes('version') && !localFrontMatter.hasOwnProperty('version')) {
            localFrontMatter.version = '1.0.0'; // Default fix for version
            const fixMsg = "Added missing version: '1.0.0'";
            fileReport.fixes.push(fixMsg);
            frontMatterWasModifiedInFixMode = true;
          }
          if (autoFixFields.includes('lastUpdated') && (!localFrontMatter.hasOwnProperty('lastUpdated') || localFrontMatter.lastUpdated !== todayISO)) {
            const oldDate = localFrontMatter.lastUpdated;
            localFrontMatter.lastUpdated = todayISO;
            let fixMsg;
            if (!oldDate) {
              fixMsg = `Added missing lastUpdated: '${todayISO}'`;
            } else if (oldDate !== todayISO) {
              fixMsg = `Updated lastUpdated from '${oldDate}' to '${todayISO}'`;
            }
            if (fixMsg) {
                fileReport.fixes.push(fixMsg);
                frontMatterWasModifiedInFixMode = true;
            }
          }
        }

        // --- Validation logic (uses potentially fixed localFrontMatter) ---
        const currentErrors = [];
        requiredFields.forEach(field => {
          if (!localFrontMatter.hasOwnProperty(field)) {
            currentErrors.push(`Missing required front-matter field: ${field}`);
          }
        });

        if (localFrontMatter.docType && !configuredValidDocTypes.includes(localFrontMatter.docType)) {
          currentErrors.push(`Invalid docType '${localFrontMatter.docType}'. Must be one of: ${configuredValidDocTypes.join(', ')}`);
        }
        // Version validation (only if version field exists, as requirement check is separate)
        if (localFrontMatter.hasOwnProperty('version') && !semVerRegex.test(localFrontMatter.version)) {
          currentErrors.push(`Invalid version format '${localFrontMatter.version}'. Must be SemVer (e.g., 1.0.0)`);
        }
        // lastUpdated validation (similarly, only if field exists)
        if (localFrontMatter.hasOwnProperty('lastUpdated') && !isoDateRegex.test(localFrontMatter.lastUpdated)) {
          currentErrors.push(`Invalid lastUpdated format '${localFrontMatter.lastUpdated}'. Must be YYYY-MM-DD`);
        }
        
        fileReport.errors.push(...currentErrors);
        if (currentErrors.length > 0) {
            fileHasErrors = true;
        }

        // --- Apply Pluggable Lint Rules (Warnings Only) ---
        lintRules.forEach(rule => {
          const ruleWarnings = rule({ file, frontMatter: localFrontMatter, bodyContent });
          fileReport.warnings.push(...ruleWarnings);
        });

        // --- Write back if modified by auto-fixer ---
        if (fixMode && frontMatterWasModifiedInFixMode) {
          try {
            // If there were errors AND fixes were applied, we want to see if fixes resolved them
            // Re-validate the fixed localFrontMatter to see if errors persist
            const errorsAfterFix = [];
            // Re-validate after potential fixes
            requiredFields.forEach(field => {
              if (!localFrontMatter.hasOwnProperty(field)) {
                errorsAfterFix.push(`Missing required field after fix attempt: ${field}`);
              }
            });
            if (localFrontMatter.docType && !configuredValidDocTypes.includes(localFrontMatter.docType)) {
              errorsAfterFix.push(`Invalid docType '${localFrontMatter.docType}' after fix.`);
            }
            if (localFrontMatter.hasOwnProperty('version') && !semVerRegex.test(localFrontMatter.version)) {
              errorsAfterFix.push(`Invalid version '${localFrontMatter.version}' after fix.`);
            }
            if (localFrontMatter.hasOwnProperty('lastUpdated') && !isoDateRegex.test(localFrontMatter.lastUpdated)) {
              errorsAfterFix.push(`Invalid lastUpdated '${localFrontMatter.lastUpdated}' after fix.`);
            }

            fileReport.errors = errorsAfterFix; // Update errors based on post-fix validation
            fileHasErrors = errorsAfterFix.length > 0; // Update error status

            const newContent = matter.stringify(bodyContent, localFrontMatter);
            fs.writeFileSync(filePath, newContent, 'utf8');
            // console.log(`💾 [${file}]: File updated with fixes.`); // Logging moved to summary
            if (!fileHasErrors) { // Only count as fixed if errors were actually resolved
                filesActuallyFixed++;
            }
          } catch (writeError) {
            const writeErrorMsg = `Error writing fixes to file: ${writeError.message}`;
            fileReport.errors.push(writeErrorMsg);
            // console.error(`❌ [${file}]: ${writeErrorMsg}`); // Logging moved to summary
            fileHasErrors = true;
          }
        }
        
        // Determine file status for summary
        if (fileHasErrors) {
          fileReport.status = 'failed';
          filesFailed++;
        } else if (frontMatterWasModifiedInFixMode) { // If it wasn't an error, but was fixed (e.g. only lastUpdated changed)
          fileReport.status = 'fixed';
          // filesActuallyFixed is already incremented if errors were resolved by fixes
          // This handles cases where a "fix" didn't resolve an error, or a "fix" was for a non-error (e.g. updating date)
          if (!fileReport.fixes.find(f => f.includes('lastUpdated')) || fileReport.fixes.length > 1 || currentErrors.length > 0) {
             // If more than just lastUpdated was "fixed" or if there were pre-existing errors that got fixed.
             // filesActuallyFixed would have been incremented if errors were truly fixed.
             // If it's just a date update without other errors, it's more of a "modified" than "fixed an error".
             // Let's refine this: if it had errors that are now gone, it's 'fixed'.
             // If it had no errors but was modified (e.g. date), it's also 'fixed' in the sense of being touched.
             // filesActuallyFixed is the key for "errors were present and are now gone".
             // If no errors were present, but it was modified (e.g. date update), we can count it here.
             if (currentErrors.length === 0) filesActuallyFixed++;
          }
        } else {
          fileReport.status = 'passed';
          filesPassed++;
        }

      } catch (e) {
        const processErrorMsg = `Error processing file: ${e.message}`;
        fileReport.errors.push(processErrorMsg);
        // console.error(`❌ [${file}]: ${processErrorMsg}`); // Logging moved to summary
        fileReport.status = 'failed';
        filesFailed++;
      }
      detailedMessages.push(fileReport);
    });

    // --- Print Summary ---
    console.log('\nDoc Lint Report');
    console.log('---------------------------------------');
    detailedMessages.forEach(report => {
      let statusIcon = '✔';
      let verboseMessage = '';
      if (report.status === 'failed') {
        statusIcon = '✖';
      } else if (report.status === 'fixed') {
        statusIcon = '🛠️';
      } else if (report.status === 'passed') {
        if (verboseMode && report.warnings.length === 0 && report.errors.length === 0 && report.fixes.length === 0) {
          verboseMessage = ' (All checks passed)';
        }
      }
      
      console.log(`${statusIcon} ${report.filepath}${verboseMessage}`);
      // Only print details if there are any, or if verbose mode is on for passed files (even if no warnings, to be explicit)
      if (report.errors.length > 0 || report.fixes.length > 0 || report.warnings.length > 0) {
        report.errors.forEach(err => console.log(`  • Error: ${err}`));
        report.fixes.forEach(fix => console.log(`  • Fix: ${fix}`));
        report.warnings.forEach(warn => console.log(`  • Warning: ${warn}`));
      } else if (verboseMode && report.status === 'passed') {
        // This case is for when a file passed, had no warnings/errors/fixes,
        // and verbose message "(All checks passed)" was already added.
        // No further individual messages needed here unless we want to add more details for verbose passed files.
      }
    });
    console.log('---------------------------------------');
    console.log(`${filesPassed} files passed | ${filesActuallyFixed} fixed | ${filesFailed} failed`);
    console.log('---------------------------------------');


    return { 
        filesProcessed, 
        filesPassed, 
        filesFixed: filesActuallyFixed, 
        filesFailed, 
        errorDetails: detailedMessages,
        success: filesFailed === 0 // Overall success if no files failed
    };

  } catch (error) {
    console.error(`Critical error during linting process: ${error.message}`);
    // Ensure all counters are initialized if glob fails
    return { 
        filesProcessed: filesProcessed || 0, 
        filesPassed: filesPassed || 0, 
        filesFixed: filesActuallyFixed || 0, 
        filesFailed: filesFailed || filesProcessed || 0, // If glob fails, all processed files (if any) are considered failed
        errorDetails: detailedMessages, 
        criticalError: error.message,
        success: false
    };
  }
}

module.exports = {
  runDocLint,
  parseDocLintArgs,
};

// --- Pluggable Lint Rule Implementations ---

/**
 * Checks if the H1 title in the Markdown body matches the filename.
 * @param {{ file: string, frontMatter: object, bodyContent: string }} fileData - Data for the file.
 * @returns {string[]} Array of warning messages.
 */
function checkTitleConsistency({ file, frontMatter, bodyContent }) {
  const warnings = [];
  const filenameWithoutExt = path.basename(file, path.extname(file));
  // Normalize filename: lowercase, replace hyphens/underscores with spaces
  const normalizedFilename = filenameWithoutExt.toLowerCase().replace(/[-_]/g, ' ');

  const h1Match = bodyContent.match(/^#\s+(.*)/m);

  if (h1Match && h1Match[1]) {
    const h1Title = h1Match[1].trim();
    // Normalize H1 title: lowercase
    const normalizedH1Title = h1Title.toLowerCase();

    if (normalizedFilename !== normalizedH1Title) {
      warnings.push(`Title Mismatch: Filename '${filenameWithoutExt}' (normalized: '${normalizedFilename}') does not match H1 title '${h1Title}' (normalized: '${normalizedH1Title}').`);
    }
  } else {
    // Optional: Warn if no H1 is found, though the requirement was about consistency if H1 exists.
    // warnings.push("No H1 title found in the document body.");
  }
  return warnings;
}
