---
templateVersion: "1.0.0"
generatedTimestamp: "{{timestamp}}"
stage: "{{stage_name}}"
prdId: "{{prd_id}}"
prdName: "{{prd_name}}"
status: "{{status}}"
---

# Task Summary: {{stage_name}}

**Execution Stage:** {{stage_name}}  
**PRD:** [{{prd_id}} - {{prd_name}}]({{prd_relative_path}})  
**Generated:** {{timestamp}}  
**Status:** {{status}}

## Stage Files

{{#if has_task_overview}}
- [Task Overview](./task_overview.md)
{{/if}}

{{#if has_generated_instructions}}
- [Generated Instructions](./generated_instructions.md)
{{/if}}

{{#if has_execution_log}}
- [Execution Log](./execution_log.txt)
{{/if}}

{{#if has_user_feedback}}
- [User Feedback](./user_feedback.md)
{{/if}}

## Key Takeaways

{{#if is_prep_stage}}
This preparation stage has been completed with status: **{{status}}**. 

{{#if has_generated_instructions}}
Instructions have been generated and are ready for execution in the next stage.
{{else}}
No instructions have been recorded for this stage.
{{/if}}
{{else}}
This execution stage has been completed with status: **{{status}}**.

{{#if user_notes}}
### User Notes
{{user_notes}}
{{else}}
### User Notes
*No user notes provided.*
{{/if}}
{{/if}}

## Next Steps

{{#if is_prep_stage}}
Proceed to the execution stage by:
1. Creating a new execution stage: `npx jaw-tools execution bundle --prd-file {{prd_relative_path}} --stage-name "{{next_stage_suggestion}}" --meta-prompt <path_to_meta_prompt_template>`
2. Following the workflow outlined in the generated task_overview.md
{{else}}
{{#if needs_review}}
This implementation requires review and potential fixes. Suggested next steps:
1. Review the execution logs and user feedback
2. Create a review/fix stage: `npx jaw-tools execution bundle --prd-file {{prd_relative_path}} --stage-name "{{next_stage_suggestion}}" --meta-prompt <path_to_review_meta_prompt> --prev-stage-summary {{stage_dir}}/task_summary.md`
{{else}}
Implementation has been completed successfully. Suggested next steps:
1. Verify all acceptance criteria have been met
2. Update the Mini-PRD status to reflect completion
3. If necessary, create additional review/polish stages using `npx jaw-tools execution bundle`
{{/if}}
{{/if}} 