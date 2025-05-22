---
templateVersion: "1.0.0"
generatedTimestamp: "{{timestamp}}"
stage: "{{stage_name}}"
prdId: "{{prd_id}}"
prdName: "{{prd_name}}"
---

# Task Overview: {{stage_name}}

**Execution Stage:** {{stage_name}}  
**PRD:** [{{prd_id}} - {{prd_name}}]({{prd_relative_path}})  
**Generated:** {{timestamp}}

## Purpose

{{#if is_prep_stage}}
This is a preparation stage for an AI-assisted execution cycle. The purpose is to gather context, generate a Repomix code snapshot, and compile all necessary materials into a prompt for generating execution instructions.
{{else}}
This is an execution stage where AI-generated instructions are applied to the codebase. This stage captures the execution logs, results, and user feedback on the implementation.
{{/if}}

## Resources

{{#if central_meta_prompt}}
- **Meta-Prompt Template:** [{{central_meta_prompt_name}}]({{central_meta_prompt_relative_path}})
{{/if}}

{{#if compiled_meta_prompt}}
- **Compiled Meta-Prompt:** [{{stage_name}}_meta.md]({{compiled_meta_prompt_relative_path}})
{{/if}}

{{#if code_snapshot}}
- **Code Snapshot:** [{{stage_name}}_code.xml]({{code_snapshot_relative_path}})
{{/if}}

{{#if prev_stage_summary}}
- **Previous Stage Summary:** [{{prev_stage_name}}/task_summary.md]({{prev_stage_summary_relative_path}})
{{/if}}

## Next Steps

{{#if is_prep_stage}}
1. Review the compiled meta-prompt linked above
2. Feed the meta-prompt to an LLM to generate specific execution instructions
3. Save the LLM's output as `generated_instructions.md` in this stage folder
4. Run `npx jaw-tools execution record-step --prd-file {{prd_relative_path}} --stage-name {{stage_name}} --instructions-file path/to/generated_instructions.md --status "completed-ready-for-execution"`
{{else}}
1. Follow the instructions in `generated_instructions.md` (if available) using your preferred AI coding assistant
2. Save the execution logs as `execution_log.txt`
3. Record your observations and any issues encountered as `user_feedback.md`
4. Run `npx jaw-tools execution record-step --prd-file {{prd_relative_path}} --stage-name {{stage_name}} --log-file path/to/execution_log.txt --feedback-file path/to/user_feedback.md --status "<status_choice>"`
{{/if}} 