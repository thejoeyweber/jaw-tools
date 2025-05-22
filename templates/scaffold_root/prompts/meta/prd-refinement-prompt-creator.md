# Meta-Prompt: PRD Refinement Prompt Creator

## Objective
Create a functional prompt that directs an LLM to review and refine a draft Mini-PRD, improving clarity, completeness, and actionability.

## Context & Inputs
- `{{draft_mini_prd_content}}`: Draft PRD.  
- `{{mini_prd_template_guidelines}}`: Standard PRD template.  
- `{{north_star_content}}`: North Star for alignment.  
- `{{sppg_content}}`: (Optional) Relevant technical sections.  
- `{{target_audience_for_prd}}`: (Optional) PRD audience.

## Expected Output Characteristics
- Clear problem statements and user stories.  
- Identification of missing/ambiguous details.  
- Recommendations for testable acceptance criteria.  
- Alignment checks with `{{north_star_content}}`.  
- Structured output per template.

## Core Instructions / Steps
1. Compare `{{draft_mini_prd_content}}` against `{{mini_prd_template_guidelines}}`.  
2. Validate alignment with `{{north_star_content}}`.  
3. List missing or ambiguous sections.  
4. Suggest improvements for clarity and actionability.  
5. Pose clarifying questions.

## Tone & Style
Analytical, constructive.

## Formatting Requirements
- Markdown: revised PRD or bullet feedback list.

## Iteration & Refinement Guidance
If gaps remain, instruct the LLM to request further context. 