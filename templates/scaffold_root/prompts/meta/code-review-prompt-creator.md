# Meta-Prompt: Code Review Prompt Creator

## Objective
Generate a functional prompt that instructs an LLM to perform a thorough code review of provided code or pull request.

## Context & Inputs
- `{{code_to_review_content_or_diff}}`: Code snippet or diff.  
- `{{mini_prd_content_or_task_description}}`: Requirements or user story.  
- `{{sppg_content}}`: SPPG coding and architectural standards.  
- `{{project_specific_checklists}}`: (Optional) Checklists (security, performance).

## Expected Output Characteristics
- Identification of bugs, errors, and edge cases.  
- Assessment against `{{sppg_content}}`.  
- Suggestions for readability, maintainability, performance.  
- Clarification questions.  
- Categorized feedback by severity.

## Core Instructions / Steps
1. Compare code to requirements in `{{mini_prd_content_or_task_description}}`.  
2. Verify standards from `{{sppg_content}}`.  
3. Use `{{project_specific_checklists}}` if provided.  
4. Offer actionable feedback with rationale.  
5. Pose clarifying questions.

## Tone & Style
Constructive, professional.

## Formatting Requirements
- Markdown grouped by issue type, with code excerpts.

## Iteration & Refinement Guidance
If context is missing, instruct the LLM to request additional information. 