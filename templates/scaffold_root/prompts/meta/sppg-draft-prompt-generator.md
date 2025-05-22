# Meta-Prompt: SPPG Draft Prompt Generator

## Objective
Create a functional prompt that guides an LLM to draft an initial Systemic Principles & Patterns Guide (SPPG) for the project.

## Context & Inputs
- `{{tech_stack_references}}`: Documentation for the primary technologies.  
- `{{north_star_content}}`: North Star document for strategic alignment.  
- `{{sppg_template_structure}}`: Desired SPPG outline (sections, headings).  
- `{{existing_best_practices}}`: (Optional) Pre-existing team/company standards.

## Expected Output Characteristics
- Structured document per `{{sppg_template_structure}}`.  
- Actionable principles tied to `{{tech_stack_references}}`.  
- Rationale for each principle.  
- Placeholders for future discussion.

## Core Instructions / Steps
1. Analyze goals from `{{north_star_content}}`.  
2. Map principles to `{{tech_stack_references}}`.  
3. Populate sections from `{{sppg_template_structure}}`.  
4. Integrate `{{existing_best_practices}}` if available.  
5. Emphasize that this is a living document.  
6. Suggest 2–3 alternatives for key architectural decisions.

## Tone & Style
Formal, structured, concise.

## Formatting Requirements
- Markdown with headings and lists.

## Iteration & Refinement Guidance
If sections lack detail, instruct the LLM to generate clarifying questions. 