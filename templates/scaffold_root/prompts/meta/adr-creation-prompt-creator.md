# Meta-Prompt: ADR Creation Prompt Creator

## Objective
Generate a functional prompt that instructs an LLM to draft an Architectural Decision Record (ADR) for a specified architectural choice.

## Context & Inputs
- `{{decision_to_be_documented_context}}`: Architectural decision context.  
- `{{considered_options_and_rationale}}`: (Optional) Alternatives with pros/cons.  
- `{{sppg_content}}`: SPPG reference for existing principles.  
- `{{adr_template_structure}}`: ADR template sections.  
- `{{project_constraints_or_goals}}`: (Optional) Constraints or goals influencing the decision.

## Expected Output Characteristics
- Structured ADR per `{{adr_template_structure}}`.  
- Balanced discussion of alternatives.  
- Clear justification for chosen option.  
- Consequences outlined.  
- Context linked to constraints/goals or `{{sppg_content}}`.

## Core Instructions / Steps
1. Define context from `{{decision_to_be_documented_context}}`.  
2. Include alternatives from `{{considered_options_and_rationale}}` or brainstorm them.  
3. Reference `{{sppg_content}}` for compliance or deviations.  
4. Document final decision and consequences.  
5. Format output per `{{adr_template_structure}}`.

## Tone & Style
Objective, balanced.

## Formatting Requirements
- Markdown with ADR sections.

## Iteration & Refinement Guidance
If detail is lacking, ask the LLM to expand pros/cons or implications. 