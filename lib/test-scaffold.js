// lib/test-scaffold.js
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');

async function scaffoldTests(featureNameSlug, cliOptions, config) {
  // Validate featureNameSlug (basic validation for now)
  if (!/^[a-zA-Z0-9_-]+$/.test(featureNameSlug)) {
    console.error('Error: Invalid <feature-name-slug>. Use only alphanumeric characters, underscores, or hyphens.');
    return { success: false, filesCreated: [] };
  }

  const featureDirPath = path.join('features', featureNameSlug);
  const testScaffoldConfig = config.testScaffold || {};
  const templateDir = path.resolve(testScaffoldConfig.templateDir || 'templates/tests/');
  const fileNamingPattern = testScaffoldConfig.fileNaming || '{feature}.{type}.test.ts';
  const todoMarkerTemplate = testScaffoldConfig.todoMarker || '// TODO: write meaningful assertions for <FEATURE_NAME>';
  const filesCreated = [];

  // 1. Detect or Create the Feature Folder
  let featureFolderExists = fs.existsSync(featureDirPath);
  if (!featureFolderExists) {
    if (cliOptions.dryRun) {
      console.log(`[dry-run] Feature folder '${featureDirPath}' does not exist.`);
      console.log(`[dry-run] Would prompt to create feature folder: ${featureDirPath}`);
      // For dry run, assume 'yes' to creation to show what test files would be made.
      featureFolderExists = true; // Simulate existence for dry run flow
    } else {
      const { createFolder } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createFolder',
          message: `Feature folder '${featureDirPath}' not found. Create it?`,
          default: true,
        },
      ]);

      if (createFolder) {
        try {
          fs.mkdirSync(featureDirPath, { recursive: true });
          console.log(`Created feature folder: ${featureDirPath}`);
          featureFolderExists = true;
        } catch (e) {
          console.error(`Error creating feature folder ${featureDirPath}: ${e.message}`);
          return { success: false, filesCreated };
        }
      } else {
        console.log('Aborted by user. Feature folder not created.');
        return { success: false, aborted: true, filesCreated };
      }
    }
  } else {
    console.log(`Feature folder found: ${featureDirPath}`);
  }

  // If feature folder still doesn't "exist" (even in dry-run simulation), abort.
  if (!featureFolderExists) {
      console.error("Cannot proceed without feature folder."); // Should not happen if dry-run logic is correct
      return { success: false, filesCreated };
  }

  // 2. Determine Test Suites to Scaffold
  let suitesToScaffold = testScaffoldConfig.defaultTypes || ['unit', 'integration', 'a11y', 'api'];
  if (cliOptions.types && cliOptions.types.length > 0) { // This was adjusted from prompt to ensure types is an array with items
    suitesToScaffold = cliOptions.types;
  } else if (cliOptions.all) {
    // suitesToScaffold is already defaulted to all configured defaultTypes
  }
  console.log(`Test suites to scaffold for '${featureNameSlug}': ${suitesToScaffold.join(', ')}`);


  // 3. Template Processing and File Writing
  const testsDirPath = path.join(featureDirPath, '__tests__');

  for (const suiteType of suitesToScaffold) {
    const templateFileName = `${suiteType}.test.template.ts`; // Or derive from config if more complex
    const templateFilePath = path.join(templateDir, templateFileName);

    if (!fs.existsSync(templateFilePath)) {
      console.warn(`Warning: Template file not found for type '${suiteType}': ${templateFilePath}. Skipping.`);
      continue;
    }

    let templateContent;
    try {
      templateContent = fs.readFileSync(templateFilePath, 'utf8');
    } catch (e) {
      console.warn(`Warning: Error reading template file ${templateFilePath}: ${e.message}. Skipping '${suiteType}'.`);
      continue;
    }

    // Replace placeholders
    // <FEATURE_NAME> in todoMarker is handled separately
    const featureNamePlaceholder = /<FEATURE_NAME>/g;
    const importPathPlaceholder = /<IMPORT_PATH>/g;
    
    // Determine import path. Example: features/my-feature/index.js or features/my-feature/my-feature.js
    // This is a heuristic. Assumes main feature file might be index.js or featureNameSlug.js directly in featureDirPath
    // For features/my-slug/__tests__/my-slug.unit.test.ts, import path to features/my-slug/index.js is '../../index.js'
    const relativeSourcePath = `../../${featureNameSlug}`; // Or more sophisticated logic needed

    let processedContent = templateContent.replace(featureNamePlaceholder, featureNameSlug);
    processedContent = processedContent.replace(importPathPlaceholder, relativeSourcePath); // Adjust if import logic is different

    // Insert todoMarker (which itself might contain <FEATURE_NAME>)
    const finalTodoMarker = (todoMarkerTemplate || '').replace(featureNamePlaceholder, featureNameSlug);
    // A common place to put TODO is after imports or at the start of a describe block.
    // For simplicity, let's assume templates have a specific line like "// INSERT_TODO_MARKER_HERE"
    // or we append it if no such marker exists.
    const insertTodoPlaceholder = /\/\/\s*INSERT_TODO_MARKER_HERE/g;
    if (insertTodoPlaceholder.test(processedContent)) {
        processedContent = processedContent.replace(insertTodoPlaceholder, finalTodoMarker);
    } else {
        // Fallback: append to the end of the file or a sensible default location
        // A more robust solution might be to find the first empty line after imports or
        // before the first 'describe' or 'it' block.
        // For now, appending after a newline ensures it's on its own line.
        processedContent += `\n${finalTodoMarker}\n`; 
    }


    // Determine target file path
    const targetFileName = fileNamingPattern
      .replace('{feature}', featureNameSlug)
      .replace('{type}', suiteType);
    const targetFilePath = path.join(testsDirPath, targetFileName);

    if (cliOptions.dryRun) {
      console.log(`[dry-run] Would create/overwrite test file: ${targetFilePath}`);
      if (fs.existsSync(targetFilePath) && !cliOptions.force) {
        console.log(`[dry-run] File ${targetFilePath} exists and --force not used. Would skip.`);
      }
      filesCreated.push(targetFilePath); // In dry-run, list what would be created/managed
      continue; // Skip actual writing in dry-run
    }

    // Actual file writing
    if (fs.existsSync(targetFilePath) && !cliOptions.force) {
      console.log(`Skipping existing file: ${targetFilePath} (use --force to overwrite)`);
      continue;
    }

    try {
      if (!fs.existsSync(testsDirPath)) {
        fs.mkdirSync(testsDirPath, { recursive: true });
      }
      fs.writeFileSync(targetFilePath, processedContent, 'utf8');
      // console.log(`Created test file: ${targetFilePath}`); // Reporting will be done at the end
      filesCreated.push(targetFilePath);
    } catch (e) {
      console.error(`Error writing file ${targetFilePath}: ${e.message}`);
      // Potentially collect errors and report them all at the end
    }
  }
  
  // Reporting will be handled in the next step.
  // For now, just return the list of files that were (or would have been) created.
  return { success: true, filesCreated, featurePath: featureDirPath, suites: suitesToScaffold };
}

module.exports = { scaffoldTests };
