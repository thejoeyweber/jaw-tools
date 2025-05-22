# Meta-Prompt: Hello-World Prompt Generator

## Objective
Generate a functional prompt that instructs an LLM to build a complete "Hello-World" application baseline, validating the chosen tech stack, implementing core architectural patterns, and confirming CI/CD integration.

## Context & Inputs
- `{{sppg_content}}`: Systemic Principles & Patterns Guide outlining architectural rules.  
- `{{stack_docs_content}}`: Curated documentation for the chosen tech stack.  
- `{{north_star_content}}`: North Star document with project vision and strategic alignment.  
- `{{ci_cd_requirements}}`: Specific requirements for CI/CD pipeline integration.

## Expected Output Characteristics
- A minimal, runnable application demonstrating the core tech stack.  
- Compliance with architectural patterns in `{{sppg_content}}`.  
- A basic test suite (unit and/or integration tests).  
- Configuration files for a CI/CD pipeline.  
- Clear setup and execution instructions.  
- **A detailed test plan outlining unit, integration, and end-to-end tests to verify the application.**

## Core Instructions / Steps
1. Extract architectural constraints from `{{sppg_content}}`.  
2. Guide environment setup using `{{stack_docs_content}}`.  
3. Align implementation with `{{north_star_content}}`.  
4. Incorporate CI/CD setup per `{{ci_cd_requirements}}`.  
5. Divide the prompt into: scaffolding, core logic, testing, deployment.  
6. State any assumptions.  
7. **Conclude by instructing the LLM to produce a comprehensive test plan covering unit, integration, and end-to-end tests.**

## Tone & Style
Instructional, concise, precise.

## Formatting Requirements
- Markdown output with language-tagged code fences.

## Iteration & Refinement Guidance
If tests or CI steps are missing, ask the LLM to identify and add them. 