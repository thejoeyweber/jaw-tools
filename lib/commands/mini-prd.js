'use strict';

// lib/commands/mini-prd.js
const MiniPrdManager = require('../mini-prd/manager');
const { loadConfig, ensureConfigExists, normalizePath } = require('../../bin/jaw-tools-cli');
const path = require('path'); // For path.relative in console logs

/**
 * @type {import('yargs').CommandModule}
 * @description Manages Mini-PRDs (Product Requirement Documents), including their creation,
 * update, snapshot generation (Repomix profile), and listing.
 */
module.exports = {
  command: 'mini-prd <subcommand>',
  aliases: ['mprd'],
  describe: 'Manage Mini-PRDs',
  /**
   * Builds the yargs configuration for the `mini-prd` command and its subcommands.
   * @param {import('yargs').Argv} yargs - The yargs instance.
   * @returns {import('yargs').Argv} The configured yargs instance.
   */
  builder: (yargs) => {
    return yargs
      .command(
        'create <name>',
        'Create a new Mini-PRD document and associated Repomix profile.',
        /** @param {import('yargs').Argv} yargs */
        (yargs) => {
          yargs
            .positional('name', { describe: 'Name of the Mini-PRD (will be slugified for filename).', type: 'string' })
            .option('includes', { type: 'string', describe: 'Comma-separated list of glob patterns for files/directories to include.' })
            .option('excludes', { type: 'string', describe: 'Comma-separated list of glob patterns to exclude.' })
            .option('plannedFiles', { type: 'string', describe: 'Comma-separated list of files planned for modification/creation.' });
        },
        /**
         * Handles the `mini-prd create` subcommand.
         * @async
         * @param {Object} argv - The yargs `argv` object.
         * @throws {Error} If creation fails.
         */
        async (argv) => {
          try {
            ensureConfigExists('mini-prd create');
            const config = loadConfig();
            const manager = new MiniPrdManager(config.__projectRoot);
            const options = {
              includes: argv.includes ? argv.includes.split(',') : undefined,
              excludes: argv.excludes ? argv.excludes.split(',') : undefined,
              plannedFiles: argv.plannedFiles ? argv.plannedFiles.split(',') : undefined,
            };
            const id = await manager.createPrd(argv.name, options);
            console.log(`✅ Created Mini-PRD ${id}: ${argv.name}`);
            const prdFilename = `${id}-${argv.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
            // Assuming config.directories.docs, etc. are correctly set up in jaw-tools.config.js
            const prdDocPath = normalizePath(config.directories.docs || '_docs', 'project-docs', 'prds', prdFilename);
            console.log(`📝 Markdown file: ${prdDocPath}`);
          } catch (error) {
            throw error;
          }
        }
      )
      .command(
        'update <id>',
        'Update an existing Mini-PRD (its scope, planned files, etc.).',
        /** @param {import('yargs').Argv} yargs */
        (yargs) => {
          yargs
            .positional('id', { describe: 'ID of the Mini-PRD to update.', type: 'string' })
            .option('name', { type: 'string', describe: 'New name for the Mini-PRD.' })
            .option('includes', { alias: ['add', 'include'], type: 'string', describe: 'Comma-separated list of glob patterns to include (replaces existing).' })
            .option('excludes', { alias: 'exclude', type: 'string', describe: 'Comma-separated list of glob patterns to exclude (replaces existing).' })
            .option('plannedFiles', { alias: 'planned', type: 'string', describe: 'Comma-separated list of planned files (replaces existing).' });
        },
        /**
         * Handles the `mini-prd update` subcommand.
         * @async
         * @param {Object} argv - The yargs `argv` object.
         * @throws {Error} If update fails.
         */
        async (argv) => {
          try {
            ensureConfigExists('mini-prd update');
            const config = loadConfig();
            const manager = new MiniPrdManager(config.__projectRoot);
            const options = {
              name: argv.name,
              includes: argv.includes ? argv.includes.split(',') : undefined,
              excludes: argv.excludes ? argv.excludes.split(',') : undefined,
              plannedFiles: argv.plannedFiles ? argv.plannedFiles.split(',') : undefined,
            };
            await manager.updatePrd(argv.id, options);
            console.log(`✅ Updated Mini-PRD ${argv.id}`);
            const updatedFields = Object.entries(options).filter(([, value]) => value !== undefined).map(([key]) => key).join(', ');
            if (updatedFields) console.log(`🔄 Updated fields: ${updatedFields}`);
          } catch (error) {
            throw error;
          }
        }
      )
      .command(
        'snapshot <id>',
        'Generate a Repomix code snapshot for a Mini-PRD based on its current scope.',
        /** @param {import('yargs').Argv} yargs */
        (yargs) => {
          yargs.positional('id', { describe: 'ID of the Mini-PRD to generate a snapshot for.', type: 'string' });
        },
        /**
         * Handles the `mini-prd snapshot` subcommand.
         * @async
         * @param {Object} argv - The yargs `argv` object.
         * @throws {Error} If snapshot generation fails.
         */
        async (argv) => {
          try {
            ensureConfigExists('mini-prd snapshot');
            const config = loadConfig();
            const manager = new MiniPrdManager(config.__projectRoot);
            const result = await manager.generateSnapshot(argv.id);
            if (!result || !result.success) {
              throw new Error(result?.error || `Failed to generate snapshot for Mini-PRD ${argv.id}.`);
            }
            console.log(`✅ Generated snapshot for Mini-PRD ${argv.id}`);
            console.log(`📁 Profile: ${result.profileName}`);
            if (result.output) { // If generateSnapshot provides path to output
                 console.log(`📄 Snapshot output: ${path.relative(process.cwd(), result.output)}`);
            }
          } catch (error) {
            throw error;
          }
        }
      )
      .command(
        'list',
        'List all existing Mini-PRDs.',
        /** @param {import('yargs').Argv} yargs */
        () => {}, // No specific options for list
        /**
         * Handles the `mini-prd list` subcommand.
         * @async
         * @param {Object} argv - The yargs `argv` object.
         * @throws {Error} If listing fails.
         */
        async (argv) => {
          try {
            ensureConfigExists('mini-prd list');
            const config = loadConfig();
            const manager = new MiniPrdManager(config.__projectRoot);
            const prds = await manager.listPrds();
            if (prds.length === 0) {
              console.log('No Mini-PRDs found.');
            } else {
              console.log('📋 Mini-PRDs:');
              prds.forEach(prd => console.log(`  - ${prd.id}: ${prd.name} (${prd.status || 'N/A'})`));
            }
          } catch (error) {
            throw error;
          }
        }
      )
      .demandCommand(1, 'Please specify a mini-prd subcommand. Valid options: create, update, snapshot, list.')
      .help();
  },
  /**
   * Default handler for the `mini-prd` command if no subcommand is provided.
   * @param {Object} argv - The yargs `argv` object.
   */
  handler: (argv) => {
    console.log("Please specify a subcommand for mini-prd. Use 'jaw-tools mini-prd --help' for options.");
  }
};
