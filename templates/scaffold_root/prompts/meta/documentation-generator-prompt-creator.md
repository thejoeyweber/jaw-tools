# Meta-Prompt: Documentation Generator Prompt Creator

## Objective
Create a functional prompt that instructs an LLM to generate curated, project-specific documentation for an external service or API.

## Context & Inputs
- `{{official_documentation_links_or_content}}`: Official docs or excerpts.  
- `{{service_docs_template_structure}}`: Project's service-doc template.  
- `{{code_examples_of_usage_in_project}}`: Code snippets showing usage.  
- `{{project_specific_configurations_or_patterns}}`: Project-specific setups.  
- `{{target_audience_for_docs}}`: Intended readers.

## Expected Output Characteristics
- Concise summary of the service's role.  
- Step-by-step setup/configuration.  
- Project-specific code examples.  
- Links to official docs.  
- Troubleshooting tips and gotchas.

## Core Instructions / Steps
1. Summarize service purpose via `{{official_documentation_links_or_content}}`.  
2. Structure docs per `{{service_docs_template_structure}}`.  
3. Integrate `{{code_examples_of_usage_in_project}}`.  
4. Highlight `{{project_specific_configurations_or_patterns}}`.  
5. Address audience needs.

## Tone & Style
Clear, practical, developer-focused.

## Formatting Requirements
- Markdown with headings, steps, and code fences.

## Iteration & Refinement Guidance
If context is missing, instruct the LLM to request or infer details. 