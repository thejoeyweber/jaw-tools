# jaw-tools

AI development utilities for Repomix and prompt compilation. This toolkit provides a streamlined workflow for using AI with your codebase, including:

- Repomix profile management for generating codebase snapshots
- Prompt template compilation with file inclusion
- Sequential command execution for automated workflows
- Project scaffolding for documentation and standard files
- Diagnostic tools for setup validation

## Installation

### One-Step Installation (Recommended)

The easiest way to get started is with our one-step initialization:

```bash
# Install jaw-tools
npm install --save-dev https://github.com/thejoeyweber/jaw-tools/tarball/master

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
npm install --save-dev https://github.com/thejoeyweber/jaw-tools/tarball/master

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

The scaffolding process will:
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

The refresh process will:
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

jaw-tools features a powerful **Typed Variable System** for embedding dynamic content into your prompt templates. This system replaces the older simple file inclusion.

**Key Syntaxes:**

1.  **File Inclusion (`{{/path/to/file.ext}}`):**
    *   Directly includes the content of a specified file.
    *   Example: `{{/src/main.js}}`
    *   This uses the built-in `file` variable type. It supports glob patterns (e.g., `{{/src/**/*.ts}}`) if `glob` is installed.

2.  **Typed Variables (`{{$typeName:filterName(arg)|default=defaultValue}}`):**
    *   Allows for more complex data lookups and transformations.
    *   `$typeName`: Specifies the type of variable (e.g., `file`, `env`, or custom types).
    *   `:filterName(arg)`: Optional. Apply one or more filters to transform the discovered data. Arguments to filters can be quoted if they contain special characters.
    *   `|default=defaultValue`: Optional. Provides a fallback value if the variable cannot be resolved.
    *   Example: `{{$env:HOME|default=/user/unknown}}` or `{{$file:toUpperCase /data/config.txt}}`

**Variable Resolution Process:**

When a prompt is compiled (or previewed):
1.  **Discovery**: The system attempts to find items matching the variable's `key` (e.g., file path or type name) using the `discover` method of the corresponding variable type.
2.  **User Choice (Interactive Mode)**: If multiple items are discovered, and not in CI mode, you'll be prompted to choose one.
3.  **CI Mode/Defaults**: In CI mode or if no items are discovered, it attempts to use an environment variable matching the key or a specified default value.
4.  **Validation**: The chosen item can be validated by the variable type's `validate` method.
5.  **Filtering**: Any specified filters are applied to the (potentially validated) items.
6.  **Rendering**: The final item is rendered into the template using the type's `render` method.

**IMPORTANT:** For file paths like `{{/path/to/file}}`, ensure there are no spaces between the double braces and the path. For typed variables, the syntax is more flexible but adhere to the structure shown.

**New Commands for Prompt Variables:**

*   `jaw-tools prompt-preview <template.md>`: Interactively preview how variables in a template will be resolved.
*   `jaw-tools prompt-docs`: Generate Markdown documentation for all unique variables found across your prompt templates.

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
    variables: {
      // Old static variables (still supported but less flexible than typed variables)
      // PROJECT_NAME: 'My Awesome Project',
    },
    useNumberedOutputs: true,
    interactive: true // Set to false for CI environments to disable interactive prompts
  },
  
  // Custom Variable Types (see example below)
  // variableTypes: [], 

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
  },

  /**
   * Custom Variable Types
   * Extend jaw-tools with your own variable types.
   * Each type needs a name, a discover function, and a render function.
   * Filters and validate functions are optional.
   */
  // variableTypes: [
  //   {
  //     name: 'myEnv', // Invoked as {{$myEnv}} or {{$myEnv:SOME_ENV_VAR_NAME}}
  //     async discover(keyName, config) {
  //       // keyName is 'myEnv' if invoked as {{$myEnv}}
  //       // Example: Read an environment variable (keyName could be the ENV var name)
  //       const value = process.env[keyName.toUpperCase()]; // Assuming keyName is the ENV var
  //       return value ? [{ id: keyName, value: value }] : [];
  //     },
  //     render(item) {
  //       return item.value;
  //     },
  //     // Optional validate and filters
  //     async validate(item, keyName, config) {
  //       if (item.value === 'invalid') return `${keyName} cannot be 'invalid'`;
  //       return true;
  //     },
  //     filters: {
  //       toLowerCase: (items) => items.map(item => ({...item, value: String(item.value).toLowerCase()}))
  //     }
  //   }
  // ]
};
```

### Custom Variable Types

You can extend jaw-tools by defining your own variable types in `jaw-tools.config.js`. Add a `variableTypes` array to your configuration. Each custom type definition must be an object with at least `name` (string), `discover` (async function), and `render` (function). `validate` (async function) and `filters` (object of functions) are optional.

```javascript
// In jaw-tools.config.js
module.exports = {
  // ... other configurations ...
  variableTypes: [
    {
      name: 'myEnv', // Type name, e.g., {{$myEnv}} or {{$myEnv:ACTUAL_ENV_VAR_NAME}}
      async discover(keyName, config) {
        // keyName is 'myEnv' if invoked as {{$myEnv}}.
        // If invoked as {{$myEnv:SOME_KEY}}, keyName would be 'SOME_KEY' (this depends on how type is defined).
        // For this example, let's assume keyName directly IS the environment variable to lookup.
        const value = process.env[keyName.toUpperCase()];
        // discover should return an array of items.
        return value !== undefined ? [{ id: keyName, value: value, name: `${keyName}=${value}` }] : [];
      },
      render(item) { // item is one of the objects from the array returned by discover
        return item.value;
      },
      // Optional validate and filters
      async validate(item, keyName, config) { // keyName is the original key used in template
        if (item.value === 'FORBIDDEN_VALUE') {
          return `Value for ${item.id} (requested by ${keyName}) cannot be 'FORBIDDEN_VALUE'`;
        }
        return true; // true means valid
      },
      filters: {
        toLowerCase: (items) => { // items is an array of { id, value, name }
          return items.map(item => ({ ...item, value: String(item.value).toLowerCase() }));
        }
      }
    }
  ]
};
```
Remember that `discover`, `render`, `validate`, and filter functions must be actual JavaScript functions within your configuration file.

## Command Reference

| Command | Description |
|---------|-------------|
| `jaw-tools setup` | Interactive setup with dependency checks |
| `jaw-tools scaffold [--force]` | Scaffold standard documentation suite |
| `jaw-tools doctor` | Check jaw-tools setup status |
| `jaw-tools repomix list` | List available repomix profiles |
| `jaw-tools repomix run <profile>` | Generate a codebase snapshot |
| `jaw-tools compile (c) <prompt-file> [--ci]` | Compile a prompt template using the Typed Variable System. Use `--ci` for non-interactive mode. |
| `jaw-tools prompt-preview (pp) <template.md> [--out <file>]` | Preview template variable resolution interactively. Optionally write expanded output to a file. |
| `jaw-tools prompt-docs (pd)` | Generate Markdown documentation for variables found in prompts. |
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