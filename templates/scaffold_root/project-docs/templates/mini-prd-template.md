---
docType: template
version: 1.1.0
lastUpdated: [YYYY-MM-DD] # Date this template file was last changed. User updates this in their Mini-PRD instance.

# ─── Mini-PRD Front-matter (parsed by jaw-tools) ───
prdId: [PRD-NUMBER]         # e.g. 001
name: [feature-name-slug]   # kebab-case
description: "[Brief description of the feature]"
status: proposed            # proposed | accepted | in-progress | completed | deferred
author: [Your Name/Team]
northStarRef: /_docs/project-files/NORTH_STAR.md
sppgRef:      /_docs/project-files/SPPG.md

# jaw-tools configuration for code scoping and context generation
includes:
  - features/[feature-name-slug]/**
  - _docs/project-files/references/** # General references
  # Add paths to relevant SPPG sections or other core docs if applicable
  # - _docs/project-files/SPPG.md#section-xyz
excludes:
  - '**/*.stories.tsx'
  - '**/*.test.tsx'
  - '**/*.spec.ts'
plannedFiles: # Patterns for where new files are expected to be created
  - features/[feature-name-slug]/ui/[NewComponent].tsx
  - features/[feature-name-slug]/api/[new-endpoint].ts
  - features/[feature-name-slug]/hooks/[useNewLogic].ts
---

# Mini-PRD [PRD-NUMBER] – [Feature Title]

**Status:** [proposed | accepted | in-progress | completed | deferred]
**Last Updated:** [YYYY-MM-DD]
**Author:** [Author Name]

## 1 · Description
[Provide a brief summary of the feature, its purpose, and the value it delivers. This should be a concise overview.]

## 2 · Problem Statement
[Clearly articulate the problem this feature is intended to solve. What pain points are being addressed for the user or the system?]

## 3 · User Story
> As a **[persona/user type]**, I want **[to perform an action or achieve a goal]**, so that **[I get this benefit/value]**.

*(Optional: Add more user stories if the feature covers multiple distinct scenarios)*

## 4 · Acceptance Criteria
*[List clear, testable criteria that must be met for the feature to be considered complete and correct. Each criterion should define a specific behavior or outcome.]*
- [ ] Criterion 1: e.g., User can see [X] when [Y] occurs.
- [ ] Criterion 2: e.g., System correctly processes [input Z] and produces [output W].
- [ ] Criterion 3: e.g., Performance of [action A] is within [N] seconds.
- [ ] Criterion 4: e.g., Error handling for [scenario B] is graceful and informative.

## 5 · Dependencies
*[Identify any internal or external dependencies required for this feature.]*
- **Services / Libraries:**
    - [ ] [Service/Library Name] - Version: [e.g., v1.2.3] (Reason: [Why is it needed?])
- **Teams / Resources:**
    - [ ] [Team Name / Person Name] - (Reason: [e.g., API endpoint required from backend team])
- **Other PRDs / Features:**
    - [ ] [PRD-XXX - Other Feature Name] (Reason: [e.g., This feature builds upon PRD-XXX])

## 6 · Success Metrics
*[Define quantifiable metrics to measure the success and impact of this feature post-launch.]*
- **Metric 1:** [e.g., API latency for [specific endpoint]] – Target: [< 200 ms P95]
- **Metric 2:** [e.g., Feature adoption rate] – Target: [≥ 80% of active users within 1 month]
- **Metric 3:** [e.g., Reduction in [problem X] by Y%] – Target: [Decrease support tickets related to Z by 15%]

## 7 · Code Scope *(guidance for manual input & auto-fill by jaw-tools)*

*(Note: The `includes`, `excludes`, and `plannedFiles` lists in the front-matter are primarily for `jaw-tools` automation and precise scoping. The "Existing Files" and "Planned Files" sections below in the body allow for human-readable annotations, descriptions of relevance, and purpose, and should generally align with the front-matter. `existingFiles` are files already in the project expected to be updated; `plannedFiles` are new files to be created.)*

### Existing Files
<!-- This section will be automatically updated by jaw-tools if corresponding files are found matching the 'includes' patterns in the front-matter. -->
<!-- Manually list key existing files and their relevance, especially helpful in early PRD stages before jaw-tools execution or for files not covered by patterns: -->
<!-- - `path/to/existing/file1.ts` - Brief description of its relevance or how it will be modified. -->
<!-- - `path/to/another/module/` - General area to be impacted. -->
<!-- jaw-tools updates will be injected below this line -->

### Planned Files
<!-- This section may be partially auto-filled by jaw-tools based on the 'plannedFiles' patterns in the front-matter. -->
<!-- Manually list specific planned files and their purpose here. This is crucial for early PRD shaping and development planning. -->
<!-- - [ ] `features/[feature-name-slug]/ui/NewComponent.tsx` - Purpose: [e.g., Main UI for the feature] -->
<!-- - [ ] `features/[feature-name-slug]/api/newRequestHandler.ts` - Purpose: [e.g., Handles API logic for X] -->
<!-- - [ ] `features/[feature-name-slug]/hooks/useFeatureLogic.ts` - Purpose: [e.g., Encapsulates business logic for Y] -->
<!-- jaw-tools updates will be injected below this line -->

## 8 · Repomix Snapshot
A Repomix code snapshot for this PRD, capturing the relevant code context, can be generated (or updated) using `jaw-tools`:
```bash
npx jaw-tools mini-prd snapshot [PRD-NUMBER]
```
**Latest snapshot:** `.repomix-profiles/outputs/prd-[PRD-NUMBER]-[name].xml`
(This Repomix snapshot is an XML representation of the relevant code context defined by the 'includes'/'excludes' patterns. It allows targeted code segments to be provided to LLMs for analysis, modification, or generation tasks, avoiding the need to process the entire codebase. This is particularly useful for focused prompts in tools like ChatGPT, Gemini, or within IDEs like Cursor. Detailed documentation for Repomix can be found in its dedicated service-docs.md.)

## 9 · Design / UX (Optional)
- Link to Figma mockups: [URL]
- Key UI/UX considerations: [Notes]

## 10 · Notes / Open Questions
- [Any additional notes, assumptions, or questions to be addressed.]

---

**Related Docs →** [Playbook](../playbook.md) · [Workflow](../workflow.md) · [SPPG](../templates/systemic-principles-template.md) · [North Star](../templates/north-star-template.md) · [Templates Index](../templates/)