# Meta-Prompt: v0.dev UI Generation Prompt Creator

## Objective
Generate a functional prompt optimized for v0.dev to produce initial front-end UI components and layouts based on project requirements and style.

## Context & Inputs
- `{{mini_prd_content_ui_requirements}}`: UI requirements and user flows from the Mini-PRD.  
- `{{code_snapshot_xml_ui_styles_and_components}}`: Repomix snapshot of existing UI components and styles.  
- `{{design_system_reference_or_style_guide}}`: (Optional) Formal design system or style guide.  
- `{{key_visual_cues_or_inspiration}}`: (Optional) Inspiration or visual references.  
- `{{v0dev_specific_instructions_or_keywords}}`: (Optional) Best practices or keywords for v0.dev.

## Expected Output Characteristics
- Prompt guiding v0.dev to generate UI code matching project styles.  
- Detailed descriptions of layout, interactions, responsiveness.  
- References to existing style patterns.  
- Instructions to use specified front-end tech.  
- **A detailed test plan for unit, integration, and end-to-end tests of the generated UI.**

## Core Instructions / Steps
1. Describe UI goals from `{{mini_prd_content_ui_requirements}}`.  
2. Instruct v0.dev to leverage `{{code_snapshot_xml_ui_styles_and_components}}`.  
3. Incorporate `{{design_system_reference_or_style_guide}}`.  
4. Break down complex layouts into iterative prompts if needed.  
5. Emphasize use of standard HTML/CSS or specified framework.  
6. **Conclude by including a comprehensive test plan covering unit, integration, and end-to-end tests.**

## Tone & Style
Descriptive, clear, directive.

## Formatting Requirements
- Markdown with bullet points and code examples.

## Iteration & Refinement Guidance
If generated UI deviates from style, ask v0.dev to adjust using missing style references. 