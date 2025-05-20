# AI Development Utilities

This document provides instructions on how to use the AI-driven development utilities integrated into this project via jaw-tools.

## 1. Repomix Profile Manager

Repomix is used to generate codebase snapshots (profiles) for AI analysis. This helps in providing relevant context to AI models. All configuration and outputs are stored in the `.repomix-profiles/` directory (which is added to `.gitignore`).

### Managing Profiles

Profiles define which parts of the codebase to include or exclude in a snapshot. They are managed using the `jaw-tools repomix` command.

### Common Commands

1.  **List available profiles:**
    ```bash
    npm run repomix list
    ```

2.  **Run a specific profile:**
    This will generate an XML (or other configured format) file in `.repomix-profiles/outputs/<profile-name>.xml`.
    ```bash
    npm run repomix run <profile-name>
    ```
    Example:
    ```bash
    npm run repomix run full-codebase
    ```

3.  **Add or Update a profile:**
    ```bash
    npm run repomix add <profile-name> "[include-patterns]" "[ignore-patterns]" [style] [--compress]
    ```
    -   `<profile-name>`: Name for the profile (e.g., `frontend-components`).
    -   `[include-patterns]`: Optional. Glob patterns for files/directories to include (e.g., `"app/**,components/**"`). Enclose in quotes, especially if it contains spaces or multiple patterns.
    -   `[ignore-patterns]`: Optional. Glob patterns to ignore (e.g., `"*.test.js,*.spec.js"`).
    -   `[style]`: Optional. Output style (default: `xml`).
    -   `[--compress]`: Optional. Flag to enable compression.

    Example:
    ```bash
    npm run repomix add docs-only "_docs/project-docs/**" "" xml
    ```
    If a profile with the given name already exists, it will be updated.

4.  **Delete a profile:**
    This will also delete the corresponding output file if it exists.
    ```bash
    npm run repomix delete <profile-name>
    ```
    Example:
    ```bash
    npm run repomix delete old-profile
    ```

### Customizing Profiles
You can directly edit the `.repomix-profiles/profiles.json` file to define or modify profiles.

## 2. Prompt Compilation Script

This utility helps consolidate multiple files from your codebase into a single prompt file, useful for preparing comprehensive context for AI models.

-   **Prompt templates location:** `_docs/prompts/`
-   **Compiled prompts output:** `_docs/prompts-compiled/` (this directory is in `.gitignore`)

### Usage

1.  **Create a Prompt Template:**
    Create a Markdown file (e.g., `_docs/prompts/my-feature-prompt.md`).
    In this template, use `{{ path/to/your/file.ext }}` placeholders to specify which files from your project you want to include. Paths should be relative to the project root.

    Example (`_docs/prompts/example.md`):
    ```markdown
    # My Example Prompt
    Here is the content of `app/layout.tsx`:
    ```tsx
    {{ app/layout.tsx }}
    ```
    ```

2.  **Run the Compilation Script:**
    Execute the script, providing the path to your template file:
    ```bash
    npm run compile-prompt _docs/prompts/my-prompt.md
    ```

3.  **Output:**
    The script generates a new Markdown file in `_docs/prompts-compiled/` (e.g., `001-my-prompt.md`).

## 3. Sequential Generation Script (next-gen)

For convenience, jaw-tools provides a sequential runner to execute a predefined sequence of commands. This is useful for a full refresh of commonly used artifacts.

### Usage

You can run this sequential script using npm:

```bash
npm run next-gen
```

This will execute the commands defined in your configuration file.

### Configuration

You can configure the commands to run in your `jaw-tools.config.js` file:

```javascript
module.exports = {
  // ...other config...
  nextGen: {
    commands: [
      ['repomix-profile', ['run', 'full-codebase']],
      ['repomix-profile', ['run', 'docs-only']],
      ['compile-prompt', ['_docs/prompts/example.md']]
    ]
  }
};
```

**Tips:**
- Use compressed Repomix profiles for large codebases or LLM token limits.
- Use feature-specific Repomix profiles for focused reviews.
- Ensure file paths in prompt templates are correct relative to the project root. 