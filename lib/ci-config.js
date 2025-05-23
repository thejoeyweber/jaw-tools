// lib/ci-config.js
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const configManager = require('../src/config-manager');
const { findProjectRoot } = require('../src/config-manager'); // Assuming this utility is needed

async function generateCIConfig(options = {}) {
  try {
    const projectRoot = findProjectRoot() || process.cwd();
    const config = configManager.getConfig();
    const ciConfig = config.ciConfig;

    // 1. Determine provider and output path
    const provider = options.provider || ciConfig.provider;
    let outputPath = options.out || ciConfig.out;
    if (!path.isAbsolute(outputPath)) {
      outputPath = path.join(projectRoot, outputPath);
    }
    
    // console.log(`Provider: ${provider}`); // For debugging

    // 2. Stages to include (non-interactive for now)
    const stagesToInclude = ciConfig.stages; // Use order from config

    // 3. Load & Populate Stage Templates
    let jobs = {};
    for (const stage of stagesToInclude) {
      const templateFileName = `${stage.name}.stage.yml`;
      // Corrected path to be relative to the project root, then into `templates/ci`
      const templatePath = path.join(projectRoot, 'templates', 'ci', templateFileName);

      if (!await fs.pathExists(templatePath)) {
        console.error(`Error: Template file not found: ${templatePath}. Skipping stage: ${stage.name}`);
        continue;
      }

      let templateContent = await fs.readFile(templatePath, 'utf8');
      
      // Basic placeholder substitution
      const jobName = stage.name.replace(/[^a-zA-Z0-9_-]/g, '_'); // Sanitize job name, allow underscore and hyphen
      templateContent = templateContent.replace(/<JOB_NAME>/g, jobName);
      templateContent = templateContent.replace(/<COMMAND>/g, stage.command);
      
      // Each stage template is expected to be a job definition
      try {
        const stageJob = yaml.load(templateContent);
        jobs = { ...jobs, ...stageJob };
      } catch (e) {
        console.error(`Error parsing YAML for stage ${stage.name} from ${templatePath}: ${e.message}`);
        continue;
      }
    }

    // 4. Compose Final Workflow YAML
    const finalWorkflow = {
      name: 'CI',
      on: { // Standard GitHub Actions trigger syntax
        push: {
          branches: [ 'main', 'master', 'develop' ] // Common branches
        },
        pull_request: {
          branches: [ 'main', 'master', 'develop' ]
        }
      },
      env: ciConfig.env, // Add shared env
      jobs: jobs,
    };
    
    const yamlOutput = yaml.dump(finalWorkflow, { noRefs: true, lineWidth: -1 }); // lineWidth: -1 to prevent wrapping

    // 5. Write & Validate
    if (options.dryRun) {
      console.log("\n--- Generated CI Workflow (Dry Run) ---");
      console.log(yamlOutput);
    } else {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      await fs.ensureDir(outputDir);
      
      await fs.writeFile(outputPath, yamlOutput);
      console.log(`✅ CI workflow written to ${outputPath}`);

      // Validate by trying to load it back
      try {
        yaml.load(await fs.readFile(outputPath, 'utf8'));
        console.log('✅ YAML syntax is valid.');
      } catch (e) {
        console.error(`❌ YAML Validation Error in generated file ${outputPath}: ${e.message}`);
        // Optionally, attempt to remove the invalid file
        // await fs.remove(outputPath);
        // console.warn(`Removed invalid file: ${outputPath}`);
        return { success: false, error: 'YAML validation failed after writing file' };
      }
    }
    return { success: true, path: options.dryRun ? null : outputPath, content: yamlOutput };

  } catch (error) {
    console.error(`❌ Error generating CI config: ${error.message}`);
    if (error.stack && process.env.DEBUG) { // Only show stack in debug mode
        console.error(error.stack);
    }
    return { success: false, error: error.message };
  }
}

module.exports = { generateCIConfig };
