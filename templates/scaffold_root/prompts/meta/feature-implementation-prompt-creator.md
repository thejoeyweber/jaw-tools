# Meta-Prompt: Feature Implementation Prompt Creator

## Objective
Create a functional prompt that directs an LLM to implement feature code defined in a Mini-PRD and ensure it passes provided failing tests.

## Context & Inputs
- `{{mini_prd_content}}`: Full Mini-PRD with requirements.  
- `{{code_snapshot_xml}}`: Repomix snapshot of existing code.  
- `{{failing_test_files_content}}`: Content of failing tests.  
- `{{sppg_content}}`: SPPG for architectural and coding standards.  
- `{{relevant_ui_designs_or_prototypes}}`: (Optional) UI prototypes.

## Expected Output Characteristics
- Code passing all tests.  
- Meets PRD requirements.  
- Adheres to `{{sppg_content}}`.  
- Well-commented and maintainable.  
- **A detailed test plan covering unit, integration, and end-to-end tests post-implementation.**

## Core Instructions / Steps
1. Implement tests-first to satisfy `{{failing_test_files_content}}`.  
2. Reference `{{mini_prd_content}}` for behavior.  
3. Follow `{{sppg_content}}` standards.  
4. Work incrementally for complex features.  
5. Document assumptions and new modules.  
6. **Conclude by asking for a comprehensive test plan covering unit, integration, and end-to-end tests.**

## Tone & Style
TDD-oriented, clear.

## Formatting Requirements
- Markdown with code blocks.

## Iteration & Refinement Guidance
If tests still fail, request identification and fixes for failing cases. 