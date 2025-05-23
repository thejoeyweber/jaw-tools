# jaw-tools

AI development utilities for Repomix and prompt compilation. This toolkit provides a streamlined workflow for using AI with your codebase, including:

- Repomix profile management for generating codebase snapshots
- Prompt template compilation with file inclusion
- Sequential command execution for automated workflows
- Project scaffolding for documentation and standard files
- Diagnostic tools for setup validation

## Table of Contents
- [Installation](#installation)
  - [One-Step Installation (Recommended)](#one-step-installation-recommended)
  - [Manual Installation](#manual-installation)
- [Usage](#usage)
  - [Project Scaffolding](#project-scaffolding)
  - [Template Refresh](#template-refresh)
  - [Repomix Profiles Refresh](#repomix-profiles-refresh)
  - [Repomix Profiles](#repomix-profiles)
  - [Prompt Compilation](#prompt-compilation)
  - [Sequential Command Runner](#sequential-command-runner)
  - [System Diagnostics](#system-diagnostics)
- [Configuration](#configuration)
- [Command Reference](#command-reference)
- [Troubleshooting](#troubleshooting)
  - [Installation Issues](#installation-issues)
  - [Common Issues](#common-issues)

## Installation

### One-Step Installation (Recommended)

The easiest way to get started is with our one-step initialization:

```bash
# Install jaw-tools (recommended if published on npm)
npm install --save-dev jaw-tools
```
(This is the standard method if `jaw-tools` is published on npm.)

Alternatively, to install directly from the GitHub repository (e.g., for the latest development version):
```bash
npm install --save-dev https://github.com/thejoeyweber/jaw-tools/tarball/master
```
*Note: If installing directly from GitHub, you may need to replace `master` with the current default branch name (e.g., `main`).*

After installing, run the complete initialization process:
```bash
# Run the complete initialization process
npx jaw-tools-init
```

This will:
1. Set up jaw-tools with guided configuration and dependency checks
2. Scaffold standard documentation files
3. Verify your installation is working correctly

### Manual Installation

If you prefer more control, you can perform each step individually:

```bash
# Step 1: Install jaw-tools
# Recommended if published on npm:
npm install --save-dev jaw-tools
```
(This is the standard method if `jaw-tools` is published on npm.)

Alternatively, to install directly from the GitHub repository:
```bash
npm install --save-dev https://github.com/thejoeyweber/jaw-tools/tarball/master
```
*Note: If installing directly from GitHub, you may need to replace `master` with the current default branch name (e.g., `main`).*

```bash
# Step 2: Run guided setup (checks dependencies and configures your project)
npx jaw-tools setup

# Step 3: Scaffold documentation suite (adds standard project docs)
npx jaw-tools scaffold

# Step 4: Check installation status
npx jaw-tools doctor
```

## Usage

### Project Scaffolding

Scaffold the standard documentation structure and files to your project:

```bash
# Standard scaffolding (interactive for existing files)
npx jaw-tools scaffold

# Force overwriting of existing files
npx jaw-tools scaffold --force
```

This process:
- Create the standard documentation directory structure
- Copy template files for various document types
- Add a jaw-tools user guide to your docs directory
- Interactively handle file conflicts unless --force is used

### Template Refresh

Refresh your project templates with the latest versions:

```bash
# Refresh all templates (interactive for conflicts)
npx jaw-tools refresh

# Force overwrite all templates
npx jaw-tools refresh --force

# Refresh specific templates (by pattern)
npx jaw-tools refresh --pattern=project-docs/templates

# Refresh in non-interactive mode
npx jaw-tools refresh --yes
```

This process:
- Check for new or updated templates
- Version-check template files to identify updates
- Interactively handle conflicts with existing files
- Only update files when newer versions are available

### Repomix Profiles Refresh

Add new repomix profiles without modifying existing ones:

```bash
# Refresh repomix profiles
npx jaw-tools refresh-profiles
```

This will add any new profiles from the jaw-tools templates without modifying your customized profiles.

### Repomix Profiles

Manage and run Repomix profiles to generate codebase snapshots for AI:

```bash
# List all available profiles
npx jaw-tools repomix list

# Run a specific profile
npx jaw-tools repomix run full-codebase

# Add a new profile
npx jaw-tools repomix add frontend "app/**,components/**" "*.test.js"

# Delete a profile
npx jaw-tools repomix delete old-profile
```

### Prompt Compilation

Compile prompt templates with file content inclusion:

```bash
# Compile a prompt template
npx jaw-tools compile _docs/prompts/my-prompt.md
```

In your templates, you can include file contents using the `{{path/to/file}}` syntax (no spaces between brackets):

```markdown
# My Template

Here's the project configuration:

```json
{{package.json}}
```

You can also include files matching a glob pattern:

```javascript
{{src/**/*.js}}
```

IMPORTANT: Make sure there are no spaces between the double braces and the file path, otherwise it will result in an error like: `<!-- ERROR: Could not read file file-path -->`.

### Sequential Command Runner

You can define sequences of commands to run in order. This is useful for automating common workflows like generating snapshots and compiling prompts.

```js
// In jaw-tools.config.js
workflow: {
  sequences: {
    'default': [
      ['repomix-profile', ['run', 'full-codebase']],
      ['repomix-profile', ['run', 'docs-only']],
      ['compile-prompt', ['_docs/prompts/example.md']]
    ],
    'custom': [
      ['repomix-profile', ['run', 'docs-only']],
      ['compile-prompt', ['_docs/prompts/custom-prompt.md']]
    ]
  },
  defaultSequence: 'default'
}
```

Run the default sequence:
```bash
npx jaw-tools workflow
```

Run a specific sequence:
```bash
npx jaw-tools workflow custom
```

List available sequences:
```bash
npx jaw-tools workflow list
```

### System Diagnostics

Check the health of your jaw-tools setup:

```bash
npx jaw-tools doctor
```

This will verify:
- Configuration file exists
- Required directories are present
- Repomix integration is working
- Profiles manager is properly installed

### Execution Workflow
The `execution` commands help manage and track AI-assisted development tasks based on Mini-PRDs, creating a structured workflow for each stage of development.

-   **Initialize Execution Tracking:**
    Sets up the necessary directory structure for tracking execution stages related to a specific Mini-PRD.
    ```bash
    npx jaw-tools execution init --prd-file _docs/project-docs/prds/001-my-feature-prd.md
    ```

-   **Bundle Context for an Execution Stage:**
    Gathers all necessary context (PRD, code snapshot, meta-prompt, previous summaries) into a dedicated stage directory for an AI to work on.
    ```bash
    npx jaw-tools execution bundle --prd-file _docs/project-docs/prds/001-my-feature-prd.md --stage-name "01_initial_coding" --meta-prompt _docs/prompts/meta/coding_meta_prompt.md --repomix-profile prd-001-my-feature-prd
    ```
    *   `--prd-file`: Path to the Mini-PRD file.
    *   `--stage-name`: A unique name for this execution stage (e.g., "01_initial_coding", "02_refinement").
    *   `--meta-prompt`: Path to the meta-prompt template that will guide the AI for this stage.
    *   `--repomix-profile` (optional): Specifies a Repomix profile for the code snapshot. If not provided, uses the default or a PRD-specific profile.
    *   `--prev-stage-summary` (optional): Path to the summary file from a previous execution stage, used for continuity.

-   **Record Execution Step Results:**
    Records the outcome, logs, and any generated artifacts from an execution step, and can generate a summary.
    ```bash
    npx jaw-tools execution record-step --prd-file _docs/project-docs/prds/001-my-feature-prd.md --stage-name "01_initial_coding" --status "success-with-issues" --log-file path/to/ai_output.log --feedback-file path/to/my_feedback.md
    ```
    *   `--status`: The status of the step (e.g., `success`, `failure`, `success-with-issues`, `pending-review`).
    *   `--instructions-file` (optional): Path to the actual instructions given to the AI for this step.
    *   `--log-file` (optional): Path to any logs generated by the AI or the process.
    *   `--feedback-file` (optional): Path to a file containing your feedback or review of the AI's output for this step.

### Mini-PRD Management
Mini-PRDs (Product Requirement Documents) are lightweight, version-controlled documents used to scope and guide AI development tasks. These commands help create and manage them.

-   **Create a new Mini-PRD:**
    Initializes a new Mini-PRD markdown file from a template, pre-filled with a unique ID and basic structure.
    ```bash
    npx jaw-tools mini-prd create "User Authentication Feature"
    ```
    You can also specify a custom template, and define the initial scope with includes, excludes, and planned files:
    ```bash
    npx jaw-tools mini-prd create "Advanced Search API" --template _docs/project-docs/templates/api-feature-template.md --includes "src/api/**/*.js,src/lib/search/**" --excludes "src/api/tests/**" --plannedFiles "src/api/search.js,src/lib/search/indexer.js"
    ```

-   **Update an existing Mini-PRD:**
    Modifies the front-matter of an existing Mini-PRD. This is useful for changing its name, description, status, or redefining its scope (includes, excludes, planned files).
    ```bash
    npx jaw-tools mini-prd update 001 --name "User OAuth2 Authentication" --status "in-progress" --includes "src/auth/**,src/models/user.js"
    ```
    Replace `001` with the actual ID of the Mini-PRD.

-   **Generate a Repomix Profile (Snapshot) from a Mini-PRD:**
    Creates or updates a Repomix profile specifically tailored to the `includes` and `excludes` defined in the Mini-PRD's front-matter. This profile can then be used to generate a focused code snapshot.
    ```bash
    npx jaw-tools mini-prd snapshot 001
    ```

-   **List all Mini-PRDs:**
    Displays a list of all Mini-PRDs found in the project, showing their ID, name, and current status.
    ```bash
    npx jaw-tools mini-prd list
    ```

## Configuration

jaw-tools uses a configuration file named `jaw-tools.config.js` in your project root. This file allows you to customize various aspects of the toolkit.

Here's an example `jaw-tools.config.js` showing all default options and explanations for each top-level key:

```javascript
module.exports = {
  // Specifies key directories used by jaw-tools for organizing files.
  directories: {
    repomixProfiles: '.repomix-profiles', // Folder for storing Repomix profiles
    docs: '_docs', // Main directory for all project documentation
    prompts: '_docs/prompts', // Source directory for prompt templates
    compiledPrompts: '_docs/prompts-compiled', // Output directory for compiled prompts
    projectDocs: '_docs/project-docs', // Directory for general project-related documents (like SPPG, North Star)
    miniPrdTemplatePath: '_docs/project-docs/templates/mini-prd-template.md' // Path to the default template for Mini-PRDs
  },
  
  // Configuration for Repomix integration.
  repomix: {
    // Default profiles automatically available for codebase snapshotting.
    defaultProfiles: {
      'full-codebase': {
        include: '**',
        ignore: '.git/**,node_modules/**,.next/**,out/**,build/**,coverage/**',
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
    // Environment variables to make available during Repomix execution (if needed).
    env: {}
  },
  
  // Settings for the prompt template compiler.
  promptCompiler: {
    // Global variables that can be injected into prompt templates.
    variables: {},
    // If true, compiled output files will be numbered (e.g., 001-my-prompt.md).
    useNumberedOutputs: true
  },
  
  // Defines sequences of commands for automated workflows.
  workflow: {
    sequences: {
      'default': [
        ['repomix-profile', ['run', 'full-codebase']],
        ['repomix-profile', ['run', 'docs-only']],
        ['compile-prompt', ['_docs/prompts/example.md']]
      ],
      'another_sequence': [
        // Define additional command sequences here
      ]
    },
    // The name of the sequence to run when `jaw-tools workflow` is called without arguments.
    defaultSequence: 'default'
  },
  
  // Configuration for project scaffolding features.
  projectScaffolding: {
    // Root directory where scaffolding places general project files (like the main docs folder).
    scaffoldTargetRootDir: '.', // Typically the project root
    // Settings for the jaw-tools user guide generated during scaffolding.
    userGuide: {
      destinationFileName: 'jaw-tools-guide.md'
    }
  },

  // Settings for the AI-assisted execution workflow.
  executionWorkflow: {
    // Base directory for storing all execution-related files, organized by PRD.
    baseDir: '_docs/project-docs/execution', 
    // Directory containing meta-prompt templates for different execution stages.
    centralMetaPromptDir: '_docs/prompts/meta', 
    // Key project documents to always include in the context bundle for an execution stage.
    coreDocsForBundling: {
      sppg: '_docs/project-docs/SPPG.md', // Path to your SPPG document
      northStar: '_docs/project-docs/NORTH_STAR.md' // Path to your North Star document
    },
    // Default Repomix profile to use for code snapshotting if not specified during bundling.
    defaultRepomixProfile: 'full-codebase', 
    // Names for temporary subdirectories created within a stage's folder during bundling.
    tempSubDirs: { 
      codeSnapshots: 'temp_code_snapshots',
      compiledPrompts: 'temp_compiled_prompts'
    }
  }
};
```

## Command Reference

| Command                                            | Description                                                                                                |
|----------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| `jaw-tools setup`                                  | Performs interactive setup, including dependency checks and initial configuration.                         |
| `jaw-tools-init`                                   | One-step command for complete initialization (runs setup, scaffold, and doctor).                           |
| `jaw-tools scaffold [--force]`                     | Scaffolds the standard documentation suite and project files.                                              |
| `jaw-tools doctor`                                 | Checks the jaw-tools setup status and helps diagnose issues.                                               |
| `jaw-tools repomix <subcommand>`                   | Manages Repomix profiles. Subcommands: `list`, `run <profile>`, `add <profile>`, `delete <profile>`, `generate-from-prd --prd-file <path>`. See 'Repomix Profiles' usage section for details. |
| `jaw-tools refresh [--force] [--yes] [--pattern=<glob>]` | Refreshes templates from the latest version. Options allow forcing overwrite, non-interactive mode, and pattern matching. |
| `jaw-tools update`                                 | Alias for `jaw-tools refresh`.                                                                             |
| `jaw-tools refresh-profiles`                       | Adds new Repomix profiles from templates without overwriting existing ones.                                |
| `jaw-tools compile <prompt-file>`                  | Compiles a prompt template, embedding included file contents.                                              |
| `jaw-tools workflow [sequence-name \| list]`       | Runs predefined command sequences or lists available sequences.                                            |
| `jaw-tools mini-prd <subcommand>`                  | Manages Mini-PRDs. Subcommands: `create <name>`, `update <id>`, `snapshot <id>`, `list`. See 'Mini-PRD Management' usage section for details. |
| `jaw-tools execution <subcommand>`                 | Manages the AI-assisted execution workflow. Subcommands: `init`, `bundle`, `record-step`. See 'Execution Workflow' usage section for details. |
| `jaw-tools meta-prompt`                            | (Deprecated and removed. Use `jaw-tools execution bundle --meta-prompt <path>` instead.)                   |
| `jaw-tools version`                                | Shows jaw-tools version information.                                                                       |
| `jaw-tools help [command]`                         | Shows help message for jaw-tools or a specific command.                                                    |

## Troubleshooting

### Installation Issues

If you experience problems during installation:

1. **Installation Fails or Hangs**: The most reliable installation method is using the tarball URL:
   ```bash
   npm install --save-dev https://github.com/thejoeyweber/jaw-tools/tarball/master
   ```
   
   If this still has issues, try with the --no-scripts flag and run setup manually:
   ```bash
   npm install --save-dev --no-scripts https://github.com/thejoeyweber/jaw-tools/tarball/master
   npm install fs-extra glob repomix
   npx jaw-tools setup
   ```

2. **Missing Dependencies**: If you see errors about missing modules:
   ```
   Error: Cannot find module 'fs-extra'
   ```
   Install them explicitly:
   ```bash
   npm install fs-extra glob repomix
   ```

3. **Run the doctor**: If you're having issues, check your setup:
   ```bash
   npx jaw-tools doctor
   ```
   This will identify problems and suggest fixes.

### Common Issues

- **Configuration Not Found**: If you see a "configuration not found" error, run `npx jaw-tools setup` to create the configuration file.

- **Missing Repomix**: jaw-tools requires the repomix package for some features. Install it if prompted:
  ```bash
  npm install repomix
  ```

- **Scaffolding Errors**: If you encounter errors during scaffolding, try using the `--force` flag:
  ```bash
  npx jaw-tools scaffold --force
  ```

- **Template Compilation Errors**: If you see "Could not read file" errors, make sure your template syntax uses `{{file-path}}` without spaces between the braces and the file path.

- **Workflow Command Failures**: If workflow command sequences fail, check that all required tools are available. You can see the full command list with:
  ```bash
  npx jaw-tools workflow list
  ``` 