'use strict';

// lib/commands/execution.js
const executionLib = require('../execution'); // Points to lib/execution/index.js
const { loadConfig, ensureConfigExists, camelCase } = require('../../bin/jaw-tools-cli'); 
const path = require('path'); // Needed for path.relative if used in console logs

/**
 * @type {import('yargs').CommandModule}
 * @description Manages the AI-assisted execution workflow, including initialization,
 * bundling context for stages, and recording step results.
 */
module.exports = {
  command: 'execution <subcommand>',
  aliases: ['e'],
  describe: 'Manage AI-assisted execution workflow',
  /**
   * Builds the yargs configuration for the `execution` command and its subcommands.
   * @param {import('yargs').Argv} yargs - The yargs instance.
   * @returns {import('yargs').Argv} The configured yargs instance.
   */
  builder: (yargs) => {
    return yargs
      .command(
        'init',
        'Initialize execution tracking for a Mini-PRD',
        /** @param {import('yargs').Argv} yargs */
        (yargs) => {
          yargs.option('prd-file', {
            type: 'string',
            describe: 'Path to the Mini-PRD file to initialize execution tracking for.',
            demandOption: true,
          });
        },
        /**
         * Handles the `execution init` subcommand.
         * @async
         * @param {Object} argv - The yargs `argv` object.
         * @param {string} argv.prdFile - Path to the PRD file.
         * @throws {Error} If initialization fails.
         */
        async (argv) => {
          try {
            ensureConfigExists('execution init');
            const config = loadConfig();
            const options = { prdFile: argv.prdFile };
            // Assumes executionLib.initExecution is async and returns { success, error, prdId, prdName }
            const result = await executionLib.initExecution(options, config);
            if (!result || !result.success) {
              throw new Error(result?.error || 'Error initializing execution.');
            }
            console.log(`✅ Execution tracking initialized for PRD ${result.prdId}: ${result.prdName}`);
          } catch (error) {
            throw error; // Propagate to yargs .fail() handler in main CLI
          }
        }
      )
      .command(
        'bundle',
        'Bundle context for an execution stage',
        /** @param {import('yargs').Argv} yargs */
        (yargs) => {
          yargs
            .option('prd-file', { type: 'string', describe: 'Path to the Mini-PRD file.', demandOption: true })
            .option('stage-name', { type: 'string', describe: 'Name of the execution stage (e.g., "01_initial_impl", "02_refactor").', demandOption: true })
            .option('meta-prompt', { type: 'string', describe: 'Path to the meta-prompt template file.', demandOption: true })
            .option('repomix-profile', { type: 'string', describe: 'Name of the Repomix profile to use for code snapshot.' })
            .option('prev-stage-summary', { type: 'string', describe: 'Path to the summary file from the previous stage, if any.' });
        },
        /**
         * Handles the `execution bundle` subcommand.
         * @async
         * @param {Object} argv - The yargs `argv` object.
         * @throws {Error} If bundling fails.
         */
        async (argv) => {
          try {
            ensureConfigExists('execution bundle');
            const config = loadConfig();
            const options = {
              prdFile: argv.prdFile,
              stageName: argv.stageName,
              metaPrompt: argv.metaPrompt,
              repomixProfile: argv.repomixProfile,
              prevStageSummary: argv.prevStageSummary,
            };
            // Assumes executionLib.bundleExecution is async and returns { success, error, stageDir, compiledMetaPrompt }
            const result = await executionLib.bundleExecution(options, config);
            if (!result || !result.success) {
              throw new Error(result?.error || 'Error bundling execution.');
            }
            console.log(`✅ Execution bundle prepared for stage: ${options.stageName}`);
            console.log(`📁 Stage directory: ${path.relative(process.cwd(), result.stageDir)}`);
            console.log(`📄 Compiled meta-prompt: ${path.relative(process.cwd(), result.compiledMetaPrompt)}`);
          } catch (error) {
            throw error;
          }
        }
      )
      .command(
        'record-step',
        'Record execution step results and generate summary',
        /** @param {import('yargs').Argv} yargs */
        (yargs) => {
          yargs
            .option('prd-file', { type: 'string', describe: 'Path to the Mini-PRD file.', demandOption: true })
            .option('stage-name', { type: 'string', describe: 'Name of the execution stage being recorded.', demandOption: true })
            .option('status', { type: 'string', describe: 'Status of the step (e.g., "success", "success-with-issues", "failed").', demandOption: true })
            .option('instructions-file', { type: 'string', describe: 'Path to the generated instructions file used for this step.' })
            .option('log-file', { type: 'string', describe: 'Path to the execution log file from this step.' })
            .option('feedback-file', { type: 'string', describe: 'Path to the user feedback file for this step.' });
        },
        /**
         * Handles the `execution record-step` subcommand.
         * @async
         * @param {Object} argv - The yargs `argv` object.
         * @throws {Error} If recording the step fails.
         */
        async (argv) => {
          try {
            ensureConfigExists('execution record-step');
            const config = loadConfig();
            const options = {
              prdFile: argv.prdFile,
              stageName: argv.stageName,
              status: argv.status,
              instructionsFile: argv.instructionsFile,
              logFile: argv.logFile,
              feedbackFile: argv.feedbackFile,
            };
            // Assumes executionLib.recordExecutionStep is async and returns { success, error, stageDir, status }
            const result = await executionLib.recordExecutionStep(options, config);
            if (!result || !result.success) {
              throw new Error(result?.error || 'Error recording execution step.');
            }
            console.log(`✅ Execution step recorded for stage: ${options.stageName}`);
            console.log(`📁 Stage directory: ${path.relative(process.cwd(), result.stageDir)}`);
            console.log(`🔖 Status: ${result.status}`);
          } catch (error) {
            throw error;
          }
        }
      )
      .demandCommand(1, 'Please specify an execution subcommand. Valid options: init, bundle, record-step.')
      .help();
  },
  /**
   * Default handler for the `execution` command if no subcommand is provided.
   * Yargs' .demandCommand() should typically handle this by showing help.
   * @param {Object} argv - The yargs `argv` object.
   */
  handler: (argv) => {
    // This function is called if 'jaw-tools execution' is run without a subcommand.
    // yargs.help() within the builder or .demandCommand() should usually show help.
    // If not, this handler can be used to provide guidance.
    console.log("Please specify a subcommand for execution. Use 'jaw-tools execution --help' for options.");
  }
};
