# Meta-Prompt: Component Design Prompt Creator

## Objective
Generate a functional prompt that instructs an LLM to design and implement UI components based on specifications.

## Context & Inputs
- `{{ui_specifications}}`: UI requirements and behaviors.  
- `{{code_snapshot_xml}}`: Repomix snapshot of existing UI code and styles.  
- `{{sppg_content}}`: SPPG UI patterns and accessibility standards.  
- `{{brand_guidelines_or_style_guide}}`: (Optional) Branding style guide.

## Expected Output Characteristics
- Component code (React/Vue, etc.).  
- Conforms to `{{sppg_content}}`.  
- Matches existing style and branding.  
- Clear props/API with examples.  
- (Optional) Tests or Storybook stories.  
- **A detailed test plan for unit, integration, and end-to-end tests.**

## Core Instructions / Steps
1. Parse `{{ui_specifications}}` for props, layout, interactions.  
2. Reuse patterns from `{{code_snapshot_xml}}`.  
3. Enforce accessibility per `{{sppg_content}}`.  
4. Define component API and usage examples.  
5. Optionally scaffold tests or Storybook.  
6. **Conclude by producing a comprehensive test plan covering all test levels.**

## Tone & Style
Concise, accessible.

## Formatting Requirements
- Markdown with language-tagged code.

## Iteration & Refinement Guidance
If style/behavior mismatches occur, ask the LLM to adjust using existing patterns. 