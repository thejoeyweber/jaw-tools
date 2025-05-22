# Meta-Prompt: Calibration Prompt Creator

## Objective
Generate a functional prompt that standardizes a calibration task to assess AI model consistency or drift over time.

## Context & Inputs
- `{{standardized_input_specification}}`: Fixed input description.  
- `{{expected_output_criteria_or_template}}`: Template or criteria for output evaluation.

## Expected Output Characteristics
- Direct address of `{{standardized_input_specification}}`.  
- Consistent structure for comparison.  
- Format amenable to programmatic or visual diff.

## Core Instructions / Steps
1. Execute `{{standardized_input_specification}}`.  
2. Format response per `{{expected_output_criteria_or_template}}`.  
3. Minimize ambiguity.  
4. Provide guidance for capturing outputs.

## Tone & Style
Precise, unambiguous.

## Formatting Requirements
- Markdown or structured JSON.

## Iteration & Refinement Guidance
If formatting deviates, instruct the LLM to correct it. 