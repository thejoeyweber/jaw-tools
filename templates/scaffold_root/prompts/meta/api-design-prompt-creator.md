# Meta-Prompt: API Design Prompt Creator

## Objective
Create a functional prompt that guides an LLM to design and implement API endpoints, including schemas, handlers, and business logic.

## Context & Inputs
- `{{api_requirements}}`: API requirements from the Mini-PRD.  
- `{{code_snapshot_xml}}`: Repomix snapshot of existing API code.  
- `{{sppg_content}}`: SPPG API design standards (REST/GraphQL, auth, errors).  
- `{{database_schema_or_data_models}}`: (Optional) DB schema or models.

## Expected Output Characteristics
- Defined endpoint paths & methods or GraphQL schema.  
- Request/response schemas (OpenAPI/JSON Schema/GraphQL types).  
- Handler code with validation & error handling.  
- Security/auth patterns per `{{sppg_content}}`.  
- (Optional) Integration tests.  
- **A detailed test plan covering unit, integration, and end-to-end tests for the API.**

## Core Instructions / Steps
1. Extract operations and data models from `{{api_requirements}}`.  
2. Align with code patterns in `{{code_snapshot_xml}}`.  
3. Enforce design rules from `{{sppg_content}}`.  
4. Define DTOs/interfaces.  
5. Include error handling and auth.  
6. Optionally scaffold tests.  
7. **Conclude by generating a comprehensive test plan for all levels.**

## Tone & Style
Precise, security-focused.

## Formatting Requirements
- Markdown with schema and handler code blocks.

## Iteration & Refinement Guidance
If endpoints or schemas are incomplete, ask the LLM to fill gaps. 