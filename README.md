# jaw-tools

AI development utilities for Repomix and prompt compilation. This toolkit provides a streamlined workflow for using AI with your codebase, including:

- Repomix profile management for generating codebase snapshots
- Prompt template compilation with file inclusion
- Sequential command execution for automated workflows

## Installation

Install jaw-tools from GitHub:

```bash
# Install using SSH (recommended for private repositories)
npm install --save-dev git+ssh://git@github.com/thejoeyweber/jaw-tools.git#v1.0.0

# Or install using HTTPS (if you have a GitHub token configured)
npm install --save-dev github:thejoeyweber/jaw-tools#v1.0.0

# If you experience installation issues, try adding --no-scripts flag
npm install --save-dev --no-scripts git+ssh://git@github.com/thejoeyweber/jaw-tools.git#v1.0.0
# Then run setup manually after installing required dependencies:
npm install fs-extra glob repomix
npx jaw-tools setup
```

After installation, jaw-tools will set up the necessary directories and configuration in your project.

## Quick Start

After installation, jaw-tools will automatically run the setup script. You can also run it manually:

```bash
npx jaw-tools setup
```

This will:
1. Create the necessary directory structure
2. Generate a `jaw-tools.config.js` in your project root
3. Add convenience scripts to your package.json

## Usage

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

In your templates, you can include file contents using the `{{ path/to/file }}` syntax:

```markdown
# My Template

Here's the project configuration:

```json
{{ package.json }}
```

### Sequential Generation

Run a sequence of commands defined in your configuration:

```bash
npx jaw-tools next-gen
```

## Configuration

jaw-tools uses a configuration file named `jaw-tools.config.js` in your project root:

```javascript
module.exports = {
  // Directory configuration
  directories: {
    repomixProfiles: '.repomix-profiles',
    docs: '_docs',
    prompts: '_docs/prompts',
    compiledPrompts: '_docs/prompts-compiled'
  },
  
  // Repomix configuration
  repomix: {
    defaultProfiles: {
      'full-codebase': {
        include: '**',
        ignore: '.git/**,node_modules/**',
        style: 'xml',
        compress: false
      }
    }
  },
  
  // Prompt compiler configuration
  promptCompiler: {
    variables: {
      // Variables to replace in templates
      // 'PROJECT_NAME': 'My Project'
    },
    useNumberedOutputs: true
  },
  
  // Next-gen sequential commands
  nextGen: {
    commands: [
      ['repomix-profile', ['run', 'full-codebase']],
      ['compile-prompt', ['_docs/prompts/example.md']]
    ]
  }
};
```

## Command Reference

| Command | Aliases | Description |
|---------|---------|-------------|
| `jaw-tools setup` | `init` | Setup jaw-tools in your project |
| `jaw-tools repomix` | `profile`, `r` | Manage and run Repomix profiles |
| `jaw-tools compile` | `c` | Compile a prompt template |
| `jaw-tools next-gen` | `seq`, `n` | Run the sequence of commands |
| `jaw-tools version` | `v` | Show version |
| `jaw-tools help` | `h` | Show this help message |

## Troubleshooting

### Installation Issues

If you experience problems during installation:

1. **Missing Dependencies**: The most common issue is missing dependencies. Install them explicitly:
   ```bash
   npm install fs-extra glob repomix
   ```

2. **Installation Hangs**: If installation appears to hang, try installing with the `--no-scripts` flag:
   ```bash
   npm install --save-dev --no-scripts git+ssh://git@github.com/thejoeyweber/jaw-tools.git#v1.0.0
   ```
   Then run setup manually after installing required dependencies:
   ```bash
   npm install fs-extra glob repomix
   npx jaw-tools setup
   ```

3. **Module Resolution Problems**: If you see "Cannot find module" errors:
   ```
   Error: Cannot find module 'fs-extra'
   ```
   Install the missing module and try again:
   ```bash
   npm install fs-extra
   ```

4. **Path Resolution Problems**: If you encounter path-related errors, especially on Windows, try using forward slashes in your configuration paths:
   ```js
   // In jaw-tools.config.js
   directories: {
     docs: 'docs',  // Use forward slashes regardless of platform
     // ...
   }
   ```

5. **Missing Templates**: If template files are reported missing, ensure you have the full repository with all files. You can manually create the required directory structure:
   ```bash
   mkdir -p .repomix-profiles/outputs _docs/prompts _docs/prompts-compiled
   ```

### Common Issues

- **Configuration Not Found**: If you see a "configuration not found" error, run `npx jaw-tools setup` to create the configuration file.
- **Permissions Problems**: Ensure you have write permissions to the directories where jaw-tools needs to create files.
- **Node.js Version**: jaw-tools requires Node.js 14 or higher. Check your version with `node --version`.
- **Post-Install Script Failures**: If the post-install script fails, it's designed to exit gracefully. You can still run `npx jaw-tools setup` manually to complete the installation. 