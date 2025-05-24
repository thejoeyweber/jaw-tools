// src/workflow/run.js
const child_process = require('child_process');
const configManager = require('../config-manager'); // Adjust path as needed
const fs = require('fs'); // Not strictly needed now, but good to have for future fs ops

/**
 * Parses the workflow configuration from the main application config.
 * @param {object} config - The full application configuration object.
 * @returns {object} The workflows configuration object.
 * @throws {Error} If the workflows configuration is missing or not an object.
 */
function parseWorkflowConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid application configuration provided.');
  }
  if (!config.workflows || typeof config.workflows !== 'object') {
    // Return an empty object or throw an error. For now, let's throw.
    throw new Error('Workflows configuration is missing or invalid in jaw-tools.config.js. Expected an object under the "workflows" key.');
  }
  return config.workflows;
}

// Placeholder for other functions to be implemented
/**
 * Retrieves a specific workflow by its name from the workflows configuration.
 * @param {string} workflowName - The name of the workflow to retrieve.
 * @param {object} workflowsConfig - The workflows configuration object.
 * @returns {Array} The array of steps for the requested workflow.
 * @throws {Error} If the workflowName is not found in workflowsConfig, with a message listing available workflows.
 */
function getWorkflow(workflowName, workflowsConfig) {
  if (!workflowsConfig || typeof workflowsConfig !== 'object') {
    // This case should ideally be caught by parseWorkflowConfig, but good for robustness
    throw new Error('Invalid workflows configuration provided to getWorkflow.');
  }
  const workflow = workflowsConfig[workflowName];
  if (!workflow) {
    const availableWorkflows = Object.keys(workflowsConfig).join(', ');
    throw new Error(`Workflow "${workflowName}" not found. Available workflows are: ${availableWorkflows || 'None defined'}.`);
  }
  if (!Array.isArray(workflow)) {
    throw new Error(`Workflow "${workflowName}" is not structured correctly. Expected an array of steps.`);
  }
  return workflow;
}

/**
 * Executes the steps of a given workflow.
 * @param {string} workflowName - The name of the workflow (for logging).
 * @param {Array} workflowSteps - An array of step objects for the workflow.
 * @param {object} options - Contains flags like dryRun (boolean) and verbose (boolean).
 * @param {object} config - The full application configuration.
 * @returns {boolean} True if all steps completed successfully or were skipped (dryRun), false otherwise.
 */
function executeWorkflow(workflowName, workflowSteps, options, config) {
  if (options.verbose) {
    console.log(`Executing workflow: ${workflowName}`);
  }

  for (let i = 0; i < workflowSteps.length; i++) {
    const step = workflowSteps[i];
    const commandTemplate = step.command;
    const description = step.description || 'No description';
    const continueOnError = step.continueOnError === true; // Defaults to false

    if (options.verbose) {
      console.log(`\nProcessing step ${i + 1}/${workflowSteps.length}: ${description}`);
    }

    // Variable Substitution
    let substitutedCommand = commandTemplate;
    let unresolvedVariable = false;
    const variableRegex = /\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g;
    let match;

    while ((match = variableRegex.exec(commandTemplate)) !== null) {
      const varName = match[1];
      const varValue = process.env[varName];
      if (varValue === undefined) {
        console.error(`Error: Environment variable "${varName}" not found for step "${description}" in workflow "${workflowName}".`);
        unresolvedVariable = true;
        // No break here, identify all missing variables first
      } else {
        // Handle both ${VAR} and $VAR by effectively replacing the match
        substitutedCommand = substitutedCommand.replace(match[0], varValue);
      }
    }

    if (unresolvedVariable) {
      console.error(`Halting step "${description}" due to unresolved environment variables.`);
      if (continueOnError) {
        console.log(`Skipping step due to unresolved variable, but 'continueOnError' is true.`);
        if (options.verbose) console.log(`Step "${description}" skipped.`);
        continue; // Move to the next step
      } else {
        console.error(`Halting workflow "${workflowName}" due to unresolved variable and 'continueOnError' is false.`);
        return false; // Stop workflow execution
      }
    }

    if (options.dryRun) {
      console.log(`[DRY RUN] Command: ${substitutedCommand}`);
      console.log(`  ↳ Description: ${description}`);
      if (options.verbose) console.log(`Step "${description}" (dry run) completed.`);
      continue; // Skip actual execution for dry run
    }

    if (options.verbose) {
      console.log(`Running command: ${substitutedCommand}`);
    }

    try {
      child_process.execSync(substitutedCommand, { stdio: 'inherit' });
      if (options.verbose) {
        console.log(`Step "${description}" executed successfully.`);
      }
    } catch (error) {
      console.error(`Error executing command: ${substitutedCommand}`);
      console.error(`  ↳ Step: ${description}`);
      // error.stderr is often captured by stdio: 'inherit', but if not, error.message might contain some info.
      // console.error(error.toString()); // This can be verbose but helpful
      if (continueOnError) {
        console.warn(`Continuing to next step due to 'continueOnError: true' for step "${description}".`);
      } else {
        console.error(`Halting workflow "${workflowName}" due to error in step "${description}".`);
        return false; // Stop workflow execution
      }
    }
  }
  return true; // All steps completed successfully or were handled
}

function runWorkflow(workflowName, options = { dryRun: false, verbose: false }) {
  try {
    const config = configManager.getConfig(); // Assuming configManager.getConfig() exists
    const workflowsConfig = parseWorkflowConfig(config);
    // getWorkflow will throw if workflowName is not found, which is caught below
    const workflowSteps = getWorkflow(workflowName, workflowsConfig);

    console.log(`Starting workflow: ${workflowName}`);
    const success = executeWorkflow(workflowName, workflowSteps, options, config);

    if (success) {
      console.log(`\nWorkflow '${workflowName}' completed successfully.`);
    } else {
      console.error(`\nWorkflow '${workflowName}' failed or was halted due to errors.`);
    }
    return success;
  } catch (error) {
    console.error(`Error running workflow '${workflowName}': ${error.message}`);
    // Additional context, like "Make sure workflow is defined in jaw-tools.config.js"
    // or specific errors from parseWorkflowConfig/getWorkflow.
    return false;
  }
}

module.exports = {
  runWorkflow, // Main public API function
  // Exporting others for testing or advanced usage if necessary
  parseWorkflowConfig,
  getWorkflow,
  executeWorkflow
};
