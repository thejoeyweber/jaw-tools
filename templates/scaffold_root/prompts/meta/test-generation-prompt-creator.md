# Meta-Prompt: Test Generation Prompt Creator

## Objective
Generate a functional prompt that instructs an LLM to create a comprehensive set of failing tests based on acceptance criteria from a Mini-PRD.

## Context & Inputs
- `{{mini_prd_content}}`: Mini-PRD with Acceptance Criteria.  
- `{{code_snapshot_xml}}`: Repomix snapshot of existing code.  
- `{{sppg_content}}`: SPPG testing standards and coverage expectations.  
- `{{target_file_paths}}`: (Optional) Paths for test placement.

## Expected Output Characteristics
- Tests mapping each acceptance criterion.  
- Written in the project's test framework.  
- Initially failing.  
- Well-structured with mocks/stubs as needed.

## Core Instructions / Steps
1. Map each criterion from `{{mini_prd_content}}` to test cases.  
2. Align with interfaces in `{{code_snapshot_xml}}`.  
3. Follow `{{sppg_content}}` conventions.  
4. Include positive and negative tests.  
5. Comment each test with its criterion reference.

## Tone & Style
Detailed, precise.

## Formatting Requirements
- Markdown with code-fenced tests.

## Iteration & Refinement Guidance
If any criterion lacks coverage, instruct the LLM to add missing tests. 