# Meta-Prompt: Refactoring Prompt Creator

## Objective
Create a functional prompt that guides an LLM to identify and propose refactoring opportunities in a codebase to improve design, reduce duplication, and enhance maintainability.

## Context & Inputs
- `{{code_snapshot_xml_for_refactoring_scope}}`: Repomix snapshot of targeted modules.  
- `{{sppg_content}}`: SPPG SOLID/DRY and architectural principles.  
- `{{known_technical_debt_or_pain_points}}`: (Optional) Documented issues.  
- `{{refactoring_goals}}`: (Optional) Specific refactoring objectives.

## Expected Output Characteristics
- Identification of duplicated or complex code.  
- Concrete refactoring suggestions with proposed abstractions.  
- Explanation of benefits.  
- (Optional) High-level refactoring plan.

## Core Instructions / Steps
1. Analyze code for duplication/complexity.  
2. Apply principles from `{{sppg_content}}`.  
3. Consider `{{known_technical_debt_or_pain_points}}` & `{{refactoring_goals}}`.  
4. Provide prioritized suggestions.  
5. Outline steps to implement changes.

## Tone & Style
Analytical, solution-oriented.

## Formatting Requirements
- Markdown with bullet lists and code excerpts.

## Iteration & Refinement Guidance
If areas are missed, ask the LLM to re-scan and include them. 