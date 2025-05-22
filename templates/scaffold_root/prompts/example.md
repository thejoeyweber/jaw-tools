---
title: Example Prompt Template
description: A sample template demonstrating jaw-tools prompt compilation features
tags: example, jaw-tools, template
---

# Example Prompt for Code Review

## Project Context

This is an example prompt template that demonstrates how to use jaw-tools prompt compilation features.

## File Inclusion Examples

### Including a specific file:

```javascript
// Contents of package.json:
{{package.json}}
```

### Including a file with glob pattern:

```javascript
// All JavaScript files in src directory:
{{src/*.js}}
```

## WARNING: File Size Considerations

When including files, be mindful of the following:
- Large files like package-lock.json will generate extremely large prompts
- Consider using patterns that exclude large files
- Files larger than 100KB may cause token limits to be exceeded in AI models

## Best Practices

1. Only include relevant code sections
2. Use specific paths rather than broad glob patterns
3. Exclude generated files, build artifacts, and large dependency files
4. Consider breaking down large prompts into smaller, focused ones

## Typical Workflow

1. Create a prompt template in `_docs/prompts/`
2. Run `npx jaw-tools compile _docs/prompts/your-prompt.md`
3. Find the compiled prompt in `_docs/prompts-compiled/`
4. Use the compiled prompt with your preferred AI tool
