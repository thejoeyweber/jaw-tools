# jaw-tools

AI development utilities for Repomix and prompt compilation. This toolkit provides a streamlined workflow for using AI with your codebase, including:

- Repomix profile management for generating codebase snapshots
- Prompt template compilation with file inclusion
- Sequential command execution for automated workflows
- Project scaffolding for documentation and standard files
- Diagnostic tools for setup validation

## Installation

Install jaw-tools from GitHub:

```bash
# RECOMMENDED METHOD (Works Reliably)
npm install --save-dev https://github.com/thejoeyweber/jaw-tools/tarball/master
```

After installation, jaw-tools will perform minimal setup with essential directories and a basic configuration file. To complete the setup with guided configuration and dependency checks, run:

```bash
npx jaw-tools setup
```

And to scaffold the standard documentation suite and project files:

```bash
npx jaw-tools scaffold
```

## Quick Start

After installing jaw-tools, follow these steps for a complete setup:

1. **Install jaw-tools**:
   ```bash
   npm install --save-dev https://github.com/thejoeyweber/jaw-tools/tarball/master
   ```

2. **Run guided setup** (checks dependencies and configures your project):
   ```bash
   npx jaw-tools setup
   ```

3. **Scaffold documentation suite** (adds standard project docs):
   ```bash
   npx jaw-tools scaffold
   ```

4. **Check installation status**:
   ```bash
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

The scaffolding process will:
- Create the standard documentation directory structure
- Copy template files for various document types
- Add a jaw-tools user guide to your docs directory
- Interactively handle file conflicts unless --force is used

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

## Configuration

jaw-tools uses a configuration file named `jaw-tools.config.js` in your project root:

```javascript
module.exports = {
  // Directory configuration
  directories: {
    repomixProfiles: '.repomix-profiles',
    docs: '_docs',
    prompts: '_docs/prompts',
    compiledPrompts: '_docs/prompts-compiled',
    miniPrdTemplatePath: '_docs/project-docs/templates/mini-prd-template.md'
  },
  
  // Repomix configuration
  repomix: {
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
    env: {}
  },
  
  // Prompt compiler configuration
  promptCompiler: {
    variables: {},
    useNumberedOutputs: true
  },
  
  // Sequential command workflows
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
    defaultSequence: 'default'
  },
  
  // Project scaffolding configuration
  projectScaffolding: {
    scaffoldTargetRootDir: '.',
    userGuide: {
      destinationFileName: 'jaw-tools-guide.md'
    }
  }
};
```

## Command Reference

| Command | Description |
|---------|-------------|
| `jaw-tools setup` | Interactive setup with dependency checks |
| `jaw-tools scaffold [--force]` | Scaffold standard documentation suite |
| `jaw-tools doctor` | Check jaw-tools setup status |
| `jaw-tools repomix list` | List available repomix profiles |
| `jaw-tools repomix run <profile>` | Generate a codebase snapshot |
| `jaw-tools compile <prompt-file>` | Compile a prompt template |
| `jaw-tools workflow list` | List available command sequences |
| `jaw-tools workflow [sequence-name]` | Run a command sequence |
| `jaw-tools mini-prd create <name>` | Create a new Mini-PRD |
| `jaw-tools mini-prd update <id>` | Update a Mini-PRD |
| `jaw-tools mini-prd snapshot <id>` | Generate a snapshot for a Mini-PRD |
| `jaw-tools version` | Show version information |
| `jaw-tools help` | Show help message |

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