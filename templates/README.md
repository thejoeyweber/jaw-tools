# jaw-tools User Guide

This guide provides instructions for using jaw-tools in your project. jaw-tools offers utilities for working with AI tools, documentation, and code generation.

## Available Commands

### Repomix Profile Management

Generate snapshots of your codebase for AI tools:

```bash
# List available profiles
npm run repomix list

# Run a specific profile
npm run repomix run full-codebase
```

You can create custom profiles for different parts of your codebase:

```bash
# Add a new profile
npm run repomix add frontend "src/components/**,src/pages/**" "**/*.test.js"

# Delete a profile
npm run repomix delete old-profile
```

### Prompt Compilation

Compile prompt templates with file content inclusion:

```bash
# Compile a specific prompt
npm run compile-prompt _docs/prompts/example.md

# Compile with variable substitution
npm run compile-prompt _docs/prompts/my-template.md --var.PROJECT_NAME "My Project"
```

In your templates, you can include file contents using the `{{ path/to/file }}` syntax:

```markdown
# My API Documentation

## API Routes

```js
{{ src/routes/index.js }}
```

### Sequential Command Runner

Run predefined sequences of commands:

```bash
# Run the default sequence
npm run next-gen

# Run a specific sequence
npm run next-gen another_sequence

# List available sequences
npm run next-gen list
```

Sequences are defined in `jaw-tools.config.js` and can include multiple generation steps.

### Health Checks

Verify your jaw-tools setup:

```bash
npm run jaw-doctor
```

This checks if all required configuration, directories, and dependencies are properly set up.

## Configuration

The jaw-tools configuration is stored in `jaw-tools.config.js` in your project root. You can edit this file to customize:

- Directory paths for documentation and profiles
- Default repomix profiles for codebase snapshots
- Template variables for prompt compilation
- Command sequences for next-gen
- Scaffolding options

## Documentation Templates

Standard documentation templates are available in the `_docs/project-docs/templates/` directory. These include:

- Mini-PRD templates for feature planning
- Architecture Decision Records (ADRs)
- Service documentation
- North Star documents
- System principles

You can copy and adapt these templates for your project documentation.

## Getting Help

Run the help command to see all available options:

```bash
npx jaw-tools help
```

For more detailed information, visit the jaw-tools GitHub repository: [https://github.com/thejoeyweber/jaw-tools](https://github.com/thejoeyweber/jaw-tools) 